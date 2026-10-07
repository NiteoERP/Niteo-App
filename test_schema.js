const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('cierres_caja')
    .select('id, fecha_cierre, sistema_total_esperado, real_efectivo_usd, real_bancos_usd, real_efectivo_bs, real_bancos_bs, tasa_cambio, diferencia_total, observaciones, editado_por, fecha_edicion, sedes(nombre_sede)')
    .limit(1);
  console.log(error ? error : JSON.stringify(data, null, 2));
}
check();
