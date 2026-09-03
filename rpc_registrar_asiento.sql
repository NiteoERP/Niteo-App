-- Función para registrar un asiento contable con sus movimientos de forma atómica.
-- Valida que la Partida Doble cuadre (Suma Debe == Suma Haber).

CREATE OR REPLACE FUNCTION fn_registrar_asiento(
    p_empresa_id UUID,
    p_fecha TIMESTAMP WITH TIME ZONE,
    p_concepto TEXT,
    p_origen_tipo TEXT,
    p_origen_id TEXT,
    p_creado_por TEXT,
    p_movimientos JSONB
) RETURNS UUID AS $$
DECLARE
    v_asiento_id UUID;
    v_suma_debe NUMERIC := 0;
    v_suma_haber NUMERIC := 0;
BEGIN
    -- 1. Validar Partida Doble
    SELECT 
        COALESCE(SUM((m->>'debe')::NUMERIC), 0),
        COALESCE(SUM((m->>'haber')::NUMERIC), 0)
    INTO v_suma_debe, v_suma_haber
    FROM jsonb_array_elements(p_movimientos) m;

    IF v_suma_debe <> v_suma_haber THEN
        RAISE EXCEPTION 'Partida doble no cuadra. Suma Debe: %, Suma Haber: %', v_suma_debe, v_suma_haber;
    END IF;

    -- 2. Insertar Cabecera (Asiento)
    INSERT INTO contabilidad_asientos (
        empresa_id, fecha, concepto, origen_tipo, origen_id, creado_por
    ) VALUES (
        p_empresa_id, p_fecha, p_concepto, p_origen_tipo, p_origen_id, p_creado_por
    ) RETURNING id INTO v_asiento_id;

    -- 3. Insertar Movimientos
    INSERT INTO contabilidad_movimientos (
        empresa_id, asiento_id, cuenta_id, debe, haber
    )
    SELECT 
        p_empresa_id,
        v_asiento_id,
        (m->>'cuenta_id')::UUID,
        (m->>'debe')::NUMERIC,
        (m->>'haber')::NUMERIC
    FROM jsonb_array_elements(p_movimientos) m;

    RETURN v_asiento_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY INVOKER;
