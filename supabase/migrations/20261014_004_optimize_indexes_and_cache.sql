-- ============================================================================
-- MIGRACIÓN DE OPTIMIZACIÓN DE ÍNDICES, RENDIMIENTO Y CACHÉ
-- Niteo Web / Supabase Postgres
-- ============================================================================

-- 1. ELIMINAR ÍNDICES DUPLICADOS REPORTADOS POR SUPABASE ADVISORS
-- Elimina bloat de disco y sobrecosto de escritura innecesario en INSERT/UPDATE.

-- Clientes: uk_clientes_id_pos es idéntico a clientes_empresa_id_pos_key (empresa_id, id_pos)
ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS uk_clientes_id_pos;

-- Ventas Detalles: idx_ventas_detalles_factura es idéntico a idx_detalles_factura (factura_id)
DROP INDEX IF EXISTS public.idx_ventas_detalles_factura;

-- Ventas Pagos: idx_ventas_pagos_factura es idéntico a idx_pagos_factura (factura_id)
DROP INDEX IF EXISTS public.idx_ventas_pagos_factura;

-- 2. CREAR ÍNDICES CRÍTICOS FALTANTES

-- A. RECETAS (Elimina ~1.35 Millones de Sequential Scans en deducciones de inventario y consultas)
CREATE INDEX IF NOT EXISTS idx_recetas_empresa_producto
  ON public.recetas (empresa_id, producto_id);

CREATE INDEX IF NOT EXISTS idx_recetas_insumo
  ON public.recetas (insumo_id);

-- B. VENTAS_DETALLES (107,000+ filas: acelera JOINs por producto en Reportes de Margen y Productos Vendidos)
CREATE INDEX IF NOT EXISTS idx_ventas_detalles_producto
  ON public.ventas_detalles (producto_id);

CREATE INDEX IF NOT EXISTS idx_ventas_detalles_empresa
  ON public.ventas_detalles (empresa_id);

-- C. VENTAS_FACTURAS (Acelera Dashboard y Reportes Consolidados de "Todas las Sedes" y Cuentas por Cobrar)
CREATE INDEX IF NOT EXISTS idx_ventas_facturas_empresa_fecha
  ON public.ventas_facturas (empresa_id, fecha_venta DESC)
  WHERE estado_activo = true;

CREATE INDEX IF NOT EXISTS idx_ventas_facturas_creditos_pendientes
  ON public.ventas_facturas (empresa_id, saldo_pendiente DESC)
  WHERE saldo_pendiente > 0 AND estado_activo = true;

-- D. COMPRAS_PUNTUALES (Acelera reportes de compras y gastos operativos por fecha y sucursal)
CREATE INDEX IF NOT EXISTS idx_compras_puntuales_empresa_fecha
  ON public.compras_puntuales (id_empresa, fecha_registro DESC);

CREATE INDEX IF NOT EXISTS idx_compras_puntuales_sede
  ON public.compras_puntuales (id_sede);

-- E. AUDITORIA_LOGS (100,000+ registros, 70MB: acelera historial de auditoría)
CREATE INDEX IF NOT EXISTS idx_auditoria_logs_empresa_creado
  ON public.auditoria_logs (empresa_id, creado_en DESC);

-- F. POS_CUENTAS_ABIERTAS (Acelera consulta de comandas y cuentas abiertas en caja)
CREATE INDEX IF NOT EXISTS idx_pos_cuentas_empresa_sede
  ON public.pos_cuentas_abiertas (empresa_id, sede_id);

-- 3. RECOLECCIÓN DE ESTADÍSTICAS PARA EL QUERY PLANNER
ANALYZE public.ventas_facturas;
ANALYZE public.ventas_detalles;
ANALYZE public.ventas_pagos;
ANALYZE public.recetas;
ANALYZE public.compras_puntuales;
ANALYZE public.clientes;
ANALYZE public.auditoria_logs;
ANALYZE public.pos_cuentas_abiertas;
