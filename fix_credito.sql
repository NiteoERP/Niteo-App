CREATE OR REPLACE FUNCTION get_detalle_deuda_cliente(
  p_empresa_id UUID,
  p_cliente_id UUID,
  p_sede_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id_factura UUID,
  numero_documento TEXT,
  fecha_venta TIMESTAMP WITH TIME ZONE,
  total_factura NUMERIC,
  monto_abonado NUMERIC,
  saldo_pendiente NUMERIC,
  sede_nombre TEXT,
  productos_json JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS \$\$
BEGIN
  RETURN QUERY
  SELECT 
    f.id as id_factura,
    f.numero_documento,
    f.fecha_venta,
    f.total as total_factura,
    COALESCE((SELECT SUM(monto) FROM ventas_pagos WHERE factura_id = f.id), 0) as monto_abonado,
    f.total - COALESCE((SELECT SUM(monto) FROM ventas_pagos WHERE factura_id = f.id), 0) as saldo_pendiente,
    s.nombre_sede as sede_nombre,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'nombre', p.nombre,
        'cantidad', vd.cantidad,
        'total', vd.total
      ))
      FROM ventas_detalles vd
      JOIN productos p ON vd.producto_id = p.id
      WHERE vd.factura_id = f.id
    ) as productos_json
  FROM ventas_facturas f
  LEFT JOIN sedes s ON f.sede_id = s.id
  WHERE f.empresa_id = p_empresa_id
    AND (p_cliente_id IS NULL OR f.cliente_id = p_cliente_id)
    AND (p_sede_id IS NULL OR f.sede_id = p_sede_id)
    AND f.estado_pago = 2 -- 2 = Crédito/Pendiente
  ORDER BY f.fecha_venta DESC;
END;
\$\$;
