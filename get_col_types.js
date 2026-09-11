require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

supabase.rpc('exec_sql', {query: "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE column_name = 'id_pos'"})
  .then(r => {
    console.log(JSON.stringify(r.data, null, 2));
  });
