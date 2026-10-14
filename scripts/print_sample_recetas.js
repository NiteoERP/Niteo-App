const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const EMPRESA_ID = '818d1555-e879-4f1d-8bed-39eb466aa5e3';

async function checkSampleRecetas() {
  const { data: prods } = await supabase.from('productos')
    .select('id, nombre')
    .eq('empresa_id', EMPRESA_ID)
    .in('nombre', ['PIZZA TRADICIONAL FAMILIAR', 'PIZZA SUPREMA FAMILIAR ', 'HAMBURGUESA CLASICA']);

  for (const p of prods) {
    console.log('\n=== RECETA PARA:', p.nombre, '===');
    const { data: recs } = await supabase.from('recetas')
      .select('cantidad_necesaria, unidad_medida, inventario_insumos(nombre)')
      .eq('producto_id', p.id);

    recs.forEach(r => {
      console.log(`  - ${r.inventario_insumos?.nombre}: ${r.cantidad_necesaria} ${r.unidad_medida}`);
    });
  }
}
checkSampleRecetas();
