require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: cols } = await supabase.rpc('exec_sql', {
    query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pos_cuentas_abiertas'"
  });
  console.log('--- COLUMNAS pos_cuentas_abiertas ---');
  console.table(cols);

  const { data: ultimasCuentas } = await supabase
    .from('pos_cuentas_abiertas')
    .select('*')
    .order('actualizado_en', { ascending: false })
    .limit(3);
  console.log('--- ULTIMAS CUENTAS ABIERTAS ---');
  console.dir(ultimasCuentas, { depth: null });
}

check().catch(console.error);
