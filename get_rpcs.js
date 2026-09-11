require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

supabase.rpc('exec_sql', {query: "SELECT proname, prosrc FROM pg_proc WHERE proname LIKE 'sync_%'"})
  .then(r => {
    if (r.error) console.error("Error:", r.error);
    else console.log(JSON.stringify(r.data, null, 2));
  });
