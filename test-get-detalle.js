const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const empId = '818d1555-e879-4f1d-8bed-39eb466aa5e3';
  const cliId = '058a152b-47b8-464c-9fa3-75b9955cafac';

  const { data, error } = await supabase.rpc('get_detalle_deuda_cliente', {
    p_empresa_id: empId,
    p_cliente_id: cliId,
    p_sede_id: null
  });
  console.log("Error:", error);
  console.log("Data length:", data?.length);
  if (data?.length > 0) console.log("First:", data[0]);
}
run();
