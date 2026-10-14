-- Migration: Add archivado column to productos
-- Differentiates between temporarily paused products (estado_activo = false)
-- and permanently eliminated/archived products (archivado = true).

ALTER TABLE public.productos 
ADD COLUMN IF NOT EXISTS archivado BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_productos_empresa_archivado ON public.productos(empresa_id, archivado);
