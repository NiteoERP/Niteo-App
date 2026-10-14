const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const EMPRESA_ID = '818d1555-e879-4f1d-8bed-39eb466aa5e3';

function normalize(str) {
  if (!str) return '';
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function testMatch() {
  const { data: dbProds } = await supabase.from('productos')
    .select('id, nombre, precio_venta')
    .eq('empresa_id', EMPRESA_ID);

  const a2Recs = JSON.parse(fs.readFileSync(path.join(__dirname, 'a2_parsed_recipes.json'), 'utf8'));

  const dbMap = new Map();
  dbProds.forEach(p => dbMap.set(normalize(p.nombre), p));

  console.log(`=== CRUCE DE 54 RECETAS DE A2 CON PRODUCTOS DE SUPABASE ===\n`);

  let matchedCount = 0;
  let unmatchedCount = 0;

  for (const r of a2Recs) {
    const norm = normalize(r.prodName);
    let target = dbMap.get(norm);

    if (!target) {
      // Fuzzy search
      for (const [dbNorm, dbP] of dbMap.entries()) {
        if (dbNorm === norm || (dbNorm.includes(norm) && dbNorm.length - norm.length < 8) || (norm.includes(dbNorm) && norm.length - dbNorm.length < 8)) {
          target = dbP;
          break;
        }
      }
    }

    if (target) {
      matchedCount++;
      console.log(`[MATCH] A2: "${r.prodName}" <==> DB: "${target.nombre}" ($${target.precio_venta})`);
      console.log(`        Ingredientes (${r.ingredientes.length}): ${r.ingredientes.map(i => `${i.partName} (${i.cantidad})`).join(', ')}`);
    } else {
      unmatchedCount++;
      console.log(`[UNMATCHED] A2: "${r.prodName}"`);
    }
  }

  console.log(`\nTotal matched: ${matchedCount} / ${a2Recs.length}`);
  console.log(`Total unmatched: ${unmatchedCount}`);
}

testMatch().catch(console.error);
