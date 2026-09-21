const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sql = `
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'actualizar_saldo_pendiente_compra_trigger'
`;

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  console.log('Function def:', data, error);
}
run();
