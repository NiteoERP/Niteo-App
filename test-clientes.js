const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data: profile } = await supabase.from('perfiles').select('empresa_id').limit(1).single();

  const { data, error } = await supabase.rpc('get_clientes_con_deuda', {
    p_empresa_id: profile.empresa_id,
    p_sede_id: null,
    p_fecha_inicio: '2020-01-01',
    p_fecha_fin: '2030-01-01'
  }).limit(1);
  
  console.log("Error:", error);
  console.log("Data:", data);
}

test();
