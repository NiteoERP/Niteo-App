const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // Create a fake client
  const empId = '818d1555-e879-4f1d-8bed-39eb466aa5e3';
  const { data: cli } = await supabase.from('clientes').insert({ empresa_id: empId, nombre: 'Test Trigger', tipo_documento: 'V', numero_documento: '123456' }).select().single();
  
  // Create a fake invoice
  const { data: fac } = await supabase.from('ventas_facturas').insert({
    empresa_id: empId,
    cliente_id: cli.id,
    id_pos: 'TEST',
    numero_documento: 'TEST-1',
    tipo_documento: 'CREDITO',
    total: 100,
    saldo_pendiente: 100
  }).select().single();
  
  console.log("Before payment, saldo_pendiente:", fac.saldo_pendiente);
  
  // Insert payment
  await supabase.from('ventas_pagos').insert({
    empresa_id: empId,
    factura_id: fac.id,
    id_pos: 'TEST',
    tipo_pago: 'Efectivo',
    monto: 10
  });
  
  // Fetch invoice again
  const { data: fac2 } = await supabase.from('ventas_facturas').select('saldo_pendiente').eq('id', fac.id).single();
  console.log("After payment, saldo_pendiente:", fac2.saldo_pendiente);
  
  // cleanup
  await supabase.from('ventas_pagos').delete().eq('factura_id', fac.id);
  await supabase.from('ventas_facturas').delete().eq('id', fac.id);
  await supabase.from('clientes').delete().eq('id', cli.id);
}
run();
