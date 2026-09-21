-- ============================================================
-- MIGRACIÓN: Catálogo Público con WhatsApp
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Agregar columnas al catálogo público en la tabla empresas
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS slug_catalogo       TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_catalogo   TEXT,
  ADD COLUMN IF NOT EXISTS catalogo_activo     BOOLEAN DEFAULT FALSE;

-- 2. Generar slugs automáticos para empresas que ya existen
UPDATE public.empresas
SET slug_catalogo = regexp_replace(
  lower(
    translate(
      trim(nombre_comercial),
      'áéíóúàèìòùäëïöüâêîôûñç ÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÑÇ',
      'aeiouaeiouaeiouaeiounç aeiouaeiouaeiouaeiounç'
    )
  ),
  '[^a-z0-9]+', '-', 'g'
)
WHERE slug_catalogo IS NULL;

-- Asegurar unicidad si hay nombres duplicados: agregar sufijo numérico
DO $$
DECLARE
  rec RECORD;
  base_slug TEXT;
  new_slug TEXT;
  counter INT;
BEGIN
  FOR rec IN SELECT id, slug_catalogo FROM public.empresas ORDER BY fecha_registro LOOP
    base_slug := rec.slug_catalogo;
    new_slug  := base_slug;
    counter   := 1;
    -- mientras exista un conflicto con otra empresa
    WHILE EXISTS (
      SELECT 1 FROM public.empresas 
      WHERE slug_catalogo = new_slug AND id <> rec.id
    ) LOOP
      new_slug := base_slug || '-' || counter;
      counter  := counter + 1;
    END LOOP;
    IF new_slug <> rec.slug_catalogo THEN
      UPDATE public.empresas SET slug_catalogo = new_slug WHERE id = rec.id;
    END IF;
  END LOOP;
END;
$$;

-- 2.5 Agregar la restricción UNIQUE ahora que los slugs son únicos
ALTER TABLE public.empresas ADD CONSTRAINT empresas_slug_catalogo_key UNIQUE (slug_catalogo);

-- 3. RLS: Permitir lectura pública de productos cuando el catálogo está activo
-- Primero verificar si RLS está habilitado en productos
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

-- Política: Lectura pública si la empresa tiene catalogo_activo = true
DROP POLICY IF EXISTS "catalogo_publico_productos" ON public.productos;
CREATE POLICY "catalogo_publico_productos"
  ON public.productos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.empresas e
      WHERE e.id = productos.empresa_id
        AND e.catalogo_activo = TRUE
    )
  );

-- 4. RLS: Permitir lectura pública de categorías cuando catálogo está activo
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "catalogo_publico_categorias" ON public.categorias;
CREATE POLICY "catalogo_publico_categorias"
  ON public.categorias
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.empresas e
      WHERE e.id = categorias.empresa_id
        AND e.catalogo_activo = TRUE
    )
  );

-- 5. RLS: Lectura pública de empresas (solo slug y datos del catálogo)
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "catalogo_publico_empresa" ON public.empresas;
CREATE POLICY "catalogo_publico_empresa"
  ON public.empresas
  FOR SELECT
  USING (catalogo_activo = TRUE OR auth.uid() IS NOT NULL);

-- 6. RLS: Lectura pública de inventario_insumos para verificar stock
ALTER TABLE public.inventario_insumos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "catalogo_publico_insumos" ON public.inventario_insumos;
CREATE POLICY "catalogo_publico_insumos"
  ON public.inventario_insumos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.empresas e
      WHERE e.id = inventario_insumos.empresa_id
        AND e.catalogo_activo = TRUE
    )
  );

-- 7. RLS: Lectura pública de recetas para vincular producto → insumo → stock
ALTER TABLE public.recetas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "catalogo_publico_recetas" ON public.recetas;
CREATE POLICY "catalogo_publico_recetas"
  ON public.recetas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.empresas e
      WHERE e.id = recetas.empresa_id
        AND e.catalogo_activo = TRUE
    )
  );

-- ============================================================
-- VERIFICACIÓN: Ver resultados de la migración
-- ============================================================
SELECT id, nombre_comercial, slug_catalogo, catalogo_activo, whatsapp_catalogo
FROM public.empresas
ORDER BY fecha_registro;
