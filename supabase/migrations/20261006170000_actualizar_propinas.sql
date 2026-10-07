-- 1. Agregar columna propina a ventas_facturas si no existe
ALTER TABLE public.ventas_facturas ADD COLUMN IF NOT EXISTS propina NUMERIC DEFAULT 0;

-- 2. Agregar columna propina a comandas_mesero si no existe
ALTER TABLE public.comandas_mesero ADD COLUMN IF NOT EXISTS propina NUMERIC DEFAULT 0;

-- 3. Actualizar upsert_venta_pos para que guarde la propina
CREATE OR REPLACE FUNCTION public.upsert_venta_pos(p_payload JSONB)
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
    SELECT * INTO v_perfil FROM public.perfiles WHERE id = auth.uid() AND estado_activo = true;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Usuario inactivo o no encontrado');
    END IF;

    v_sede_id := COALESCE(NULLIF(p_payload->'factura'->>'sede_id', ''), (p_payload->'factura'->>'sede_id'))::UUID;
    v_id_pos := p_payload->'factura'->>'id_pos';
    v_saldo := (p_payload->'factura'->>'total')::NUMERIC - COALESCE(
        (SELECT SUM((pgo->>'monto')::NUMERIC) FROM jsonb_array_elements(p_payload->'pagos') AS pgo),
        0
    );
    v_fecha := COALESCE(NULLIF(p_payload->'factura'->>'fecha_venta', ''), now()::text)::TIMESTAMPTZ;
    v_cliente_id := NULLIF(p_payload->'factura'->>'cliente_id', '')::UUID;

    INSERT INTO public.ventas_facturas (
        empresa_id, sede_id, cliente_id, id_pos, numero_documento, tipo_documento,
        fecha_venta, total, descuento, saldo_pendiente, estado_pago,
        cajero_nombre, mesero_nombre, cliente_nombre, propina
    )
    VALUES (
        v_perfil.empresa_id,
        v_sede_id,
        v_cliente_id,
        v_id_pos,
        COALESCE(NULLIF(p_payload->'factura'->>'numero_documento', ''), v_id_pos),
        COALESCE(p_payload->'factura'->>'tipo_documento', 'VENTA'),
        v_fecha,
        (p_payload->'factura'->>'total')::NUMERIC,
        COALESCE((p_payload->'factura'->>'descuento')::NUMERIC, 0),
        v_saldo,
        CASE WHEN v_saldo > 0 THEN 2 ELSE 1 END,
        p_payload->'factura'->>'cajero_nombre',
        NULLIF(p_payload->'factura'->>'mesero_nombre', ''),
        NULLIF(p_payload->'factura'->>'cliente_nombre', ''),
        COALESCE((p_payload->'factura'->>'propina')::NUMERIC, 0)
    )
    ON CONFLICT (id_pos) DO UPDATE SET
        total          = EXCLUDED.total,
        descuento      = EXCLUDED.descuento,
        cliente_id     = EXCLUDED.cliente_id,
        cliente_nombre = EXCLUDED.cliente_nombre,
        cajero_nombre  = EXCLUDED.cajero_nombre,
        mesero_nombre  = EXCLUDED.mesero_nombre,
        saldo_pendiente= EXCLUDED.saldo_pendiente,
        estado_pago    = EXCLUDED.estado_pago,
        tipo_documento = EXCLUDED.tipo_documento,
        propina        = EXCLUDED.propina
    RETURNING id INTO v_factura_id;

    -- Detalles
    DELETE FROM public.ventas_detalles WHERE factura_id = v_factura_id;
    IF jsonb_typeof(p_payload->'detalles') = 'array' THEN
        INSERT INTO public.ventas_detalles (empresa_id, factura_id, producto_id, id_pos, cantidad, precio_unitario, total, descuento)
        SELECT v_perfil.empresa_id, v_factura_id, NULLIF(d->>'producto_id', '')::UUID, d->>'id_pos', (d->>'cantidad')::NUMERIC, (d->>'precio_unitario')::NUMERIC, (d->>'total')::NUMERIC, COALESCE((d->>'descuento')::NUMERIC, 0)
        FROM jsonb_array_elements(p_payload->'detalles') AS d;
    END IF;

    -- Pagos
    DELETE FROM public.ventas_pagos WHERE factura_id = v_factura_id;
    IF jsonb_typeof(p_payload->'pagos') = 'array' THEN
        INSERT INTO public.ventas_pagos (empresa_id, factura_id, id_pos, tipo_pago, monto, fecha_pago, moneda, monto_bs, tasa_cambio, referencia)
        SELECT v_perfil.empresa_id, v_factura_id, uuid_generate_v4()::text, p->>'tipo_pago', (p->>'monto')::NUMERIC, v_fecha, COALESCE(p->>'moneda', 'USD'), COALESCE((p->>'monto_bs')::NUMERIC, 0), COALESCE((p->>'tasa_cambio')::NUMERIC, 1), p->>'referencia'
        FROM jsonb_array_elements(p_payload->'pagos') AS p;
    END IF;

    RETURN jsonb_build_object('success', true, 'factura_id', v_factura_id);
END;
$$;

