-- ============================================================
-- Migración: ventas_pagos multimoneda
-- Agrega soporte para registrar abonos en Bs o USD con tasa
-- de cambio embebida para trazabilidad contable completa.
-- ============================================================

-- Agregar campos de multimoneda
ALTER TABLE public.ventas_pagos
    ADD COLUMN IF NOT EXISTS moneda      TEXT    DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS monto_bs    NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tasa_cambio NUMERIC DEFAULT 1,
    ADD COLUMN IF NOT EXISTS referencia  TEXT;

-- Constraint único en id_pos para idempotencia de abonos
-- Evita que el doble-click del cajero genere pagos duplicados
-- NOTA: ADD CONSTRAINT IF NOT EXISTS no existe en PostgreSQL — usar DO $$ con pg_constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ventas_pagos_id_pos_unique'
          AND conrelid = 'public.ventas_pagos'::regclass
    ) THEN
        ALTER TABLE public.ventas_pagos
            ADD CONSTRAINT ventas_pagos_id_pos_unique UNIQUE (id_pos);
        RAISE NOTICE 'Constraint ventas_pagos_id_pos_unique creado exitosamente.';
    ELSE
        RAISE NOTICE 'Constraint ventas_pagos_id_pos_unique ya existia. Sin cambios.';
    END IF;
END;
$$;

-- Actualizar registros existentes: los que no tienen moneda son USD
UPDATE public.ventas_pagos SET moneda = 'USD' WHERE moneda IS NULL;

-- Índice para consultas de historial por factura
CREATE INDEX IF NOT EXISTS idx_ventas_pagos_factura_fecha
    ON public.ventas_pagos(factura_id, fecha_pago DESC);

-- Comentarios
COMMENT ON COLUMN public.ventas_pagos.moneda       IS 'Moneda en que ingresó el cajero: USD o Bs';
COMMENT ON COLUMN public.ventas_pagos.monto_bs     IS 'Monto en bolívares (si moneda=Bs, es el monto_entrada; si USD, es monto*tasa_cambio)';
COMMENT ON COLUMN public.ventas_pagos.tasa_cambio  IS 'Tasa BCV usada al momento del abono';
COMMENT ON COLUMN public.ventas_pagos.referencia   IS 'Referencia bancaria o número de comprobante (opcional)';
