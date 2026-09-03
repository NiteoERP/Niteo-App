const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const idEmpresa = '818d1555-e879-4f1d-8bed-39eb466aa5e3';
  const { data, error } = await supabase
        .from('compras_puntuales')
        .select('id, fecha_registro, proveedor, detalles, monto_divisas, tasa_cambio, monto_bs, metodo_pago, usuario_id')
        .eq('id_empresa', idEmpresa)
        .order('fecha_registro', { ascending: false })
        .limit(2);
        
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
