require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: insumos, error: insErr } = await supabase.from('inventario_insumos').select('*').limit(5);
  console.log("Insumos:", insumos, insErr);

  const { data: movs, error: movErr } = await supabase.from('movimientos_inventario').select('*').order('created_at', { ascending: false }).limit(5);
  console.log("Movimientos:", movs, movErr);
}
check();
