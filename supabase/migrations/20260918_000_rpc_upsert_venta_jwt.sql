-- RPC: upsert_venta_pos (Actualizado para usar JWT)
-- Primero eliminamos la funcion anterior para evitar conflictos de firmas
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
    v_factura_id  UUID;
    v_id_pos      TEXT;
    v_saldo       NUMERIC;
BEGIN
    -- 1. Validar Usuario -> obtener empresa_id y sede_id usando el JWT
    SELECT * INTO v_perfil
    FROM public.perfiles
    WHERE id = auth.uid()
      AND estado_activo = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'ok',    false,
            'error', 'usuario_no_encontrado_o_inactivo_jwt_invalido'
        );
    END IF;

    IF v_perfil.sede_id IS NULL THEN
        RETURN jsonb_build_object(
            'ok',    false,
            'error', 'cajero_sin_sede_asignada'
        );
    END IF;

    -- 2. Extraer datos básicos
    v_id_pos := p_payload->'factura'->>'id_pos';
    
    IF v_id_pos IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'payload_malformado_falta_factura_id_pos');
    END IF;

    -- 3. Iniciar UPSERT de Factura
    INSERT INTO public.ventas_facturas (
        empresa_id,
        sede_id,
        id_pos,
        numero_documento,
        fecha_venta,
        total,
        descuento,
        tasa_bcv,
        cajero_nombre,
        sincronizado
    )
    VALUES (
        v_perfil.empresa_id,
        v_perfil.sede_id,
        v_id_pos,
        p_payload->'factura'->>'numero_documento',
        (p_payload->'factura'->>'fecha_venta')::TIMESTAMPTZ,
        (p_payload->'factura'->>'total')::NUMERIC,
        (p_payload->'factura'->>'descuento')::NUMERIC,
        (p_payload->'factura'->>'tasa_bcv')::NUMERIC,
        p_payload->'factura'->>'cajero_nombre',
        true
    )
    ON CONFLICT (id_pos) DO UPDATE
    SET 
        total         = EXCLUDED.total,
        descuento     = EXCLUDED.descuento,
        tasa_bcv      = EXCLUDED.tasa_bcv,
        sincronizado  = true
    RETURNING id INTO v_factura_id;

    -- 4. Insertar Detalles
    DELETE FROM public.ventas_detalles WHERE factura_id = v_factura_id;
    
    INSERT INTO public.ventas_detalles (
        factura_id,
        id_pos,
        producto_id,
        cantidad,
        precio_unitario,
        total
    )
    SELECT
        v_factura_id,
        d->>'id_pos',
        NULLIF(d->>'producto_id_nube', '')::UUID,
        (d->>'cantidad')::NUMERIC,
        (d->>'precio_unitario')::NUMERIC,
        (d->>'total')::NUMERIC
    FROM jsonb_array_elements(p_payload->'detalles') AS d;

    -- 5. Insertar Pagos
    DELETE FROM public.ventas_pagos WHERE factura_id = v_factura_id;

    INSERT INTO public.ventas_pagos (
        factura_id,
        id_pos,
        tipo_pago,
        monto
    )
    SELECT
        v_factura_id,
        p->>'id_pos',
        p->>'tipo_pago',
        (p->>'monto')::NUMERIC
    FROM jsonb_array_elements(p_payload->'pagos') AS p;

    -- 6. Insertar Crédito (Cuentas por Cobrar)
    IF (p_payload ? 'credito') AND p_payload->'credito' IS NOT NULL THEN
        v_saldo := (p_payload->'credito'->>'monto_adeudado')::NUMERIC;
        IF v_saldo > 0 THEN
            INSERT INTO public.ventas_cuentas_cobrar (
                empresa_id,
                sede_id,
                factura_id,
                id_pos,
                monto_adeudado,
                saldo_pendiente,
                estado_deuda,
                nombre_cliente,
                telefono_cliente
            )
            VALUES (
                v_perfil.empresa_id,
                v_perfil.sede_id,
                v_factura_id,
                p_payload->'factura'->>'id_pos',
                v_saldo,
                v_saldo,
                'pendiente',
                p_payload->'credito'->>'nombre_cliente',
                p_payload->'credito'->>'telefono_cliente'
            )
            ON CONFLICT (id_pos) DO UPDATE
            SET
                monto_adeudado = EXCLUDED.monto_adeudado,
                nombre_cliente = EXCLUDED.nombre_cliente,
                telefono_cliente = EXCLUDED.telefono_cliente;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'factura_id', v_factura_id,
        'mensaje', 'Sincronizado exitosamente vía RPC (JWT)'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'ok', false,
        'error', SQLERRM,
        'state', SQLSTATE
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.upsert_venta_pos(JSONB) TO anon, authenticated;
