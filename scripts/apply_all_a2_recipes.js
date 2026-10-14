const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const EMPRESA_ID = '818d1555-e879-4f1d-8bed-39eb466aa5e3';
const SEDE_ID = 'b42d7e13-bfc8-40d8-94d4-61908ff269cd';

function normalize(str) {
  if (!str) return '';
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Special alias dictionary for unmatched names
const specialAliases = {
  'pasticho de 3 kg charcutero': 'pasticho especial 3kg',
  'pasticho de 1/2 kg tradicional': 'pasticho personal',
  'pasticho de 3 kg tradicional': 'pasticho familiar 3kg',
  'pasticho de 2 kg charcutero': 'pasticho especial 2kg',
  'pasticho de 2 kg tradicional': 'pasticho tradicional 2kg',
  'pasticho de 1 kg tradicional': 'pasticho 1 kg',
  'arepita mixta pollo y lomito': 'arepita mixta',
  'borde de queso familiar': 'adicional borde de queso',
  'extra pepperoni familiar': 'adicional pepperoni',
  'extra tocineta familiar': 'adicional tocineta',
  'extra pimenton familiar': 'adicional pimenton',
  'extra maiz familiar': 'adicional maiz',
  'hamburguesa crispy con papitas': 'hamburguesa crispy',
  'patacon clasico': 'patacon clasico trab'
};

async function main() {
  console.log('=== APLICANDO RECETAS HISTÓRICAS DE A2 A SUPABASE ===\n');

  // 1. Fetch DB products
  const { data: dbProds, error: pErr } = await supabase.from('productos')
    .select('id, nombre, precio_venta')
    .eq('empresa_id', EMPRESA_ID);

  if (pErr) throw pErr;

  const dbMap = new Map();
  dbProds.forEach(p => dbMap.set(normalize(p.nombre), p));

  // 2. Fetch DB insumos
  const { data: dbInsumos } = await supabase.from('inventario_insumos')
    .select('id, nombre, unidad_medida')
    .eq('empresa_id', EMPRESA_ID);

  const insumoMap = new Map();
  (dbInsumos || []).forEach(i => insumoMap.set(normalize(i.nombre), i));

  // 3. Load A2 recipes
  const a2Recs = JSON.parse(fs.readFileSync(path.join(__dirname, 'a2_parsed_recipes.json'), 'utf8'));
  console.log(`Cargadas ${a2Recs.length} recetas de A2.`);

  let updatedProducts = 0;
  let totalRecetasInserted = 0;

  for (const r of a2Recs) {
    let norm = normalize(r.prodName);
    if (specialAliases[norm]) norm = specialAliases[norm];

    let target = dbMap.get(norm);
    if (!target) {
      for (const [dbNorm, dbP] of dbMap.entries()) {
        if (dbNorm === norm || (dbNorm.includes(norm) && dbNorm.length - norm.length < 8) || (norm.includes(dbNorm) && norm.length - dbNorm.length < 8)) {
          target = dbP;
          break;
        }
      }
    }

    if (!target) {
      console.warn(`[OMITIDO] No se encontró producto en DB para "${r.prodName}"`);
      continue;
    }

    // Mark product as elaborated
    await supabase.from('productos').update({
      es_compuesto: true,
      updated_at: new Date().toISOString()
    }).eq('id', target.id);

    updatedProducts++;

    for (const part of r.ingredientes) {
      const partNorm = normalize(part.partName);
      let insumo = insumoMap.get(partNorm);

      const isUnit = Number.isInteger(part.cantidad) && part.cantidad >= 1;
      const unit = isUnit ? 'Und' : 'Kg';

      if (!insumo) {
        // Create insumo in inventario_insumos
        const { data: newIns, error: insErr } = await supabase.from('inventario_insumos').insert({
          empresa_id: EMPRESA_ID,
          sede_id: SEDE_ID,
          nombre: part.partName,
          unidad_medida: unit,
          cantidad_actual: 0,
          costo_promedio: 0,
          categoria: 'General'
        }).select('id, nombre, unidad_medida').single();

        if (newIns) {
          insumo = newIns;
          insumoMap.set(partNorm, insumo);
        } else {
          console.error(`Error creando insumo ${part.partName}:`, insErr?.message);
          continue;
        }
      }

      // Check if receta exists
      const { data: existingRec } = await supabase.from('recetas')
        .select('id')
        .eq('empresa_id', EMPRESA_ID)
        .eq('producto_id', target.id)
        .eq('insumo_id', insumo.id)
        .maybeSingle();

      if (existingRec) {
        // Update with real quantity
        await supabase.from('recetas').update({
          cantidad_necesaria: part.cantidad,
          unidad_medida: unit
        }).eq('id', existingRec.id);
        totalRecetasInserted++;
      } else {
        // Insert new receta
        await supabase.from('recetas').insert({
          empresa_id: EMPRESA_ID,
          producto_id: target.id,
          insumo_id: insumo.id,
          cantidad_necesaria: part.cantidad,
          unidad_medida: unit
        });
        totalRecetasInserted++;
      }
    }

    console.log(`[RECETA APLICADA] "${target.nombre}" -> ${r.ingredientes.length} insumos con cantidades reales`);
  }

  console.log(`\n=== FINALIZADO ===`);
  console.log(`Total productos actualizados con recetas históricas: ${updatedProducts}`);
  console.log(`Total insumos/cantidades sincronizadas en recetas: ${totalRecetasInserted}`);
}

main().catch(console.error);
