-- ============================================================
-- RPC: upsert_venta_pos (JWT) — versión alineada al esquema REAL
-- NO altera tablas. Solo reemplaza la función.
-- Columnas usadas verificadas contra el esquema de producción:
--   ventas_facturas: empresa_id, sede_id, cliente_id, id_pos, numero_documento,
--     tipo_documento, fecha_venta, total, descuento, saldo_pendiente,
--     estado_pago, cajero_nombre, mesero_nombre, cliente_nombre
--   ventas_detalles: empresa_id, factura_id, producto_id, id_pos, cantidad,
--     precio_unitario, total
--   ventas_pagos: empresa_id, factura_id, id_pos, tipo_pago, monto, fecha_pago
-- Créditos: igual que Niteo Web (saldo_pendiente > 0 y estado_pago = 2).
-- ============================================================

DROP FUNCTION IF EXISTS public.upsert_venta_pos(TEXT, JSONB);
DROP FUNCTION IF EXISTS public.upsert_venta_pos(JSONB);

CREATE OR REPLACE FUNCTION public.upsert_venta_pos(
    p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_perfil      public.perfiles%ROWTYPE;
    v_sede_id     UUID;
    v_factura_id  UUID;
    v_id_pos      TEXT;
    v_saldo       NUMERIC;
    v_fecha       TIMESTAMPTZ;
    v_cliente_id  UUID;
BEGIN
    -- 1. Usuario autenticado (JWT)
    SELECT * INTO v_perfil
    FROM public.perfiles
    WHERE id = auth.uid() AND estado_activo = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'usuario_no_encontrado_o_inactivo_jwt_invalido');
    END IF;

    -- 2. Sede: manda la sede de la caja (pasantes), validando que sea de la misma empresa
    IF NULLIF(p_payload->'factura'->>'sede_id', '') IS NOT NULL THEN
        SELECT id INTO v_sede_id
        FROM public.sedes
        WHERE id = (p_payload->'factura'->>'sede_id')::UUID
          AND empresa_id = v_perfil.empresa_id;
        IF v_sede_id IS NULL THEN
            RETURN jsonb_build_object('ok', false, 'error', 'sede_no_pertenece_a_la_empresa');
        END IF;
    ELSE
        v_sede_id := v_perfil.sede_id;
    END IF;

    IF v_sede_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'cajero_sin_sede_y_pos_no_envio_sede');
    END IF;

    v_id_pos := p_payload->'factura'->>'id_pos';
    IF v_id_pos IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'payload_malformado_falta_factura_id_pos');
    END IF;

    v_fecha := COALESCE(NULLIF(p_payload->'factura'->>'fecha_venta', '')::TIMESTAMPTZ, now());
    v_saldo := GREATEST(COALESCE((p_payload->'credito'->>'monto_adeudado')::NUMERIC, 0), 0);

    -- Cliente: solo se enlaza si existe en la nube para esta empresa (evita error de FK)
    IF NULLIF(p_payload->'factura'->>'cliente_id', '') IS NOT NULL THEN
        SELECT id INTO v_cliente_id
        FROM public.clientes
        WHERE id::text = p_payload->'factura'->>'cliente_id'
          AND empresa_id = v_perfil.empresa_id;
    END IF;

    -- 3. Factura (idempotente por id_pos)
    INSERT INTO public.ventas_facturas (
        empresa_id, sede_id, cliente_id, id_pos, numero_documento, tipo_documento,
        fecha_venta, total, descuento, saldo_pendiente, estado_pago,
        cajero_nombre, mesero_nombre, cliente_nombre
    )
    VALUES (
        v_perfil.empresa_id,
        v_sede_id,
        v_cliente_id,
        v_id_pos,
        COALESCE(NULLIF(p_payload->'factura'->>'numero_documento', ''), v_id_pos),
        'VENTA',
        v_fecha,
        (p_payload->'factura'->>'total')::NUMERIC,
        COALESCE((p_payload->'factura'->>'descuento')::NUMERIC, 0),
        v_saldo,
        CASE WHEN v_saldo > 0 THEN 2 ELSE 1 END,
        p_payload->'factura'->>'cajero_nombre',
        NULLIF(p_payload->'factura'->>'mesero_nombre', ''),
        NULLIF(p_payload->'factura'->>'cliente_nombre', '')
    )
    ON CONFLICT (id_pos) DO UPDATE SET
        total          = EXCLUDED.total,
        descuento      = EXCLUDED.descuento,
        cliente_id     = EXCLUDED.cliente_id,
        cliente_nombre = EXCLUDED.cliente_nombre,
        mesero_nombre  = EXCLUDED.mesero_nombre
        -- saldo_pendiente/estado_pago NO se sobrescriben en reenvíos
        -- para no borrar abonos registrados luego en Niteo Web.
    RETURNING id INTO v_factura_id;

    -- 4. Detalles (el POS envía el UUID de la nube en producto_id_pos)
    DELETE FROM public.ventas_detalles WHERE factura_id = v_factura_id;

    INSERT INTO public.ventas_detalles (
        empresa_id, factura_id, id_pos, producto_id, cantidad, precio_unitario, total
    )
    SELECT
        v_perfil.empresa_id,
        v_factura_id,
        COALESCE(NULLIF(d->>'id_pos', ''), gen_random_uuid()::text),
        (
            SELECT pr.id FROM public.productos pr
            WHERE pr.empresa_id = v_perfil.empresa_id
              AND (pr.id::text = d->>'producto_id_pos' OR pr.id_pos = d->>'producto_id_pos')
            LIMIT 1
        ),
        (d->>'cantidad')::NUMERIC,
        (d->>'precio_unitario')::NUMERIC,
        (d->>'total')::NUMERIC
    FROM jsonb_array_elements(COALESCE(p_payload->'detalles', '[]'::jsonb)) AS d;

    -- 5. Pagos
    DELETE FROM public.ventas_pagos WHERE factura_id = v_factura_id;

    INSERT INTO public.ventas_pagos (
        empresa_id, factura_id, id_pos, tipo_pago, monto, fecha_pago
    )
    SELECT
        v_perfil.empresa_id,
        v_factura_id,
        COALESCE(NULLIF(p->>'id_pos', ''), gen_random_uuid()::text),
        p->>'tipo_pago',
        (p->>'monto')::NUMERIC,
        v_fecha
    FROM jsonb_array_elements(COALESCE(p_payload->'pagos', '[]'::jsonb)) AS p
    ON CONFLICT (id_pos) DO NOTHING;

    -- 6. Marca de sincronización de la sede (columnas existentes)
    UPDATE public.sedes
    SET ultima_sincronizacion = now(),
        estado_sincronizacion = 'SINCRONIZADO'
    WHERE id = v_sede_id;

    RETURN jsonb_build_object('ok', true, 'factura_id', v_factura_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM, 'state', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_venta_pos(JSONB) TO anon, authenticated;
