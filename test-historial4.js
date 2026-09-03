const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const clienteId = 'b587d404-d9a5-4879-9d6a-574ff7658083'; // From the log above
  
  const { data: profile } = await supabase.from('perfiles').select('empresa_id').limit(1).single();

  const { data, error } = await supabase
    .from('ventas_pagos')
    .select(`
      id,
      monto,
      tipo_pago,
      fecha_pago,
      ventas_facturas!inner (
        id,
        cliente_id,
        numero_documento,
        id_pos
      )
    `)
    .eq('ventas_facturas.cliente_id', clienteId)
    .eq('empresa_id', profile.empresa_id)
    .order('fecha_pago', { ascending: false });
  
  console.log("Error:", error);
  console.log("Data length:", data?.length);
  if (data && data.length > 0) {
    console.log("First item:", data[0]);
  }
}

test();
