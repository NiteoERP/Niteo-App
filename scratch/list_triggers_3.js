const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sql = `
SELECT tgname, tgenabled, pg_get_triggerdef(oid) 
FROM pg_trigger 
WHERE tgrelid = 'public.ventas_facturas'::regclass
`;

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  console.log('Result:', data, error);
}
run();
