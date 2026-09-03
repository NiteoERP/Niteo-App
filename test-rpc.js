const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const p_empresa_id = '818d1555-e879-4f1d-8bed-39eb466aa5e3';
  const { data, error } = await supabase.rpc('get_reporte_ventas_productos', {
    p_empresa_id: p_empresa_id,
    p_sede_id: null,
    p_fecha_inicio: '2020-01-01',
    p_fecha_fin: '2026-12-31'
  });
  console.log("Error:", error);
  console.log("Data sample:", data ? data.slice(0,2) : null);
}
run();
