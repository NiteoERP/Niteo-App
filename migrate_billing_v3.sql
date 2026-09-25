-- =============================================================================
-- MIGRACIÓN 3: MÓDULOS (PLUGINS) EN SUSCRIPCIONES
-- Fecha: 2026-09-25
-- Descripción:
--   Añade la columna modulos_activos a suscripciones_empresas para
--   guardar los plugins contratados (ej. recetas, virtual-pos).
-- =============================================================================

ALTER TABLE public.suscripciones_empresas
  ADD COLUMN IF NOT EXISTS modulos_activos text[] DEFAULT '{}'::text[];

COMMENT ON COLUMN public.suscripciones_empresas.modulos_activos IS 'Arreglo de IDs de plugins activos contratados (ej: recetas, virtual-pos, multi-price)';
