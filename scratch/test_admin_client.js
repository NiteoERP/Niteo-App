const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  console.log('Testing admin client connection...');
  const { data, error } = await supabaseAdmin.from('compras_facturas').select('id, numero_factura, total').limit(1);
  console.log('Facturas test:', data, error);
}
test();
