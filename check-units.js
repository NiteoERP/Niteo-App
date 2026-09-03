const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await supabase.from('inventario_insumos').select('unidad_medida').limit(10);
  console.log("Existing units:", Array.from(new Set(data?.map(d => d.unidad_medida))));
}
run();
