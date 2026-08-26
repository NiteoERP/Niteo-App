const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.rpc('registrar_compra_insumo', {
    p_insumo_id: '00000000-0000-0000-0000-000000000000',
    p_usuario_id: '00000000-0000-0000-0000-000000000000',
    p_cantidad: 1,
    p_costo_total_usd: 1
  });
  console.log(error || data);
}
check();
