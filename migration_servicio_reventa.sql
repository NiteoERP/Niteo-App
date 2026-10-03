ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS es_servicio BOOLEAN DEFAULT false;
ALTER TABLE public.inventario_insumos ADD COLUMN IF NOT EXISTS es_reventa BOOLEAN DEFAULT false;
