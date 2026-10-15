-- ============================================================
-- Fix: get_reporte_ventas_diarias y get_reporte_ventas_usuarios
-- 1. Elimina la sobrecarga ambigua (timestamp without time zone) que causaba PGRST203
-- 2. Corrige timezone en el agrupamiento de ventas diarias a America/Caracas
-- 3. Corrige columna inexistente f.estado -> f.estado_activo = true en ventas_usuarios
-- ============================================================

-- 1. Eliminar la versión ambigua
DROP FUNCTION IF EXISTS public.get_reporte_ventas_diarias(uuid, uuid, timestamp without time zone, timestamp without time zone);
DROP FUNCTION IF EXISTS public.get_reporte_ventas_usuarios(uuid, uuid, timestamp without time zone, timestamp without time zone);

-- 2. Re-crear get_reporte_ventas_diarias con soporte correcto de timezone
CREATE OR REPLACE FUNCTION public.get_reporte_ventas_diarias(
    p_empresa_id   UUID,
    p_sede_id      UUID,
    p_fecha_inicio TIMESTAMPTZ,
    p_fecha_fin    TIMESTAMPTZ
)
RETURNS TABLE (
    fecha             TEXT,
    cantidad_facturas BIGINT,
    total_ventas      NUMERIC,
    total_descuentos  NUMERIC,
    ticket_promedio   NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR((vf.fecha_venta AT TIME ZONE 'America/Caracas')::date, 'DD/MM/YYYY') AS "fecha",
        COUNT(vf.id) AS "cantidad_facturas",
        COALESCE(SUM(vf.total), 0) AS "total_ventas",
        COALESCE(SUM(vf.descuento), 0) AS "total_descuentos",
        COALESCE(SUM(vf.total) / NULLIF(COUNT(vf.id), 0), 0) AS "ticket_promedio"
    FROM public.ventas_facturas vf
    WHERE vf.empresa_id = p_empresa_id
      AND (p_sede_id IS NULL OR vf.sede_id = p_sede_id)
      AND vf.fecha_venta >= p_fecha_inicio
      AND vf.fecha_venta <= p_fecha_fin
      AND vf.estado_activo = true
      AND NOT EXISTS (
        SELECT 1 FROM public.ventas_pagos vp
        WHERE vp.factura_id = vf.id 
          AND (vp.tipo_pago ILIKE '%cortes%' OR vp.tipo_pago ILIKE '%regal%')
      )
      AND (vf.tipo_documento IS NULL OR (vf.tipo_documento NOT ILIKE '%cortes%' AND vf.tipo_documento NOT ILIKE '%regal%'))
      AND (vf.numero_orden IS NULL OR (vf.numero_orden NOT ILIKE '%cortes%' AND vf.numero_orden NOT ILIKE '%regal%'))
    GROUP BY (vf.fecha_venta AT TIME ZONE 'America/Caracas')::date
    ORDER BY (vf.fecha_venta AT TIME ZONE 'America/Caracas')::date ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_reporte_ventas_diarias(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;

-- 3. Re-crear get_reporte_ventas_usuarios usando estado_activo = true
CREATE OR REPLACE FUNCTION public.get_reporte_ventas_usuarios(
    p_empresa_id   UUID,
    p_sede_id      UUID DEFAULT NULL::uuid,
    p_fecha_inicio TIMESTAMPTZ DEFAULT NULL::timestamptz,
    p_fecha_fin    TIMESTAMPTZ DEFAULT NULL::timestamptz
)
RETURNS TABLE (
    nombre_empleado  TEXT,
    facturas_cajero  BIGINT,
    ventas_cajero    NUMERIC,
    facturas_vendedor BIGINT,
    ventas_vendedor  NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    empleado AS nombre_empleado,
    SUM(fc)::bigint AS facturas_cajero,
    SUM(vc)::numeric AS ventas_cajero,
    SUM(fv)::bigint AS facturas_vendedor,
    SUM(vv)::numeric AS ventas_vendedor
  FROM (
    -- Desempeño como Cajero
    SELECT 
      COALESCE(NULLIF(f.cajero_nombre, ''), 'Desconocido') AS empleado,
      COUNT(f.id) AS fc,
      SUM(f.total) AS vc,
      0::bigint AS fv,
      0::numeric AS vv
    FROM public.ventas_facturas f
    WHERE f.empresa_id = p_empresa_id
      AND (p_sede_id IS NULL OR f.sede_id = p_sede_id)
      AND (p_fecha_inicio IS NULL OR f.fecha_venta >= p_fecha_inicio)
      AND (p_fecha_fin IS NULL OR f.fecha_venta <= p_fecha_fin)
      AND f.estado_activo = true
    GROUP BY COALESCE(NULLIF(f.cajero_nombre, ''), 'Desconocido')
    
    UNION ALL
    
    -- Desempeño como Mesero / Vendedor
    SELECT 
      f.mesero_nombre AS empleado,
      0::bigint AS fc,
      0::numeric AS vc,
      COUNT(f.id) AS fv,
      SUM(f.total) AS vv
    FROM public.ventas_facturas f
    WHERE f.empresa_id = p_empresa_id
      AND (p_sede_id IS NULL OR f.sede_id = p_sede_id)
      AND (p_fecha_inicio IS NULL OR f.fecha_venta >= p_fecha_inicio)
      AND (p_fecha_fin IS NULL OR f.fecha_venta <= p_fecha_fin)
      AND f.estado_activo = true
      AND NULLIF(f.mesero_nombre, '') IS NOT NULL
    GROUP BY f.mesero_nombre
  ) sub
  GROUP BY empleado
  ORDER BY (SUM(vc) + SUM(vv)) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_reporte_ventas_usuarios(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;
