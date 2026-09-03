require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('perfiles').select('id').limit(1);
  console.log('perfiles:', data);
  
  // let's try to insert using a valid perfiles ID
  if (data && data.length > 0) {
    const res = await supabase.from('cierres_caja').insert({
        empresa_id: '818d1555-e879-4f1d-8bed-39eb466aa5e3',
        sede_id: 'b42d7e13-bfc8-40d8-94d4-61908ff269cd',
        usuario_id: data[0].id,
        fecha_cierre: '2026-08-31',
        tasa_cambio: 36.5,
        sistema_ventas_brutas: 0,
        sistema_gastos_operativos: 0,
        sistema_total_esperado: 0,
        real_efectivo_bs: 0,
        real_efectivo_usd: 0,
        real_bancos_bs: 0,
        real_bancos_usd: 0,
        diferencia_total: 0
    });
    console.log('Insert with perfiles ID result:', res.error);
  }
}
run();
