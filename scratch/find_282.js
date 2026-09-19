const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('compras_facturas').select('id, total, sede_id, concepto, sedes(nombre_sede)').eq('total', 282.07);
  console.log('facturas 282.07:', data);
  const { data: punt } = await supabase.from('compras_puntuales').select('id, monto_divisas, id_sede, detalles').eq('monto_divisas', 282.07);
  console.log('puntuales 282.07:', punt);
}
run();
