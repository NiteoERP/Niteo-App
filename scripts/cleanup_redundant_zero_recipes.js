const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const EMPRESA_ID = '818d1555-e879-4f1d-8bed-39eb466aa5e3';

async function cleanup() {
  const { data: recs } = await supabase.from('recetas')
    .select('id, producto_id, cantidad_necesaria')
    .eq('empresa_id', EMPRESA_ID);

  const byProd = new Map();
  recs.forEach(r => {
    if (!byProd.has(r.producto_id)) byProd.set(r.producto_id, []);
    byProd.get(r.producto_id).push(r);
  });

  let deletedCount = 0;
  for (const [prodId, list] of byProd.entries()) {
    const hasRealQuantities = list.some(r => r.cantidad_necesaria > 0);
    if (hasRealQuantities) {
      // Find 0 quantity entries that are redundant
      const zeros = list.filter(r => r.cantidad_necesaria === 0);
      for (const z of zeros) {
        await supabase.from('recetas').delete().eq('id', z.id);
        deletedCount++;
      }
    }
  }

  console.log(`Eliminados ${deletedCount} ingredientes redundantes con cantidad 0 de productos que ya tienen receta real.`);
}
cleanup().catch(console.error);
