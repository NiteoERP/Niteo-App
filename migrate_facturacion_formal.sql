-- =============================================================================
-- MIGRACIÓN: MÓDULO DE FACTURACIÓN FORMAL Y PRESUPUESTOS
-- =============================================================================

-- Añadir campos para documentos elaborados a ventas_facturas
ALTER TABLE public.ventas_facturas
  ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE,
  ADD COLUMN IF NOT EXISTS notas TEXT,
  ADD COLUMN IF NOT EXISTS terminos_condiciones TEXT;

COMMENT ON COLUMN public.ventas_facturas.fecha_vencimiento IS 'Fecha de caducidad para presupuestos o cotizaciones';
COMMENT ON COLUMN public.ventas_facturas.notas IS 'Notas internas o adicionales del documento';
COMMENT ON COLUMN public.ventas_facturas.terminos_condiciones IS 'Términos y condiciones mostradas en el PDF del documento';
