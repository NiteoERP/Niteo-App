const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const empId = '818d1555-e879-4f1d-8bed-39eb466aa5e3';

  console.log("Testing GR...");
  const res1 = await supabase.from('inventario_insumos').insert({
    empresa_id: empId,
    nombre: 'TEST GR',
    unidad_medida: 'GR',
    costo_promedio: 1,
    cantidad_actual: 1
  });
  console.log("GR Error:", res1.error?.message);

  console.log("Testing g...");
  const res2 = await supabase.from('inventario_insumos').insert({
    empresa_id: empId,
    nombre: 'TEST g',
    unidad_medida: 'g',
    costo_promedio: 1,
    cantidad_actual: 1
  });
  console.log("g Error:", res2.error?.message);
}
run();
