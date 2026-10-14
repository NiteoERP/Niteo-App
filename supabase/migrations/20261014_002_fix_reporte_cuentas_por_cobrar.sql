-- Migración: Actualizar get_reporte_cuentas_por_cobrar
-- Soporte para rango de fechas, créditos pagados y pendientes, y filtro por cliente

CREATE OR REPLACE FUNCTION public.get_reporte_cuentas_por_cobrar(
  p_empresa_id   UUID,
  p_sede_id      UUID        DEFAULT NULL,
  p_fecha_inicio TIMESTAMPTZ DEFAULT NULL,
  p_fecha_fin    TIMESTAMPTZ DEFAULT NULL,
  p_cliente_id   UUID        DEFAULT NULL
)
RETURNS TABLE (
  fecha           TEXT,
  numero_documento TEXT,
  cliente         TEXT,
  rif_cedula      TEXT,
  total_factura   NUMERIC,
  monto_credito   NUMERIC,
  monto_pagado    NUMERIC,
  saldo_pendiente NUMERIC,
  estado          TEXT,
  sucursal        TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH facturas_credito AS (
    SELECT
      f.id,
      f.numero_documento,
      f.fecha_venta,
      f.total,
      f.saldo_pendiente,
      f.estado_pago,
      f.cliente_id,
      f.cliente_nombre,
      f.sede_id,
      COALESCE((
        SELECT SUM(vp.monto)
        FROM public.ventas_pagos vp
        WHERE vp.factura_id = f.id
          AND vp.tipo_pago ILIKE '%cred%'
      ), 0) AS suma_pagos_credito,
      COALESCE((
        SELECT SUM(vp.monto)
        FROM public.ventas_pagos vp
        WHERE vp.factura_id = f.id
          AND NOT (vp.id_pos LIKE 'GLB_%' OR vp.id_pos LIKE 'WEB_GLB_%')
          AND NOT (vp.tipo_pago ILIKE '%cred%')
      ), 0) AS suma_pagos_no_credito,
      EXISTS (
        SELECT 1
        FROM public.ventas_pagos vp
        WHERE vp.factura_id = f.id
          AND vp.tipo_pago ILIKE '%cred%'
      ) AS tiene_pago_credito,
      EXISTS (
        SELECT 1
        FROM public.ventas_pagos vp
        WHERE vp.factura_id = f.id
          AND (vp.id_pos LIKE 'GLB_%' OR vp.id_pos LIKE 'WEB_GLB_%')
      ) AS tiene_abono
    FROM public.ventas_facturas f
    WHERE f.empresa_id = p_empresa_id
      AND f.estado_activo = true
      AND (p_sede_id IS NULL OR f.sede_id = p_sede_id)
      AND (p_cliente_id IS NULL OR f.cliente_id = p_cliente_id)
      AND (p_fecha_inicio IS NULL OR f.fecha_venta >= p_fecha_inicio)
      AND (p_fecha_fin IS NULL OR f.fecha_venta <= p_fecha_fin)
  )
  SELECT
    to_char(fc.fecha_venta, 'DD/MM/YYYY HH24:MI') AS fecha,
    COALESCE(fc.numero_documento, '-')            AS numero_documento,
    COALESCE(c.nombre, fc.cliente_nombre, 'Cliente Eventual')::TEXT AS cliente,
    COALESCE(c.rif_cedula, '-')::TEXT             AS rif_cedula,
    ROUND(COALESCE(fc.total, 0)::NUMERIC, 2)      AS total_factura,
    ROUND(
      CASE
        WHEN fc.tiene_pago_credito THEN fc.suma_pagos_credito
        WHEN (fc.total - fc.suma_pagos_no_credito) > 0 THEN (fc.total - fc.suma_pagos_no_credito)
        ELSE COALESCE(fc.saldo_pendiente, 0)
      END::NUMERIC, 2
    ) AS monto_credito,
    ROUND(
      GREATEST(
        0,
        (CASE
          WHEN fc.tiene_pago_credito THEN fc.suma_pagos_credito
          WHEN (fc.total - fc.suma_pagos_no_credito) > 0 THEN (fc.total - fc.suma_pagos_no_credito)
          ELSE COALESCE(fc.saldo_pendiente, 0)
        END) - COALESCE(fc.saldo_pendiente, 0)
      )::NUMERIC, 2
    ) AS monto_pagado,
    ROUND(COALESCE(fc.saldo_pendiente, 0)::NUMERIC, 2) AS saldo_pendiente,
    CASE
      WHEN COALESCE(fc.saldo_pendiente, 0) <= 0.001 THEN 'PAGADO'
      WHEN ((CASE
              WHEN fc.tiene_pago_credito THEN fc.suma_pagos_credito
              WHEN (fc.total - fc.suma_pagos_no_credito) > 0 THEN (fc.total - fc.suma_pagos_no_credito)
              ELSE COALESCE(fc.saldo_pendiente, 0)
            END) - COALESCE(fc.saldo_pendiente, 0)) > 0.001 THEN 'PARCIAL'
      ELSE 'PENDIENTE'
    END::TEXT AS estado,
    COALESCE(s.nombre_sede, '-')::TEXT AS sucursal
  FROM facturas_credito fc
  LEFT JOIN public.clientes c ON fc.cliente_id = c.id
  LEFT JOIN public.sedes    s ON fc.sede_id    = s.id
  WHERE fc.tiene_pago_credito
     OR fc.saldo_pendiente > 0
     OR fc.estado_pago = 2
     OR fc.tiene_abono
  ORDER BY fc.fecha_venta DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_reporte_cuentas_por_cobrar(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_reporte_cuentas_por_cobrar(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO authenticated;
