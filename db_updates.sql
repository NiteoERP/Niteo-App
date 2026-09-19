-- 1. Vaciar auditoria_log y modificar triggers para evitar que se llene al crear registros
DELETE FROM public.auditoria_log;

DROP TRIGGER IF EXISTS trigger_auditoria_facturas ON public.ventas_facturas;
CREATE TRIGGER trigger_auditoria_facturas
  AFTER UPDATE OR DELETE ON public.ventas_facturas
  FOR EACH ROW EXECUTE FUNCTION function_auditoria();

DROP TRIGGER IF EXISTS trigger_auditoria_pagos ON public.ventas_pagos;
CREATE TRIGGER trigger_auditoria_pagos
  AFTER UPDATE OR DELETE ON public.ventas_pagos
  FOR EACH ROW EXECUTE FUNCTION function_auditoria();

DROP TRIGGER IF EXISTS trigger_auditoria_productos ON public.productos;
CREATE TRIGGER trigger_auditoria_productos
  AFTER UPDATE OR DELETE ON public.productos
  FOR EACH ROW EXECUTE FUNCTION function_auditoria();

DROP TRIGGER IF EXISTS trigger_auditoria_clientes ON public.clientes;
CREATE TRIGGER trigger_auditoria_clientes
  AFTER UPDATE OR DELETE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION function_auditoria();

-- 2. Crear RPC para Historial de Abonos Globales de Proveedores
CREATE OR REPLACE FUNCTION get_historial_abonos_proveedor(p_proveedor_id uuid)
RETURNS TABLE (
  fecha_pago timestamp with time zone,
  metodo_pago varchar,
  referencia varchar,
  banco_origen varchar,
  monto_total numeric,
  cantidad_facturas bigint,
  facturas_afectadas json
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.fecha_pago,
    cp.metodo_pago,
    cp.referencia,
    cp.banco_origen,
    SUM(cp.monto) as monto_total,
    COUNT(cp.id) as cantidad_facturas,
    json_agg(json_build_object(
      'factura_id', cf.id,
      'numero_factura', cf.numero_factura,
      'monto_aplicado', cp.monto
    )) as facturas_afectadas
  FROM compras_pagos cp
  JOIN compras_facturas cf ON cp.factura_id = cf.id
  WHERE cf.proveedor_id = p_proveedor_id
  GROUP BY 
    cp.fecha_pago, cp.metodo_pago, cp.referencia, cp.banco_origen
  ORDER BY cp.fecha_pago DESC;
END;
$$ LANGUAGE plpgsql;
