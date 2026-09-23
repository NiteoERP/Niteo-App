require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.rpc('exec_sql', {
    query: "SELECT parameter_name, data_type FROM information_schema.parameters WHERE specific_schema='public' AND routine_name='execute_ddl'"
  });
  console.log('execute_ddl params:', JSON.stringify(data), error?.message);

  // Intentar con argumento 'ddl'
  const { data: d2, error: e2 } = await supabase.rpc('execute_ddl', { ddl: 'SELECT 1' });
  console.log('execute_ddl(ddl):', d2, e2?.message);

  // Intentar con argumento 'query'
  const { data: d3, error: e3 } = await supabase.rpc('execute_ddl', { query: 'SELECT 1' });
  console.log('execute_ddl(query):', d3, e3?.message);

  // Intentar con argumento 'statement'
  const { data: d4, error: e4 } = await supabase.rpc('execute_ddl', { statement: 'SELECT 1' });
  console.log('execute_ddl(statement):', d4, e4?.message);

  // Intentar con argumento 'p_sql'
  const { data: d5, error: e5 } = await supabase.rpc('execute_ddl', { p_sql: 'SELECT 1' });
  console.log('execute_ddl(p_sql):', d5, e5?.message);
}
run();
