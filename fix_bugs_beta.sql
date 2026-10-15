-- =============================================================================
-- FIX BUGS BETA TESTING - ERP Niteo
-- Fecha: 2026-08-27
-- Descripción: Correcciones críticas post beta-testing
--   1. Políticas RLS para inventario_insumos
--   2. DROP funciones duplicadas (timestamp vs timestamptz) en reportes
--   3. CREATE OR REPLACE registrar_compra_insumo (atómica + UPDATE inventario)
--   4. CREATE OR REPLACE get_clientes_con_deuda (fix nombre_sede + quitar email)
--   5. CREATE OR REPLACE get_reporte_cuentas_por_cobrar (fix nombre_sede)
-- =============================================================================


-- ===========================================================================
-- FIX 1: POLÍTICAS RLS PARA inventario_insumos
-- ===========================================================================

-- Habilitar RLS en la tabla (idempotente)
ALTER TABLE public.inventario_insumos ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas anteriores si existen (para recrearlas limpias)
DROP POLICY IF EXISTS "inventario_insumos_select" ON public.inventario_insumos;
DROP POLICY IF EXISTS "inventario_insumos_insert" ON public.inventario_insumos;
DROP POLICY IF EXISTS "inventario_insumos_update" ON public.inventario_insumos;
DROP POLICY IF EXISTS "inventario_insumos_delete" ON public.inventario_insumos;

-- SELECT: el usuario solo ve insumos de su propia empresa
CREATE POLICY "inventario_insumos_select" ON public.inventario_insumos
  FOR SELECT TO authenticated
  USING (
    empresa_id = (
      SELECT empresa_id FROM public.perfiles
      WHERE id = (SELECT auth.uid())
    )
  );

-- INSERT: el usuario puede insertar insumos en su empresa
-- (el WITH CHECK valida que no pueda suplantar otra empresa_id)
CREATE POLICY "inventario_insumos_insert" ON public.inventario_insumos
  FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = (
      SELECT empresa_id FROM public.perfiles
      WHERE id = (SELECT auth.uid())
    )
  );

