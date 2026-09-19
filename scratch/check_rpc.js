const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const query = "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'get_detalle_deuda_cliente'";
async function run() {
  const { data, error } = await supabase.rpc('exec_sql', { query });
  console.log(data?.[0]?.pg_get_functiondef);
}
run();
