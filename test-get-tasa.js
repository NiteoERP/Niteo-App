const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await supabase
    .from('tasa_cambiaria')
    .select('tasa_bcv, fecha')
    .order('fecha', { ascending: false })
    .limit(1)
    .single();
    
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
