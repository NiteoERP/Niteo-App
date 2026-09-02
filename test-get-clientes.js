const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // get an empresa id
  const { data: emp } = await supabase.from('empresas').select('id').limit(1).single();
  console.log("empresa:", emp.id);

  const { data, error } = await supabase.rpc('get_clientes_con_deuda', {
    p_empresa_id: emp.id,
    p_fecha_inicio: '2020-01-01',
    p_fecha_fin: '2030-01-01'
  });
  console.log("Error:", error);
  console.log("Data length:", data?.length);
  if (data?.length > 0) console.log("First:", data[0]);
}
run();
