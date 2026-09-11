require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

supabase.rpc('exec_sql', {query: "SELECT prosrc FROM pg_proc WHERE proname = 'procesar_despacho'"})
  .then(r => console.log(r.data[0]?.prosrc || "Not found"));
