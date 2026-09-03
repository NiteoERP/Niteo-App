require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: profile } = await supabase.from('perfiles').select('id, empresa_id').limit(1).single();
  
  const { data: nuevoCierre, error: errorCierre } = await supabase
      .from('cierres_caja')
      .insert({
        empresa_id: profile.empresa_id,
        sede_id: 'b42d7e13-bfc8-40d8-94d4-61908ff269cd',
        usuario_id: profile.id,
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
      })
      .select('id')
      .single();
      
  console.log('Error Cierre:', errorCierre);
  
  if (nuevoCierre) {
     const { error: errorTransacciones } = await supabase
        .from('cierres_transacciones')
        .insert([{
            cierre_id: nuevoCierre.id,
            metodo: 'Pago Móvil',
            banco: 'Banesco',
            referencia: '1234',
            monto: 100,
            moneda: 'VES'
        }]);
     console.log('Error Transacciones:', errorTransacciones);
  }
}
run();
