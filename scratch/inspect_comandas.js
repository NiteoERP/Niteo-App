require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: cols } = await supabase.rpc('exec_sql', {
    query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'comandas_mesero'"
  });
  console.log('--- COLUMNAS comandas_mesero ---');
  console.table(cols);

  const { data: fn } = await supabase.rpc('exec_sql', {
    query: "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'pos_obtener_comandas_pendientes'"
  });
  console.log('--- RPC pos_obtener_comandas_pendientes ---');
  console.log(fn?.[0]?.pg_get_functiondef || 'No existe');

  const { data: ultimas } = await supabase
    .from('comandas_mesero')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);
  console.log('--- ULTIMAS 3 COMANDAS EN Supabase ---');
  console.dir(ultimas, { depth: null });
}

check().catch(console.error);
