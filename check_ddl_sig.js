require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  // Buscar usando pg_proc en lugar de information_schema
  const { data, error } = await supabase.rpc('exec_sql', {
    query: "SELECT proname, pg_get_function_arguments(oid) as args FROM pg_proc WHERE proname = 'execute_ddl'"
  });
  console.log('execute_ddl signature:', JSON.stringify(data), error?.message);
}
run();
