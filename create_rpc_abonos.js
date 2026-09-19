const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Usuario/Documents/Niteo App/niteo-web/.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const sql = `
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
`;
async function run() {
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  console.log('Result:', data, error);
}
run();
