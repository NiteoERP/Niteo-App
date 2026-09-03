const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await supabase.from('compras_puntuales').select('*').order('fecha_registro', { ascending: false }).limit(5);
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
