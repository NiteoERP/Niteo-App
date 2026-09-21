-- ==============================================================================
-- MIGRACIÓN: VENTA AL COSTO (TRASPASO FAMILIAR / CONSUMO INTERNO)
-- Fecha: 2026-09-20
-- ==============================================================================

-- 1. Agregar 'VENTA_AL_COSTO' al ENUM motivo_merma (si existe dicho enum)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'motivo_merma') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname = 'motivo_merma' AND e.enumlabel = 'VENTA_AL_COSTO'
        ) THEN
            ALTER TYPE motivo_merma ADD VALUE 'VENTA_AL_COSTO';
        END IF;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN NULL;
END $$;

-- 2. Agregar columna 'permiso_venta_costo' a la tabla 'perfiles'
ALTER TABLE perfiles 
ADD COLUMN IF NOT EXISTS permiso_venta_costo BOOLEAN DEFAULT FALSE;

-- 3. Comentario informativo sobre la columna
COMMENT ON COLUMN perfiles.permiso_venta_costo IS 'Habilita al usuario para procesar salidas de inventario a precio de costo (consumo interno/familiar).';
