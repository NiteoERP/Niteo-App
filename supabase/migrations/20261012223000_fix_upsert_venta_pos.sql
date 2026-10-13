-- ============================================================
-- Fix definitivo para upsert_venta_pos:
-- 1. Reemplaza uuid_generate_v4() (que fallaba con search_path=public) por gen_random_uuid().
-- 2. Evita error FK 23503 en ventas_facturas_cliente_id_fkey verificando/creando el cliente
--    en public.clientes antes de enlazarlo.
-- 3. Resuelve producto_id tanto desde producto_id_pos como desde producto_id.
-- 4. Soporta autenticación por JWT (auth.uid()) y fallback seguro por sede_id cuando hay
--    múltiples cajas POS en la misma sede que rotaron el token de sesión.
-- 5. Conserva el guardado de propina y actualiza ultima_sincronizacion en la sede.
-- ============================================================

CREATE OR REPLACE FUNCTION public.upsert_venta_pos(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_perfil       public.perfiles%ROWTYPE;
    v_empresa_id   UUID;
    v_sede_id      UUID;
    v_factura_id   UUID;
    v_id_pos       TEXT;
    v_saldo        NUMERIC;
    v_fecha        TIMESTAMPTZ;
    v_cliente_id   UUID;
    v_cli_id_raw   TEXT;
    v_cli_nombre   TEXT;
    v_cli_cedula   TEXT;
    v_cli_telefono TEXT;
    v_solo_num     TEXT;
BEGIN
    -- 1. Intentar resolver empresa y sede desde el JWT (auth.uid())
    IF auth.uid() IS NOT NULL THEN
        SELECT * INTO v_perfil
        FROM public.perfiles
        WHERE id = auth.uid() AND estado_activo = true;

        IF FOUND THEN
            v_empresa_id := v_perfil.empresa_id;
        END IF;
    END IF;

    -- 2. Resolver sede_id desde el payload (y empresa_id si no vino por JWT)
    IF NULLIF(TRIM(p_payload->'factura'->>'sede_id'), '') IS NOT NULL THEN
        IF v_empresa_id IS NOT NULL THEN
            SELECT id INTO v_sede_id
            FROM public.sedes
            WHERE id = (p_payload->'factura'->>'sede_id')::UUID
              AND empresa_id = v_empresa_id;
        ELSE
            SELECT id, empresa_id INTO v_sede_id, v_empresa_id
            FROM public.sedes
            WHERE id = (p_payload->'factura'->>'sede_id')::UUID
              AND estado_activo = true;
        END IF;
    ELSIF v_perfil.sede_id IS NOT NULL THEN
        v_sede_id := v_perfil.sede_id;
    END IF;

    IF v_sede_id IS NULL OR v_empresa_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'success', false, 'error', 'sede_o_empresa_no_encontrada');
    END IF;

    v_id_pos := NULLIF(TRIM(p_payload->'factura'->>'id_pos'), '');
    IF v_id_pos IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'success', false, 'error', 'payload_malformado_falta_factura_id_pos');
    END IF;

    v_fecha := COALESCE(NULLIF(TRIM(p_payload->'factura'->>'fecha_venta'), '')::TIMESTAMPTZ, now());

    IF p_payload ? 'credito' AND (p_payload->'credito'->>'monto_adeudado') IS NOT NULL THEN
        v_saldo := GREATEST(COALESCE((p_payload->'credito'->>'monto_adeudado')::NUMERIC, 0), 0);
    ELSE
        v_saldo := GREATEST(
            (p_payload->'factura'->>'total')::NUMERIC - COALESCE(
                (SELECT SUM((pgo->>'monto')::NUMERIC) FROM jsonb_array_elements(COALESCE(p_payload->'pagos', '[]'::jsonb)) AS pgo),
                0
            ),
            0
        );
    END IF;

    -- 3. Resolver o crear cliente en public.clientes (evita FK 23503 cuando el cliente fue creado en SQLite local)
    v_cli_id_raw   := NULLIF(TRIM(p_payload->'factura'->>'cliente_id'), '');
    v_cli_nombre   := NULLIF(TRIM(p_payload->'factura'->>'cliente_nombre'), '');
    v_cli_cedula   := NULLIF(TRIM(p_payload->'factura'->>'cliente_cedula'), '');
    v_cli_telefono := NULLIF(TRIM(p_payload->'factura'->>'cliente_telefono'), '');

    IF v_cli_id_raw IS NOT NULL THEN
        SELECT id INTO v_cliente_id
        FROM public.clientes
        WHERE empresa_id = v_empresa_id
          AND (id::text = v_cli_id_raw OR id_pos = v_cli_id_raw)
        LIMIT 1;
    END IF;

    IF v_cliente_id IS NULL AND v_cli_cedula IS NOT NULL THEN
        v_solo_num := regexp_replace(v_cli_cedula, '[^0-9]', '', 'g');
        IF length(v_solo_num) >= 4 THEN
            SELECT id INTO v_cliente_id
            FROM public.clientes
            WHERE empresa_id = v_empresa_id
              AND regexp_replace(COALESCE(rif_cedula, ''), '[^0-9]', '', 'g') = v_solo_num
            LIMIT 1;
        ELSE
            SELECT id INTO v_cliente_id
            FROM public.clientes
            WHERE empresa_id = v_empresa_id
              AND lower(trim(COALESCE(rif_cedula, ''))) = lower(trim(v_cli_cedula))
            LIMIT 1;
        END IF;

        -- Si el cliente tiene cédula y aún no existe en la nube, crearlo automáticamente
        IF v_cliente_id IS NULL THEN
            INSERT INTO public.clientes (
                id, empresa_id, id_pos, nombre, rif_cedula, telefono, estado_activo, updated_at
            )
            VALUES (
                gen_random_uuid(),
                v_empresa_id,
                COALESCE(v_cli_id_raw, 'pos-' || v_cli_cedula),
                COALESCE(v_cli_nombre, 'Cliente ' || v_cli_cedula),
                v_cli_cedula,
                v_cli_telefono,
                true,
                now()
            )
            ON CONFLICT DO NOTHING
            RETURNING id INTO v_cliente_id;
        END IF;
    END IF;

    -- 4. Upsert en ventas_facturas (idempotente por id_pos)
    INSERT INTO public.ventas_facturas (
        empresa_id, sede_id, cliente_id, id_pos, numero_documento, tipo_documento,
        fecha_venta, total, descuento, saldo_pendiente, estado_pago,
        cajero_nombre, mesero_nombre, cliente_nombre, propina
    )
    VALUES (
        v_empresa_id,
        v_sede_id,
        v_cliente_id,
        v_id_pos,
        COALESCE(NULLIF(p_payload->'factura'->>'numero_documento', ''), v_id_pos),
        COALESCE(NULLIF(p_payload->'factura'->>'tipo_documento', ''), 'VENTA'),
        v_fecha,
        (p_payload->'factura'->>'total')::NUMERIC,
        COALESCE((p_payload->'factura'->>'descuento')::NUMERIC, 0),
        v_saldo,
        CASE WHEN v_saldo > 0 THEN 2 ELSE 1 END,
        p_payload->'factura'->>'cajero_nombre',
        NULLIF(p_payload->'factura'->>'mesero_nombre', ''),
        v_cli_nombre,
        COALESCE((p_payload->'factura'->>'propina')::NUMERIC, 0)
    )
    ON CONFLICT (id_pos) DO UPDATE SET
        total          = EXCLUDED.total,
        descuento      = EXCLUDED.descuento,
        cliente_id     = COALESCE(EXCLUDED.cliente_id, public.ventas_facturas.cliente_id),
        cliente_nombre = COALESCE(EXCLUDED.cliente_nombre, public.ventas_facturas.cliente_nombre),
        cajero_nombre  = COALESCE(EXCLUDED.cajero_nombre, public.ventas_facturas.cajero_nombre),
        mesero_nombre  = COALESCE(EXCLUDED.mesero_nombre, public.ventas_facturas.mesero_nombre),
        propina        = EXCLUDED.propina
    RETURNING id INTO v_factura_id;

    -- 5. Detalles (soporta producto_id_pos y producto_id)
    DELETE FROM public.ventas_detalles WHERE factura_id = v_factura_id;
    IF jsonb_typeof(p_payload->'detalles') = 'array' THEN
        INSERT INTO public.ventas_detalles (
            empresa_id, factura_id, id_pos, producto_id, cantidad, precio_unitario, total, descuento
        )
        SELECT
            v_empresa_id,
            v_factura_id,
            COALESCE(NULLIF(d->>'id_pos', ''), gen_random_uuid()::text),
            (
                SELECT pr.id FROM public.productos pr
                WHERE pr.empresa_id = v_empresa_id
                  AND (
                      pr.id::text = COALESCE(NULLIF(d->>'producto_id_pos', ''), d->>'producto_id')
                      OR pr.id_pos = COALESCE(NULLIF(d->>'producto_id_pos', ''), d->>'producto_id')
                  )
                LIMIT 1
            ),
            (d->>'cantidad')::NUMERIC,
            (d->>'precio_unitario')::NUMERIC,
            (d->>'total')::NUMERIC,
            COALESCE((d->>'descuento')::NUMERIC, 0)
        FROM jsonb_array_elements(p_payload->'detalles') AS d;
    END IF;

    -- 6. Pagos (usando gen_random_uuid() en vez de uuid_generate_v4())
    DELETE FROM public.ventas_pagos WHERE factura_id = v_factura_id;
    IF jsonb_typeof(p_payload->'pagos') = 'array' THEN
        INSERT INTO public.ventas_pagos (
            empresa_id, factura_id, id_pos, tipo_pago, monto, fecha_pago, moneda, monto_bs, tasa_cambio, referencia
        )
        SELECT
            v_empresa_id,
            v_factura_id,
            COALESCE(NULLIF(p->>'id_pos', ''), gen_random_uuid()::text),
            p->>'tipo_pago',
            (p->>'monto')::NUMERIC,
            v_fecha,
            COALESCE(p->>'moneda', 'USD'),
            COALESCE((p->>'monto_bs')::NUMERIC, 0),
            COALESCE((p->>'tasa_cambio')::NUMERIC, 1),
            p->>'referencia'
        FROM jsonb_array_elements(p_payload->'pagos') AS p
        ON CONFLICT (id_pos) DO NOTHING;
    END IF;

    -- 7. Actualizar marca de sincronización de la sede
    UPDATE public.sedes
    SET ultima_sincronizacion = now(),
        estado_sincronizacion = 'SINCRONIZADO'
    WHERE id = v_sede_id;

    RETURN jsonb_build_object('ok', true, 'success', true, 'factura_id', v_factura_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'success', false, 'error', SQLERRM, 'state', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_venta_pos(JSONB) TO anon, authenticated;
