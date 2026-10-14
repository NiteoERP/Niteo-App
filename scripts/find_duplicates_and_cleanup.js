const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const EMPRESA_ID = '818d1555-e879-4f1d-8bed-39eb466aa5e3';

async function main() {
  const { data: currentProds } = await supabase.from('productos')
    .select('id, nombre, precio_venta, descripcion, notas_preparacion, es_compuesto, categoria_id, updated_at')
    .eq('empresa_id', EMPRESA_ID);

  console.log('Total productos actuales en BD:', currentProds.length);

  const originalProds = JSON.parse(fs.readFileSync(path.join(__dirname, 'db_existing_prods.json'), 'utf8'));
  const originalIds = new Set(originalProds.map(p => p.id));
  const originalByName = new Map();
  originalProds.forEach(p => originalByName.set(p.nombre.trim().toUpperCase(), p));

  const newProds = currentProds.filter(p => !originalIds.has(p.id));
  console.log(`Productos insertados recientemente: ${newProds.length}`);

  console.log('\n--- LISTADO DE PRODUCTOS NUEVOS INSERTADOS ---');
  newProds.forEach((p, idx) => {
    console.log(`${idx + 1}. [${p.nombre}] ($${p.precio_venta}) - ID: ${p.id}`);
  });

  fs.writeFileSync(path.join(__dirname, 'recently_inserted_prods.json'), JSON.stringify(newProds, null, 2));
}

main().catch(console.error);
