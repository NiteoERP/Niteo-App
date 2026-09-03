const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const empId = '818d1555-e879-4f1d-8bed-39eb466aa5e3';
  const { data: sede } = await supabase.from('sedes').select('id').limit(1).single();

  const testValues = ['KG', 'kg', 'g', 'ml', 'l', 'ud', 'caja', 'UND', 'G', 'L'];
  for (const v of testValues) {
    const res = await supabase.from('inventario_insumos').insert({
      empresa_id: empId,
      sede_id: sede.id,
      nombre: 'TEST ' + v,
      unidad_medida: v,
      costo_promedio: 1,
      cantidad_actual: 1
    });
    console.log(`Value ${v}:`, res.error ? "FAILED" : "SUCCESS");
    if (!res.error) {
       await supabase.from('inventario_insumos').delete().eq('nombre', 'TEST ' + v);
    }
  }
}
run();
