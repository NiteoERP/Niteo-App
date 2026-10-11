-- Migración para soportar notas_preparacion / comentarios por defecto en sync_inventario
CREATE OR REPLACE FUNCTION public.sync_inventario(p_master_key text, p_productos_json jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_sede_id uuid;
  v_empresa_id uuid;
  v_elem record;
  v_inserted_id uuid;
  v_codigo varchar;
  v_notas text[];
BEGIN
  SELECT id, empresa_id INTO v_sede_id, v_empresa_id FROM sedes WHERE master_key = p_master_key LIMIT 1;
  IF v_sede_id IS NULL THEN RAISE EXCEPTION 'Sede no autorizada'; END IF;

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
        END
    WHERE empresa_id = v_empresa_id AND nombre = v_elem.value->>'nombre'
    RETURNING id INTO v_inserted_id;

    -- Intento 2: Actualizar por id_pos (legado)
    IF v_inserted_id IS NULL THEN
      UPDATE productos 
      SET nombre = v_elem.value->>'nombre', 
          precio_venta = (v_elem.value->>'precio_venta')::numeric, 
          costo = (v_elem.value->>'costo')::numeric,
          notas_preparacion = CASE 
            WHEN v_elem.value ? 'notas_preparacion' AND cardinality(v_notas) > 0 THEN v_notas
            ELSE notas_preparacion 
          END
      WHERE empresa_id = v_empresa_id AND id_pos = (v_elem.value->>'id_pos')::varchar
      RETURNING id INTO v_inserted_id;
    END IF;

    -- Intento 3: Actualizar por código de barras
    IF v_inserted_id IS NULL AND v_codigo IS NOT NULL THEN
      UPDATE productos 
      SET nombre = v_elem.value->>'nombre', 
          precio_venta = (v_elem.value->>'precio_venta')::numeric, 
          costo = (v_elem.value->>'costo')::numeric,
          notas_preparacion = CASE 
            WHEN v_elem.value ? 'notas_preparacion' AND cardinality(v_notas) > 0 THEN v_notas
            ELSE notas_preparacion 
          END
      WHERE empresa_id = v_empresa_id AND codigo_barras = v_codigo
      RETURNING id INTO v_inserted_id;
    END IF;

    -- Inserción si no se encontró en ninguna parte
    IF v_inserted_id IS NULL THEN
      -- IMPORTANTE: Para evitar choques de id_pos entre sedes, le anexamos el ID de sede al id_pos
      INSERT INTO productos (empresa_id, categoria_id, id_pos, nombre, codigo_barras, precio_venta, costo, estado_activo, canal_venta, notas_preparacion)
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
        v_notas
      );
    END IF;
    v_inserted_id := NULL;
  END LOOP;
END;
$function$;