-- UPDATE: el usuario puede actualizar insumos de su empresa
CREATE POLICY "inventario_insumos_update" ON public.inventario_insumos
  FOR UPDATE TO authenticated
  USING (
    empresa_id = (
      SELECT empresa_id FROM public.perfiles
      WHERE id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    empresa_id = (
      SELECT empresa_id FROM public.perfiles
      WHERE id = (SELECT auth.uid())
    )
  );

-- DELETE: solo operadores de la empresa pueden eliminar
CREATE POLICY "inventario_insumos_delete" ON public.inventario_insumos
  FOR DELETE TO authenticated
  USING (
    empresa_id = (
      SELECT empresa_id FROM public.perfiles
      WHERE id = (SELECT auth.uid())
    )
  );


-- ===========================================================================
-- FIX 2: DROP FUNCIONES DUPLICADAS (versiones timestamp WITHOUT time zone)
-- La sobrecarga genera el error "Could not choose the best candidate function"
-- ===========================================================================

-- Eliminar versiones con TIMESTAMP (sin zona horaria) — dejamos solo TIMESTAMPTZ
DROP FUNCTION IF EXISTS public.get_reporte_ventas_productos(
  uuid,
  uuid,
  timestamp without time zone,
  timestamp without time zone
);

DROP FUNCTION IF EXISTS public.get_reporte_metodos_pago(
  uuid,
  uuid,
  timestamp without time zone,
  timestamp without time zone
);

-- Por precaución, también limpiamos otras funciones de reporte que puedan tener el mismo problema
DROP FUNCTION IF EXISTS public.get_reporte_ventas_diarias(
  uuid,
  uuid,
  timestamp without time zone,
  timestamp without time zone
);

DROP FUNCTION IF EXISTS public.get_reporte_ventas_clientes(
  uuid,
  uuid,
  timestamp without time zone,
  timestamp without time zone
);

DROP FUNCTION IF EXISTS public.get_reporte_ventas_usuarios(
  uuid,
  uuid,
  timestamp without time zone,
  timestamp without time zone
);

DROP FUNCTION IF EXISTS public.get_reporte_cierres_caja(
  uuid,
  uuid,
  timestamp without time zone,
  timestamp without time zone
);


-- ===========================================================================
-- FIX 3: CORRECCIÓN DE COLUMNAS INEXISTENTES EN RPCs
-- Error A: s.nombre_comercial → s.nombre_sede (tabla sedes)
-- Error B: perfiles_1.email → columna inexistente en perfiles, se elimina
-- ===========================================================================

-- Función: get_clientes_con_deuda
-- Retorna clientes con saldo pendiente para el módulo de Créditos
-- Columnas retornadas inferidas del uso en creditos-actions.ts (.ilike('nombre_cliente',...))
CREATE OR REPLACE FUNCTION public.get_clientes_con_deuda(
  p_empresa_id  UUID,
  p_sede_id     UUID        DEFAULT NULL,
  p_fecha_inicio TIMESTAMPTZ DEFAULT NULL,
  p_fecha_fin    TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  cliente_id      UUID,
  nombre_cliente  TEXT,
  rif_cedula      TEXT,
  telefono        TEXT,
  total_deuda     NUMERIC,
  total_facturas  BIGINT,
  nombre_sede     TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id                                                      AS cliente_id,
    c.nombre::TEXT                                            AS nombre_cliente,
    c.rif_cedula::TEXT                                        AS rif_cedula,
    c.telefono::TEXT                                          AS telefono,
    COALESCE(SUM(f.saldo_pendiente), 0)                       AS total_deuda,
    COUNT(f.id)                                               AS total_facturas,
    s.nombre_sede::TEXT                                       AS nombre_sede   -- FIX: era s.nombre_comercial
  FROM ventas_facturas f
  JOIN clientes c ON f.cliente_id = c.id
  JOIN sedes    s ON f.sede_id    = s.id
  WHERE f.empresa_id    = p_empresa_id
    AND f.estado_pago   = 2          -- 2 = crédito / pendiente
    AND f.saldo_pendiente > 0
    AND (p_sede_id       IS NULL OR f.sede_id    = p_sede_id)
    AND (p_fecha_inicio  IS NULL OR f.fecha_venta >= p_fecha_inicio)
    AND (p_fecha_fin     IS NULL OR f.fecha_venta <= p_fecha_fin)
  GROUP BY c.id, c.nombre, c.rif_cedula, c.telefono, s.nombre_sede
  ORDER BY total_deuda DESC;
END;
$$;

-- Revocar acceso directo de anon (la función es SECURITY DEFINER, solo debe llamarse autenticado)
REVOKE ALL ON FUNCTION public.get_clientes_con_deuda(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_clientes_con_deuda(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;


-- Función: get_reporte_cuentas_por_cobrar
-- Reporte de cuentas a crédito para el módulo de Informes (pagados y pendientes con rango de fecha)
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


-- Función: get_reporte_cuentas_abiertas
-- Cuentas abiertas en POS (pos_cuentas_abiertas)
-- FIX: eliminar referencia a perfiles_1.email
CREATE OR REPLACE FUNCTION public.get_reporte_cuentas_abiertas(
  p_empresa_id UUID,
  p_sede_id    UUID DEFAULT NULL
)
RETURNS TABLE (
  id              UUID,
  numero_documento TEXT,
  nombre_cuenta   TEXT,
  total           NUMERIC,
  fecha_apertura  TIMESTAMPTZ,
  nombre_sede     TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ca.id,
    ca.numero_documento::TEXT,
    ca.nombre_cuenta::TEXT,
    ca.total,
    ca.fecha_apertura,
    s.nombre_sede::TEXT AS nombre_sede  -- FIX: era s.nombre_comercial
  FROM pos_cuentas_abiertas ca
  JOIN sedes s ON ca.sede_id = s.id
  WHERE ca.empresa_id = p_empresa_id
    AND (p_sede_id IS NULL OR ca.sede_id = p_sede_id)
  ORDER BY ca.fecha_apertura DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_reporte_cuentas_abiertas(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_reporte_cuentas_abiertas(UUID, UUID) TO authenticated;


-- ===========================================================================
-- FIX 4: registrar_compra_insumo — TRANSACCIÓN ATÓMICA COMPLETA
-- El bug: la versión anterior solo insertaba en movimientos_inventario
-- pero NO hacía UPDATE en inventario_insumos.cantidad_actual
-- Esta versión hace ambas operaciones en una sola transacción.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.registrar_compra_insumo(
  p_insumo_id   UUID,
  p_usuario_id  UUID,
  p_cantidad    NUMERIC,
  p_costo_total NUMERIC  -- costo total en USD de esta compra
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id     UUID;
  v_cant_actual    NUMERIC;
  v_costo_prom     NUMERIC;
  v_costo_unitario NUMERIC;
  v_nueva_cantidad NUMERIC;
  v_nuevo_costo    NUMERIC;
BEGIN
  -- Validaciones básicas
  IF p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a 0.';
  END IF;
  IF p_costo_total < 0 THEN
    RAISE EXCEPTION 'El costo total no puede ser negativo.';
  END IF;

  -- Obtener datos actuales del insumo (lock para evitar race conditions)
  SELECT empresa_id, cantidad_actual, costo_promedio
    INTO v_empresa_id, v_cant_actual, v_costo_prom
    FROM public.inventario_insumos
   WHERE id = p_insumo_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insumo con id % no encontrado.', p_insumo_id;
  END IF;

  -- Calcular costo unitario y nuevos valores con costo promedio ponderado
  v_costo_unitario := CASE WHEN p_cantidad > 0 THEN p_costo_total / p_cantidad ELSE 0 END;
  v_nueva_cantidad := COALESCE(v_cant_actual, 0) + p_cantidad;

  v_nuevo_costo := CASE
    WHEN v_nueva_cantidad > 0 THEN
      ((COALESCE(v_cant_actual, 0) * COALESCE(v_costo_prom, 0)) + (p_cantidad * v_costo_unitario))
      / v_nueva_cantidad
    ELSE v_costo_unitario
  END;

  -- PASO 1: Registrar movimiento de ENTRADA en historial
  INSERT INTO public.movimientos_inventario (
    empresa_id,
    insumo_id,
    usuario_id,
    tipo_movimiento,
    motivo,
    cantidad,
    costo_perdido
  ) VALUES (
    v_empresa_id,
    p_insumo_id,
    p_usuario_id,
    'ENTRADA',
    'COMPRA',       -- valor del enum motivo
    p_cantidad,
    0               -- no hay costo perdido en una compra
  );

  -- PASO 2: Actualizar inventario (FIX CRÍTICO — esto faltaba)
  UPDATE public.inventario_insumos
     SET cantidad_actual = v_nueva_cantidad,
         costo_promedio  = ROUND(v_nuevo_costo::NUMERIC, 4)
   WHERE id = p_insumo_id;

END;
$$;

-- Seguridad: solo usuarios autenticados pueden ejecutar esta función
REVOKE ALL ON FUNCTION public.registrar_compra_insumo(UUID, UUID, NUMERIC, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_compra_insumo(UUID, UUID, NUMERIC, NUMERIC) TO authenticated;


-- ===========================================================================
-- VERIFICACIÓN FINAL
-- Ejecutar estas queries para confirmar que los fixes están aplicados
-- ===========================================================================

-- 1. Verificar políticas RLS activas en inventario_insumos
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'inventario_insumos';

-- 2. Verificar que solo queda 1 versión (TIMESTAMPTZ) de cada función de reporte
-- SELECT proname, pg_get_function_arguments(oid) AS args
--   FROM pg_proc
--  WHERE proname IN ('get_reporte_ventas_productos', 'get_reporte_metodos_pago')
--    AND pronamespace = 'public'::regnamespace;

-- 3. Verificar función registrar_compra_insumo
-- SELECT proname, prosecdef, pg_get_function_arguments(oid)
--   FROM pg_proc WHERE proname = 'registrar_compra_insumo';
