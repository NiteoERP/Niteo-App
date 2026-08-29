-- FIX: Quitar 'COMPRA' del motivo en la función registrar_compra_insumo
CREATE OR REPLACE FUNCTION public.registrar_compra_insumo(
  p_insumo_id   UUID,
  p_usuario_id  UUID,
  p_cantidad    NUMERIC,
  p_costo_total NUMERIC  -- costo total en USD de esta compra
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id     UUID;
  v_cant_actual    NUMERIC;
  v_costo_prom     NUMERIC;
  v_costo_unitario NUMERIC;
  v_nueva_cantidad NUMERIC;
  v_nuevo_costo    NUMERIC;
BEGIN
  -- Validaciones bǭsicas
  IF p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a 0.';
  END IF;
  IF p_costo_total < 0 THEN
    RAISE EXCEPTION 'El costo total no puede ser negativo.';
  END IF;

  -- Obtener datos actuales del insumo (lock para evitar race conditions)
  SELECT empresa_id, cantidad_actual, costo_promedio
    INTO v_empresa_id, v_cant_actual, v_costo_prom
    FROM public.inventario_insumos
   WHERE id = p_insumo_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insumo % no encontrado.', p_insumo_id;
  END IF;

  -- Cǭlculos de costo promedio (fórmula de promedio ponderado)
  v_costo_unitario := p_costo_total / p_cantidad;
  v_nueva_cantidad := v_cant_actual + p_cantidad;
  v_nuevo_costo    := ((v_cant_actual * v_costo_prom) + (p_cantidad * v_costo_unitario)) / v_nueva_cantidad;

  -- PASO 1: Registrar movimiento de ENTRADA en historial (SIN motivo = 'COMPRA')
  INSERT INTO public.movimientos_inventario (
    empresa_id,
    insumo_id,
    usuario_id,
    tipo_movimiento,
    cantidad,
    costo_perdido
  ) VALUES (
    v_empresa_id,
    p_insumo_id,
    p_usuario_id,
    'ENTRADA',
    p_cantidad,
    0
  );

  -- PASO 2: Actualizar inventario
  UPDATE public.inventario_insumos
     SET cantidad_actual = v_nueva_cantidad,
         costo_promedio  = ROUND(v_nuevo_costo::NUMERIC, 4)
   WHERE id = p_insumo_id;

END;
$$;
