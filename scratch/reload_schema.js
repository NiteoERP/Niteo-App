const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const createExecDDL = `
CREATE OR REPLACE FUNCTION exec_ddl(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;
NOTIFY pgrst, 'reload_schema';
`;

async function run() {
  await supabase.rpc('exec_sql', { query: createExecDDL });
  console.log("Schema reloaded.");
}
run();
