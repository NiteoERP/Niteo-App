-- Migration: Automatic Global Sede unification for multi-branch catalog imports
-- When a product is imported for one branch, it is assigned to that branch.
-- When another branch imports the catalog and a product matches (synchronizes), it is set to GLOBAL.

CREATE OR REPLACE FUNCTION public.sync_inventario(p_master_key text, p_productos_json jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_sede_id uuid;
  v_empresa_id uuid;
  v_elem record;
  v_codigo varchar;
  v_notas text[];
  v_rowcount integer;
BEGIN
  -- 1. Obtener sede y empresa a partir del master_key
  SELECT id, empresa_id INTO v_sede_id, v_empresa_id FROM sedes WHERE master_key = p_master_key LIMIT 1;
  IF v_sede_id IS NULL THEN RAISE EXCEPTION 'Sede no autorizada'; END IF;

  -- 2. Procesar cada producto del lote
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_productos_json)
  LOOP
    v_codigo := v_elem.value->>'codigo_barras';
    IF v_codigo = '' THEN
      v_codigo := NULL;
    END IF;

    -- Extraer notas_preparacion si vienen en el JSON
    v_notas := '{}'::text[];
    IF v_elem.value ? 'notas_preparacion' AND jsonb_typeof(v_elem.value->'notas_preparacion') = 'array' THEN
      SELECT COALESCE(array_agg(x), '{}'::text[])
      INTO v_notas
      FROM jsonb_array_elements_text(v_elem.value->'notas_preparacion') AS x
      WHERE x IS NOT NULL AND trim(x) <> '';
      IF v_notas IS NULL THEN
        v_notas := '{}'::text[];
      END IF;
    END IF;

    -- Intento 1: Actualizar por nombre (unificación de sedes)
    UPDATE productos 
    SET precio_venta = (v_elem.value->>'precio_venta')::numeric, 
        costo = (v_elem.value->>'costo')::numeric,
        notas_preparacion = CASE 
          WHEN v_elem.value ? 'notas_preparacion' AND cardinality(v_notas) > 0 THEN v_notas
          ELSE notas_preparacion 
        END,
        -- Si pertenecía a otra sede distinta, ahora está en ambas: pasa a ser GLOBAL (NULL)
        sede_id = CASE
          WHEN sede_id IS NOT NULL AND sede_id <> v_sede_id THEN NULL
          WHEN sede_id IS NULL THEN NULL
          ELSE sede_id
        END,
        sedes_ids = CASE
          WHEN (sede_id IS NOT NULL AND sede_id <> v_sede_id)
            OR (sedes_ids IS NOT NULL AND cardinality(sedes_ids) > 0 AND NOT (v_sede_id = ANY(sedes_ids))) THEN NULL
          WHEN (sede_id IS NULL AND (sedes_ids IS NULL OR cardinality(sedes_ids) = 0)) THEN NULL
          ELSE sedes_ids
        END
    WHERE empresa_id = v_empresa_id AND nombre = v_elem.value->>'nombre';
    
    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    IF v_rowcount > 0 THEN
      CONTINUE;
    END IF;

    -- Intento 2: Actualizar por id_pos (legado / específico de sede)
    UPDATE productos 
    SET nombre = v_elem.value->>'nombre', 
        precio_venta = (v_elem.value->>'precio_venta')::numeric, 
        costo = (v_elem.value->>'costo')::numeric,
        notas_preparacion = CASE 
          WHEN v_elem.value ? 'notas_preparacion' AND cardinality(v_notas) > 0 THEN v_notas
          ELSE notas_preparacion 
        END,
        sede_id = CASE
          WHEN sede_id IS NOT NULL AND sede_id <> v_sede_id THEN NULL
          WHEN sede_id IS NULL THEN NULL
          ELSE sede_id
        END,
        sedes_ids = CASE
          WHEN (sede_id IS NOT NULL AND sede_id <> v_sede_id)
            OR (sedes_ids IS NOT NULL AND cardinality(sedes_ids) > 0 AND NOT (v_sede_id = ANY(sedes_ids))) THEN NULL
          WHEN (sede_id IS NULL AND (sedes_ids IS NULL OR cardinality(sedes_ids) = 0)) THEN NULL
          ELSE sedes_ids
        END
    WHERE empresa_id = v_empresa_id 
      AND (id_pos = (v_elem.value->>'id_pos')::varchar OR id_pos = (v_sede_id::varchar || '_' || (v_elem.value->>'id_pos')::varchar));

    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    IF v_rowcount > 0 THEN
      CONTINUE;
    END IF;

    -- Intento 3: Actualizar por código de barras
    IF v_codigo IS NOT NULL THEN
      UPDATE productos 
      SET nombre = v_elem.value->>'nombre', 
          precio_venta = (v_elem.value->>'precio_venta')::numeric, 
          costo = (v_elem.value->>'costo')::numeric,
          notas_preparacion = CASE 
            WHEN v_elem.value ? 'notas_preparacion' AND cardinality(v_notas) > 0 THEN v_notas
            ELSE notas_preparacion 
          END,
          sede_id = CASE
            WHEN sede_id IS NOT NULL AND sede_id <> v_sede_id THEN NULL
            WHEN sede_id IS NULL THEN NULL
            ELSE sede_id
          END,
          sedes_ids = CASE
            WHEN (sede_id IS NOT NULL AND sede_id <> v_sede_id)
              OR (sedes_ids IS NOT NULL AND cardinality(sedes_ids) > 0 AND NOT (v_sede_id = ANY(sedes_ids))) THEN NULL
            WHEN (sede_id IS NULL AND (sedes_ids IS NULL OR cardinality(sedes_ids) = 0)) THEN NULL
            ELSE sedes_ids
          END
      WHERE empresa_id = v_empresa_id AND codigo_barras = v_codigo;

      GET DIAGNOSTICS v_rowcount = ROW_COUNT;
      IF v_rowcount > 0 THEN
        CONTINUE;
      END IF;
    END IF;

    -- Inserción si no se encontró en ninguna parte (producto nuevo asignado a la sede importadora)
    INSERT INTO productos (
      empresa_id, 
      categoria_id, 
      id_pos, 
      nombre, 
      codigo_barras, 
      precio_venta, 
      costo, 
      estado_activo, 
      canal_venta, 
      notas_preparacion,
      sede_id,
      sedes_ids
    )
    VALUES (
      v_empresa_id, 
      (SELECT id FROM categorias WHERE empresa_id = v_empresa_id AND id_pos = (v_elem.value->>'id_categoria_pos')::varchar LIMIT 1), 
      v_sede_id::varchar || '_' || (v_elem.value->>'id_pos')::varchar, 
      v_elem.value->>'nombre', 
      v_codigo, 
      (v_elem.value->>'precio_venta')::numeric, 
      (v_elem.value->>'costo')::numeric, 
      true,
      'AMBOS',
      v_notas,
      v_sede_id,
      ARRAY[v_sede_id]
    );
  END LOOP;
END;
$function$;
