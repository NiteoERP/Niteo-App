-- ============================================================
-- RPC: registrar_abono_seguro
-- Registra un abono a una factura de forma atómica, con:
-- - Lock de fila para prevenir race conditions
-- - Idempotency key para prevenir doble-submit
-- - Soporte multimoneda (USD o Bs con conversión automática)
-- ============================================================

CREATE OR REPLACE FUNCTION public.registrar_abono_seguro(
    p_empresa_id      UUID,
    p_factura_id      UUID,
    p_monto_usd       NUMERIC,       -- Monto en USD (ya convertido si era Bs)
    p_metodo_pago     TEXT,
    p_moneda_entrada  TEXT,          -- 'USD' o 'Bs' (para trazabilidad)
    p_monto_entrada   NUMERIC,       -- Monto original ingresado por el cajero
    p_tasa_cambio     NUMERIC,       -- Tasa BCV usada en la conversión
    p_idempotency_key TEXT,          -- UUID generado al abrir el modal de pago
    p_fecha_pago      TIMESTAMPTZ DEFAULT now(),
    p_referencia      TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_saldo_actual NUMERIC;
    v_nuevo_saldo  NUMERIC;
    v_estado_pago  INTEGER;
    v_monto_bs     NUMERIC;
BEGIN
    -- Validación básica
    IF p_monto_usd <= 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'monto_debe_ser_positivo');
    END IF;

    -- Idempotency check ANTES del lock (optimización: evita bloqueo innecesario)
    IF EXISTS (
        SELECT 1 FROM public.ventas_pagos
        WHERE id_pos = p_idempotency_key
    ) THEN
        RETURN jsonb_build_object('ok', true, 'idempotent', true, 'message', 'pago_ya_registrado');
    END IF;

    -- Lock de fila para prevenir race condition con 2 tabs/usuarios simultáneos
    SELECT saldo_pendiente INTO v_saldo_actual
    FROM public.ventas_facturas
    WHERE id = p_factura_id
      AND empresa_id = p_empresa_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'factura_no_encontrada');
    END IF;

    -- Calcular nuevo saldo (nunca puede ser negativo)
    v_nuevo_saldo := GREATEST(0, v_saldo_actual - p_monto_usd);
    -- estado_pago: 1 = pagado, 2 = crédito parcial
    v_estado_pago := CASE WHEN v_nuevo_saldo > 0.001 THEN 2 ELSE 1 END;

    -- Calcular monto_bs para trazabilidad
    v_monto_bs := CASE
        WHEN p_moneda_entrada = 'Bs' THEN p_monto_entrada
        ELSE ROUND(p_monto_usd * p_tasa_cambio, 2)
    END;

    -- Actualizar saldo de la factura
    UPDATE public.ventas_facturas
    SET
        saldo_pendiente = v_nuevo_saldo,
        estado_pago     = v_estado_pago
    WHERE id = p_factura_id;

    -- Registrar el pago con todos los campos de trazabilidad
    INSERT INTO public.ventas_pagos (
        empresa_id,
        factura_id,
        id_pos,
        tipo_pago,
        monto,
        moneda,
        monto_bs,
        tasa_cambio,
        fecha_pago,
        referencia
    ) VALUES (
        p_empresa_id,
        p_factura_id,
        p_idempotency_key,
        p_metodo_pago,
        p_monto_usd,
        COALESCE(p_moneda_entrada, 'USD'),
        v_monto_bs,
        p_tasa_cambio,
        p_fecha_pago,
        p_referencia
    );

    RETURN jsonb_build_object(
        'ok',           true,
        'nuevo_saldo',  v_nuevo_saldo,
        'estado_pago',  v_estado_pago,
        'monto_bs',     v_monto_bs
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'ok',    false,
        'error', SQLERRM
    );
END;
$$;

-- Dar permisos de ejecución al rol anon y authenticated
GRANT EXECUTE ON FUNCTION public.registrar_abono_seguro TO anon, authenticated;

COMMENT ON FUNCTION public.registrar_abono_seguro IS
    'Registra un abono de forma atómica con idempotency key. '
    'Soporta abonos en USD o Bs con conversión automática. '
    'Previene race conditions con FOR UPDATE y doble-submit con idempotency check.';
