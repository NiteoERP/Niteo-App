const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('tasa_cambiaria')
    .upsert({ fecha: today, tasa_bcv: 45.00 }, { onConflict: 'fecha' })
    .select();
    
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
