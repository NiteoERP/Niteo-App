const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data: facturas, error: errFac } = await supabase
    .from('ventas_facturas')
    .select('id, cliente_id, numero_documento')
    .eq('numero_documento', '26-200-005214');
  
  console.log("Factura:", facturas);

  if (facturas && facturas.length > 0) {
    const { data: pagos } = await supabase
      .from('ventas_pagos')
      .select('*')
      .eq('factura_id', facturas[0].id);
    console.log("Pagos de esta factura:", pagos);
  }
}

test();
