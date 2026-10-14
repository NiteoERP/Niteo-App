const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const EMPRESA_ID = '818d1555-e879-4f1d-8bed-39eb466aa5e3'; // El Peluche
const SEDE_ID = 'b42d7e13-bfc8-40d8-94d4-61908ff269cd'; // Sede AV 32

function cleanIngredientName(raw) {
  if (!raw) return '';
  let s = raw.trim();
  // Remove leading quantities, bullets, numbers
  s = s.replace(/^[0-9\.\,\-\+\*\•\/\(\)]+\s*(gr|kg|ml|lt|g|l|unidades|uds|piezas|unidad)?\s*/i, '');
  // Remove trailing dots, commas, parenthesis
  s = s.replace(/[\.\,\:\;]+$/, '').trim();
  // Filter out noise or phrases that are not ingredients
  if (s.length < 3) return '';
  if (/^(incluye|servido|opcion|opcional|a escoger|gratis|caja|adicional|combo|cada|tipo|salsas?|vaso|tapa|delivery)/i.test(s)) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function parseIngredients(text) {
  if (!text) return [];
  // Split by commas, plus signs, newlines, semicolons, bullets
  const parts = text.split(/[,+\n\r•;]|\s+y\s+/i);
  const result = [];
  const seen = new Set();
  for (const p of parts) {
    const cleaned = cleanIngredientName(p);
    if (cleaned && !seen.has(cleaned.toLowerCase())) {
      seen.add(cleaned.toLowerCase());
      result.push(cleaned);
    }
  }
  return result;
}

async function run() {
  console.log('--- INICIANDO VINCULACIÓN DE INSUMOS Y RECETAS (CANTIDAD 0) ---');

  // 1. Fetch existing insumos
  const { data: dbInsumos, error: insErr } = await supabase.from('inventario_insumos')
    .select('id, nombre')
    .eq('empresa_id', EMPRESA_ID);

  if (insErr) {
    console.error('Error al cargar insumos:', insErr);
    return;
  }

  const insumoMap = new Map();
  dbInsumos.forEach(i => insumoMap.set(i.nombre.trim().toLowerCase(), i.id));
  console.log(`Insumos existentes en BD para Peluche: ${dbInsumos.length}`);

  // 2. Fetch existing recetas
  const { data: dbRecetas, error: recErr } = await supabase.from('recetas')
    .select('producto_id, insumo_id')
    .eq('empresa_id', EMPRESA_ID);

  if (recErr) {
    console.error('Error al cargar recetas:', recErr);
    return;
  }

  const recetaSet = new Set();
  dbRecetas.forEach(r => recetaSet.add(`${r.producto_id}:${r.insumo_id}`));
  console.log(`Recetas existentes en BD para Peluche: ${dbRecetas.length}`);

  // 3. Fetch elaborated products (non-combos)
  const { data: prods, error: prodErr } = await supabase.from('productos')
    .select('id, nombre, descripcion, notas_preparacion, es_compuesto')
    .eq('empresa_id', EMPRESA_ID)
    .eq('es_compuesto', true);

  if (prodErr) {
    console.error('Error al cargar productos:', prodErr);
    return;
  }

  // Filter out combos (combos have non-empty notas_preparacion)
  const regularDishes = prods.filter(p => !p.notas_preparacion || p.notas_preparacion.length === 0);
  console.log(`Platos elaborados regulares (no combos): ${regularDishes.length}`);

  let insumosCreated = 0;
  let recetasCreated = 0;

  for (const prod of regularDishes) {
    if (!prod.descripcion) continue;
    const ingredients = parseIngredients(prod.descripcion);
    if (ingredients.length === 0) continue;

    for (const ing of ingredients) {
      const ingLower = ing.toLowerCase();
      let insumoId = insumoMap.get(ingLower);

      if (!insumoId) {
        // Create insumo
        const { data: newIns, error: createInsErr } = await supabase.from('inventario_insumos')
          .insert({
            empresa_id: EMPRESA_ID,
            sede_id: SEDE_ID,
            nombre: ing,
            unidad_medida: 'Und',
            cantidad_actual: 0,
            costo_promedio: 0,
            categoria: 'General'
          })
          .select('id')
          .single();

        if (createInsErr) {
          console.error(`Error creando insumo "${ing}":`, createInsErr.message);
          continue;
        }

        insumoId = newIns.id;
        insumoMap.set(ingLower, insumoId);
        insumosCreated++;
      }

      // Check if receta exists
      const key = `${prod.id}:${insumoId}`;
      if (!recetaSet.has(key)) {
        const { error: insertRecErr } = await supabase.from('recetas')
          .insert({
            empresa_id: EMPRESA_ID,
            producto_id: prod.id,
            insumo_id: insumoId,
            cantidad_necesaria: 0,
            unidad_medida: 'Und'
          });

        if (insertRecErr) {
          console.error(`Error vinculando receta para [${prod.nombre}] -> [${ing}]:`, insertRecErr.message);
        } else {
          recetaSet.add(key);
          recetasCreated++;
        }
      }
    }
  }

  console.log('\n=== RESULTADO FINAL DE VINCULACIÓN ===');
  console.log(`Nuevos insumos registrados en inventario_insumos: ${insumosCreated}`);
  console.log(`Nuevas recetas vinculadas en recetas (cantidad 0): ${recetasCreated}`);
  console.log('Proceso completado.');
}

run().catch(console.error);
