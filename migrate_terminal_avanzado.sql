-- =============================================================================
-- MIGRACIÓN: TERMINAL POS AVANZADO
-- =============================================================================

-- 1. Añadir precio_modificable a productos
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS precio_modificable BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.productos.precio_modificable IS 'Indica si se puede cambiar el precio en el Terminal POS Virtual';

-- 2. Añadir nombre de cliente eventual a ventas_facturas
ALTER TABLE public.ventas_facturas
  ADD COLUMN IF NOT EXISTS cliente_nombre VARCHAR(255);

COMMENT ON COLUMN public.ventas_facturas.cliente_nombre IS 'Nombre del cliente cuando no hay cliente_id asociado (cliente eventual)';

-- 3. Añadir nombre de mesero a ventas_facturas
ALTER TABLE public.ventas_facturas
  ADD COLUMN IF NOT EXISTS mesero_nombre VARCHAR(255);

COMMENT ON COLUMN public.ventas_facturas.mesero_nombre IS 'Nombre del vendedor o mesero que atendió la orden';
