-- Migration: Add grupo_similar column to productos
-- Permite agrupar productos similares, sustitutos o con mismo principio activo / componentes.

ALTER TABLE public.productos 
ADD COLUMN IF NOT EXISTS grupo_similar TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_productos_empresa_grupo_similar ON public.productos(empresa_id, grupo_similar);
