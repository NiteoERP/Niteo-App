const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const empId = '818d1555-e879-4f1d-8bed-39eb466aa5e3';
  const sedeId = '1e19d77e-df7c-47bc-ad9b-927b508f7ce1'; // Need a valid sede_id. Let's fetch one.
  const { data: sede } = await supabase.from('sedes').select('id').limit(1).single();

  console.log("Testing GR...");
  const res1 = await supabase.from('inventario_insumos').insert({
    empresa_id: empId,
    sede_id: sede.id,
    nombre: 'TEST GR',
    unidad_medida: 'GR',
    costo_promedio: 1,
    cantidad_actual: 1
  });
  console.log("GR Error:", res1.error?.message);

  console.log("Testing Gr...");
  const res2 = await supabase.from('inventario_insumos').insert({
    empresa_id: empId,
    sede_id: sede.id,
    nombre: 'TEST Gr',
    unidad_medida: 'Gr',
    costo_promedio: 1,
    cantidad_actual: 1
  });
  console.log("Gr Error:", res2.error?.message);
}
run();
