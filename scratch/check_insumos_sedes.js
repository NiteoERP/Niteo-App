const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: s2 } = await supabase.from('inventario_insumos').select('id, nombre, sede_id, cantidad_actual').eq('id', '9732aa11-597c-4a43-81ce-b05f48ab1b31');
  console.log('Insumo en Sede 2:', s2);

  const { data: av32 } = await supabase.from('sedes').select('id, nombre_sede').ilike('nombre_sede', '%32%');
  console.log('Sede Av 32:', av32);

  if (av32 && av32.length > 0) {
    const { data: insAv32 } = await supabase.from('inventario_insumos').select('id, nombre, sede_id, cantidad_actual').eq('sede_id', av32[0].id).ilike('nombre', '%queso%');
    console.log('Insumos queso en Av 32:', insAv32);
  }
}
run();
