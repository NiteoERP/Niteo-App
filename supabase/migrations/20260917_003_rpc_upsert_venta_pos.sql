-- ============================================================
-- RPC: upsert_venta_pos
-- Recibe el payload completo de una venta desde el POS local
-- y hace UPSERT atómico de factura + detalles + pagos.
-- La autenticación se hace por master_key (no por JWT),
-- lo que permite sincronización desde el desktop sin sesión.
-- ============================================================

CREATE OR REPLACE FUNCTION public.upsert_venta_pos(
    p_master_key TEXT,
    p_payload    JSONB
    -- Estructura esperada de p_payload:
    -- {
    --   "master_key": "...",  (también en p_master_key, redundante por compatibilidad)
    --   "factura": {
    --     "id_pos": "uuid-string",
    --     "numero_documento": "...",
    --     "fecha_venta": "2026-09-17T18:00:00-04:00",
    --     "total": 25.00,
    --     "descuento": 0,
    --     "tasa_bcv": 36.85,
    --     "cajero_nombre": "..."
    --   },
    --   "detalles": [
    --     { "id_pos": "...", "producto_id_pos": "...", "cantidad": 2, "precio_unitario": 5.00, "total": 10.00 }
    --   ],
    --   "pagos": [
    --     { "id_pos": "...", "tipo_pago": "Efectivo USD", "monto": 25.00 }
    --   ],
    --   "credito": {  -- OPCIONAL, solo si saldo_pendiente > 0
    --     "monto_adeudado": 10.00,
    --     "nombre_cliente": "..."
    --   }
    -- }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sede        public.sedes%ROWTYPE;
    v_factura_id  UUID;
    v_id_pos      TEXT;
    v_saldo       NUMERIC;
BEGIN
    -- 1. Validar Master Key -> obtener empresa_id y sede_id desde el SERVIDOR
    --    (no confiamos en el empresa_id del cliente)
    SELECT * INTO v_sede
    FROM public.sedes
    WHERE master_key = p_master_key
      AND estado_activo = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'ok',    false,
            'error', 'master_key_invalida_o_sede_inactiva'
        );
    END IF;

    v_id_pos  := p_payload->'factura'->>'id_pos';
    v_saldo   := COALESCE((p_payload->'credito'->>'monto_adeudado')::NUMERIC, 0);

    -- 2. UPSERT de la factura (idempotente por id_pos)
    INSERT INTO public.ventas_facturas (
        empresa_id,
        sede_id,
        id_pos,
        numero_documento,
        tipo_documento,
        fecha_venta,
        total,
        descuento,
        saldo_pendiente,
        estado_pago,
        cajero_nombre,
        mesero_nombre
    ) VALUES (
        v_sede.empresa_id,
        v_sede.id,
        v_id_pos,
        COALESCE(p_payload->'factura'->>'numero_documento', v_id_pos),
        'VENTA',
        COALESCE(
            (p_payload->'factura'->>'fecha_venta')::TIMESTAMPTZ,
            now()
        ),
        (p_payload->'factura'->>'total')::NUMERIC,
        COALESCE((p_payload->'factura'->>'descuento')::NUMERIC, 0),
        v_saldo,
        CASE WHEN v_saldo > 0 THEN 2 ELSE 1 END,
        p_payload->'factura'->>'cajero_nombre',
        p_payload->'factura'->>'cajero_nombre'
    )
    ON CONFLICT (id_pos) DO UPDATE SET
        total           = EXCLUDED.total,
        saldo_pendiente = EXCLUDED.saldo_pendiente,
        estado_pago     = EXCLUDED.estado_pago
    RETURNING id INTO v_factura_id;

    -- 3. Limpiar y reinsertar detalles (idempotencia total)
    DELETE FROM public.ventas_detalles WHERE factura_id = v_factura_id;

    INSERT INTO public.ventas_detalles (
        empresa_id,
        factura_id,
        id_pos,
        producto_id,
        cantidad,
        precio_unitario,
        total
    )
    SELECT
        v_sede.empresa_id,
        v_factura_id,
        det->>'id_pos',
        -- Buscar el UUID del producto por su id_pos en esta empresa
        (
            SELECT id FROM public.productos
            WHERE id_pos = det->>'producto_id_pos'
              AND empresa_id = v_sede.empresa_id
            LIMIT 1
        ),
        (det->>'cantidad')::NUMERIC,
        (det->>'precio_unitario')::NUMERIC,
        (det->>'total')::NUMERIC
    FROM jsonb_array_elements(COALESCE(p_payload->'detalles', '[]'::jsonb)) AS det;

    -- 4. UPSERT de pagos (idempotente por id_pos)
    INSERT INTO public.ventas_pagos (
        empresa_id,
        factura_id,
        id_pos,
        tipo_pago,
        monto,
        fecha_pago
    )
    SELECT
        v_sede.empresa_id,
        v_factura_id,
        pago->>'id_pos',
        pago->>'tipo_pago',
        (pago->>'monto')::NUMERIC,
        COALESCE((pago->>'fecha_pago')::TIMESTAMPTZ, now())
    FROM jsonb_array_elements(COALESCE(p_payload->'pagos', '[]'::jsonb)) AS pago
    ON CONFLICT (id_pos) DO NOTHING;  -- idempotente: si ya existe, no hacer nada

    -- 5. Actualizar timestamp de última sincronización de la sede
    UPDATE public.sedes
    SET ultima_sincronizacion = now(),
        estado_sincronizacion = 'SINCRONIZADO'
    WHERE id = v_sede.id;

    RETURN jsonb_build_object(
        'ok',         true,
        'factura_id', v_factura_id,
        'sede_id',    v_sede.id,
        'empresa_id', v_sede.empresa_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'ok',    false,
        'error', SQLERRM
    );
END;
$$;

-- Permisos: anon puede ejecutarla (autenticada por master_key internamente)
GRANT EXECUTE ON FUNCTION public.upsert_venta_pos TO anon, authenticated;

COMMENT ON FUNCTION public.upsert_venta_pos IS
    'Recibe el payload completo de una venta desde Niteo POS y hace UPSERT '
    'atómico de factura + detalles + pagos. Autenticación por master_key. '
    'Idempotente: se puede llamar múltiples veces con el mismo payload sin efectos secundarios.';
