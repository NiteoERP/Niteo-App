const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data } = await supabase
    .from('directorio_clientes')
    .select('id, nombre')
    .ilike('nombre', '%ELIZA%');
  
  console.log("Clientes:", data);
}

test();
