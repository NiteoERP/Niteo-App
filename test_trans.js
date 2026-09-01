require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('cierres_caja').select('id').limit(1);
  console.log('cierre:', data);
  
  if (data && data.length > 0) {
    const res = await supabase.from('cierres_transacciones').insert([{
        cierre_id: data[0].id,
        metodo: 'Pago Móvil',
        banco: 'Banesco',
        referencia: '1234',
        monto: 100,
        moneda: 'VES'
    }]);
    console.log('Insert transacciones result:', res.error);
  }
}
run();
