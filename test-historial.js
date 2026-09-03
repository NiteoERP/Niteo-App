const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from('ventas_pagos')
    .select(`
      id,
      monto,
      tipo_pago,
      fecha_pago,
      ventas_facturas!inner (
        id,
        cliente_id
      )
    `)
    .limit(5);
  
  console.log("Error:", error);
  console.log("Data:", JSON.stringify(data, null, 2));
}

test();
