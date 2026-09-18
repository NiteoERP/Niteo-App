-- ============================================================
-- Migración: ventas_facturas id_pos UNIQUE constraint
-- PREREQUISITO para que ON CONFLICT (id_pos) en upsert_venta_pos
-- funcione correctamente. Sin este constraint, el ON CONFLICT
-- falla con error en tiempo de ejecución.
-- ============================================================

-- Primero: detectar duplicados (seguro de ejecutar en cualquier estado)
DO $$
DECLARE
    dup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO dup_count
    FROM (
        SELECT id_pos
        FROM public.ventas_facturas
        WHERE id_pos IS NOT NULL
        GROUP BY id_pos
        HAVING COUNT(*) > 1
    ) AS dups;

    IF dup_count > 0 THEN
        RAISE NOTICE 'ATENCION: % id_pos duplicados en ventas_facturas. Revisar antes de continuar.', dup_count;
    ELSE
        RAISE NOTICE 'OK: Sin duplicados en ventas_facturas.id_pos. Seguro aplicar UNIQUE constraint.';
    END IF;
END;
$$;

-- Agregar UNIQUE constraint solo si no existe ya
-- NOTA: ADD CONSTRAINT IF NOT EXISTS no existe en PostgreSQL — usar DO $$ con pg_constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ventas_facturas_id_pos_unique'
          AND conrelid = 'public.ventas_facturas'::regclass
    ) THEN
        ALTER TABLE public.ventas_facturas
            ADD CONSTRAINT ventas_facturas_id_pos_unique UNIQUE (id_pos);
        RAISE NOTICE 'Constraint ventas_facturas_id_pos_unique creado exitosamente.';
    ELSE
        RAISE NOTICE 'Constraint ventas_facturas_id_pos_unique ya existia. Sin cambios.';
    END IF;
END;
$$;

-- Índice de apoyo para búsquedas por id_pos en la RPC
CREATE INDEX IF NOT EXISTS idx_ventas_facturas_id_pos
    ON public.ventas_facturas(id_pos)
    WHERE id_pos IS NOT NULL;

-- Índice para búsqueda de productos por id_pos en upsert de detalles
CREATE INDEX IF NOT EXISTS idx_productos_id_pos_empresa
    ON public.productos(id_pos, empresa_id)
    WHERE id_pos IS NOT NULL;

COMMENT ON CONSTRAINT ventas_facturas_id_pos_unique ON public.ventas_facturas
    IS 'Garantiza idempotencia en upsert_venta_pos: el mismo id_pos del POS siempre apunta a la misma factura en la nube.';
