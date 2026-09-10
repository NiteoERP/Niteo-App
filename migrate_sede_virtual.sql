-- =============================================================================
-- MIGRACIÓN: SEDE VIRTUAL + MÓDULO DE VENTAS NATIVO
-- Fecha: 2026-09-10
-- Descripción:
--   1. Añade tipo_sede a tabla sedes (FISICA | VIRTUAL)
--   2. Hace id_pos nullable en productos
--   3. Añade canal_venta y id_insumo_vinculado a productos
--   4. Actualiza trigger descontar_insumos_por_venta con lógica bifurcada
-- =============================================================================


-- ===========================================================================
-- PASO 1: TABLA sedes — Agregar tipo_sede
-- ===========================================================================

ALTER TABLE public.sedes
  ADD COLUMN IF NOT EXISTS tipo_sede VARCHAR(10) DEFAULT 'FISICA'
  CHECK (tipo_sede IN ('FISICA', 'VIRTUAL'));

COMMENT ON COLUMN public.sedes.tipo_sede IS
  'FISICA = sede física con POS Aronium. VIRTUAL = sede nativa gestionada desde Niteo Web.';


-- ===========================================================================
-- PASO 2: TABLA productos — Ajustes para ventas nativas
-- ===========================================================================

-- 2a. Hacer id_pos nullable (antes podía ser NOT NULL por la sincronización Aronium)
ALTER TABLE public.productos
  ALTER COLUMN id_pos DROP NOT NULL;

-- 2b. Agregar canal_venta: controla en qué terminal aparece cada producto
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS canal_venta VARCHAR(15) DEFAULT 'AMBOS'
  CHECK (canal_venta IN ('AMBOS', 'SOLO_NITEO', 'SOLO_ARONIUM'));

COMMENT ON COLUMN public.productos.canal_venta IS
  'AMBOS = visible en Aronium y Terminal Virtual. SOLO_NITEO = solo Terminal Virtual. SOLO_ARONIUM = solo POS físico.';

-- 2c. Agregar id_insumo_vinculado: atajo de descuento directo sin receta
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS id_insumo_vinculado UUID
  REFERENCES public.inventario_insumos(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.productos.id_insumo_vinculado IS
  'Si está seteado, al vender este producto el trigger descuenta directamente de ese insumo (sin buscar receta).';

-- Índice para acelerar el lookup del trigger
CREATE INDEX IF NOT EXISTS idx_productos_insumo_vinculado
  ON public.productos(id_insumo_vinculado)
  WHERE id_insumo_vinculado IS NOT NULL;


-- ===========================================================================
-- PASO 3: TRIGGER descontar_insumos_por_venta — Lógica bifurcada
-- ===========================================================================
-- Antes: solo descuento vía recetas_items.
-- Ahora:
--   • Si el producto tiene id_insumo_vinculado → descuento directo en inventario_insumos
--   • Si es NULL → lógica recursiva original con recetas_items

CREATE OR REPLACE FUNCTION public.descontar_insumos_por_venta()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_insumo_vinculado UUID;
BEGIN
  -- Obtenemos el insumo vinculado directamente del producto (si existe)
  SELECT id_insumo_vinculado
    INTO v_insumo_vinculado
    FROM public.productos
   WHERE id = NEW.producto_id;

  IF v_insumo_vinculado IS NOT NULL THEN
    -- ── RAMA A: Descuento directo ──────────────────────────────────────────
    -- El producto apunta a un insumo explícito. Descontamos la cantidad
    -- vendida directamente (1 unidad vendida = 1 unidad del insumo).
    -- Permitimos stock negativo para no bloquear ventas (mismo criterio original).
    UPDATE public.inventario_insumos
       SET cantidad_actual = cantidad_actual - NEW.cantidad
     WHERE id = v_insumo_vinculado;

  ELSE
    -- ── RAMA B: Descuento por receta (lógica original) ────────────────────
    -- Buscamos en recetas_items todos los insumos del producto y descontamos
    -- según la cantidad_descuento definida en la receta.
    UPDATE public.inventario_insumos AS inv
       SET cantidad_actual = inv.cantidad_actual - (receta.cantidad_descuento * NEW.cantidad)
      FROM public.recetas_items AS receta
     WHERE receta.id_producto = NEW.producto_id
       AND inv.id = receta.id_insumo;

  END IF;

  -- El trigger siempre debe retornar NEW en un AFTER INSERT
  RETURN NEW;
END;
$function$;


-- ===========================================================================
-- VERIFICACIÓN — Ejecutar después de aplicar la migración
-- ===========================================================================

-- 1. Confirmar columna tipo_sede en sedes
-- SELECT column_name, column_default, is_nullable, character_maximum_length
--   FROM information_schema.columns
--  WHERE table_name = 'sedes' AND column_name = 'tipo_sede';

-- 2. Confirmar columnas nuevas en productos
-- SELECT column_name, column_default, is_nullable
--   FROM information_schema.columns
--  WHERE table_name = 'productos'
--    AND column_name IN ('canal_venta', 'id_insumo_vinculado', 'id_pos')
--  ORDER BY column_name;

-- 3. Confirmar cuerpo del trigger actualizado
-- SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'descontar_insumos_por_venta';
