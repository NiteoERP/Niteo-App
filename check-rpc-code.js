const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const empId = '818d1555-e879-4f1d-8bed-39eb466aa5e3';
  
  console.log("Fetching get_clientes_con_deuda with 2000-01-01...");
  let res1 = await supabase.rpc('get_clientes_con_deuda', { p_empresa_id: empId, p_fecha_inicio: '2000-01-01', p_fecha_fin: '2100-01-01' });
  console.log("length:", res1.data?.length);
  
  console.log("Fetching get_clientes_con_deuda with today...");
  let res2 = await supabase.rpc('get_clientes_con_deuda', { p_empresa_id: empId, p_fecha_inicio: new Date().toISOString(), p_fecha_fin: new Date().toISOString() });
  console.log("length:", res2.data?.length);

}
run();
