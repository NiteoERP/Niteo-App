const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const EMPRESA_ID = '818d1555-e879-4f1d-8bed-39eb466aa5e3';

async function main() {
  const { data: prods } = await supabase.from('productos')
    .select('id, nombre, precio_venta, categoria_id, sede_id, notas_preparacion, es_compuesto, descripcion')
    .eq('empresa_id', EMPRESA_ID);

  function normalize(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const byNorm = new Map();
  prods.forEach(p => {
    const n = normalize(p.nombre);
    if (!byNorm.has(n)) byNorm.set(n, []);
    byNorm.get(n).push(p);
  });

  const duplicateGroups = [];
  for (const [norm, list] of byNorm.entries()) {
    if (list.length > 1) {
      duplicateGroups.push({ norm, list });
    }
  }

  console.log(`Total grupos de productos duplicados: ${duplicateGroups.length}`);
  duplicateGroups.forEach(g => {
    console.log(`\nGrupo [${g.norm}] (${g.list.length} duplicados):`);
    g.list.forEach(p => {
      console.log(`  - [ID: ${p.id}] "${p.nombre}" | $${p.precio_venta} | Notas: ${JSON.stringify(p.notas_preparacion)} | Compuesto: ${p.es_compuesto}`);
    });
  });
}

main().catch(console.error);
