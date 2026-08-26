CREATE OR REPLACE FUNCTION obtener_flujo_caja(p_empresa_id UUID, p_fecha_inicio DATE, p_fecha_fin DATE)
RETURNS JSON AS \$\$
DECLARE
  v_ingresos NUMERIC;
  v_egresos NUMERIC;
  v_detalle_ingresos JSON;
  v_detalle_egresos JSON;
  v_resultado JSON;
BEGIN
  -- Sumar Ingresos (Ventas Pagos Aprobados)
  SELECT COALESCE(SUM(monto), 0) INTO v_ingresos
  FROM ventas_pagos
  WHERE empresa_id = p_empresa_id
    AND DATE(fecha_pago) >= p_fecha_inicio
    AND DATE(fecha_pago) <= p_fecha_fin;

  -- Sumar Egresos (Compras Operativas Procesadas)
  SELECT COALESCE(SUM(monto_divisas), 0) INTO v_egresos
  FROM compras_puntuales
  WHERE id_empresa = p_empresa_id
    AND estado != 'ANULADA'
    AND DATE(fecha_registro) >= p_fecha_inicio
    AND DATE(fecha_registro) <= p_fecha_fin;

  -- Agrupar por dia para graficos (Ingresos)
  SELECT COALESCE(json_agg(t), '[]'::json) INTO v_detalle_ingresos FROM (
    SELECT DATE(fecha_pago) as fecha, SUM(monto) as total
    FROM ventas_pagos
    WHERE empresa_id = p_empresa_id 
      AND DATE(fecha_pago) >= p_fecha_inicio 
      AND DATE(fecha_pago) <= p_fecha_fin
    GROUP BY DATE(fecha_pago)
    ORDER BY DATE(fecha_pago) ASC
  ) t;

  -- Agrupar por dia para graficos (Egresos)
  SELECT COALESCE(json_agg(t), '[]'::json) INTO v_detalle_egresos FROM (
    SELECT DATE(fecha_registro) as fecha, SUM(monto_divisas) as total
    FROM compras_puntuales
    WHERE id_empresa = p_empresa_id 
      AND estado != 'ANULADA' 
      AND DATE(fecha_registro) >= p_fecha_inicio 
      AND DATE(fecha_registro) <= p_fecha_fin
    GROUP BY DATE(fecha_registro)
    ORDER BY DATE(fecha_registro) ASC
  ) t;

  v_resultado := json_build_object(
    'total_ingresos', v_ingresos,
    'total_egresos', v_egresos,
    'ganancia_neta', v_ingresos - v_egresos,
    'ingresos_por_dia', v_detalle_ingresos,
    'egresos_por_dia', v_detalle_egresos
  );

  RETURN v_resultado;
END;
\$\$ LANGUAGE plpgsql SECURITY DEFINER;
