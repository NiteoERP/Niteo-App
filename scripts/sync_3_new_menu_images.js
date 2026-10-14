const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const EMPRESA_ID = '818d1555-e879-4f1d-8bed-39eb466aa5e3';
const SEDE_ID = 'b42d7e13-bfc8-40d8-94d4-61908ff269cd';

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

function cleanIngredientName(raw) {
  if (!raw) return '';
  let s = raw.trim();
  s = s.replace(/^[0-9\.\,\-\+\*\•\/\(\)]+\s*(gr|kg|ml|lt|g|l|unidades|uds|piezas|unidad)?\s*/i, '');
  s = s.replace(/[\.\,\:\;\(\)]+$/, '').trim();
  if (s.length < 3) return '';
  if (/^(incluye|servido|opcion|opcional|a escoger|gratis|caja|adicional|combo|cada|tipo|salsas?|vaso|tapa|delivery)/i.test(s)) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function parseIngredients(text) {
  if (!text) return [];
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

async function main() {
  console.log('=== ACTUALIZANDO CATÁLOGO CON LAS 3 IMÁGENES NUEVAS (PIZZAS Y COMIDA RÁPIDA) ===\n');

  const { data: dbProds, error: pErr } = await supabase.from('productos')
    .select('id, nombre, precio_venta, descripcion, notas_preparacion, es_compuesto, categoria_id')
    .eq('empresa_id', EMPRESA_ID)
    .eq('estado_activo', true);

  if (pErr) throw pErr;

  const dbByNorm = new Map();
  dbProds.forEach(p => {
    dbByNorm.set(normalize(p.nombre), p);
  });

  const extracted = JSON.parse(fs.readFileSync(path.join(__dirname, 'extracted_3_new_images.json'), 'utf8'));

  let matchedUpdates = 0;
  let notFound = [];

  const itemsToSync = [];
  for (const [file, content] of Object.entries(extracted)) {
    const sections = Array.isArray(content) ? content : [content];
    for (const s of sections) {
      for (const p of s.productos || []) {
        itemsToSync.push({ ...p, seccion: s.categoria_menu, archivo: file });
      }
    }
  }

  console.log(`Total elementos a sincronizar: ${itemsToSync.length}`);

  // Fetch insumos and recipes
  const { data: dbInsumos } = await supabase.from('inventario_insumos')
    .select('id, nombre')
    .eq('empresa_id', EMPRESA_ID);
  const insumoMap = new Map();
  (dbInsumos || []).forEach(i => insumoMap.set(i.nombre.trim().toLowerCase(), i.id));

  const { data: dbRecetas } = await supabase.from('recetas')
    .select('producto_id, insumo_id')
    .eq('empresa_id', EMPRESA_ID);
  const recetaSet = new Set();
  (dbRecetas || []).forEach(r => recetaSet.add(`${r.producto_id}:${r.insumo_id}`));

  let newInsumosCreated = 0;
  let newRecetasCreated = 0;

  for (const item of itemsToSync) {
    const itemNorm = normalize(item.nombre);
    // Try exact or prefix/contains matching
    let targetProd = dbByNorm.get(itemNorm);

    // If item is a pizza and lacks "PIZZA" prefix in item.nombre (e.g. "NAPOLITANA FAMILIAR")
    if (!targetProd && item.seccion.includes('PIZZA')) {
      targetProd = dbByNorm.get(normalize('PIZZA ' + item.nombre));
    }

    // Try finding by fuzzy if still not found
    if (!targetProd) {
      for (const [norm, dbP] of dbByNorm.entries()) {
        if (norm === itemNorm || (norm.includes(itemNorm) && norm.length - itemNorm.length < 7) || (itemNorm.includes(norm) && itemNorm.length - norm.length < 7)) {
          targetProd = dbP;
          break;
        }
      }
    }

    if (targetProd) {
      matchedUpdates++;
      // Update product
      const updateData = {
        precio_venta: item.precio,
        descripcion: item.ingredientes_o_descripcion || targetProd.descripcion,
        notas_preparacion: item.es_combo ? [item.contenido_combo || item.ingredientes_o_descripcion] : [],
        es_compuesto: !item.es_combo,
        sede_id: null,
        sedes_ids: null,
        estado_activo: true,
        updated_at: new Date().toISOString()
      };

      await supabase.from('productos').update(updateData).eq('id', targetProd.id);

      // Insumos and recipes for regular dishes
      if (!item.es_combo && item.ingredientes_o_descripcion) {
        const ingredients = parseIngredients(item.ingredientes_o_descripcion);
        for (const ing of ingredients) {
          const ingLower = ing.toLowerCase();
          let insId = insumoMap.get(ingLower);

          if (!insId) {
            const { data: newIns } = await supabase.from('inventario_insumos').insert({
              empresa_id: EMPRESA_ID,
              sede_id: SEDE_ID,
              nombre: ing,
              unidad_medida: 'Und',
              cantidad_actual: 0,
              costo_promedio: 0,
              categoria: 'General'
            }).select('id').single();

            if (newIns) {
              insId = newIns.id;
              insumoMap.set(ingLower, insId);
              newInsumosCreated++;
            }
          }

          if (insId) {
            const rKey = `${targetProd.id}:${insId}`;
            if (!recetaSet.has(rKey)) {
              await supabase.from('recetas').insert({
                empresa_id: EMPRESA_ID,
                producto_id: targetProd.id,
                insumo_id: insId,
                cantidad_necesaria: 0,
                unidad_medida: 'Und'
              });
              recetaSet.add(rKey);
              newRecetasCreated++;
            }
          }
        }
      }
    } else {
      notFound.push(item);
    }
  }

  console.log(`\n=== RESULTADOS DE ACTUALIZACIÓN ===`);
  console.log(`Productos originales existentes actualizados con éxito: ${matchedUpdates}`);
  console.log(`Nuevos insumos registrados en inventario: ${newInsumosCreated}`);
  console.log(`Nuevas recetas vinculadas (cantidad 0): ${newRecetasCreated}`);

  if (notFound.length > 0) {
    console.log(`\nElementos no encontrados directamente en DB (${notFound.length}):`);
    notFound.forEach(nf => console.log(`  - [${nf.nombre}] ($${nf.precio}) [Sección: ${nf.seccion}]`));
  } else {
    console.log('\n¡Todos los productos del nuevo menú fueron encontrados y actualizados en sus registros originales sin crear duplicados!');
  }
}

main().catch(console.error);
