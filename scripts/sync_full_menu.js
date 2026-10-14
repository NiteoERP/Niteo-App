const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const EMPRESA_ID = '818d1555-e879-4f1d-8bed-39eb466aa5e3'; // El Peluche

// Categories in DB for Peluche:
const CAT_PIZZERIA = '7709a718-c1e4-4590-8c21-027c74e95668';
const CAT_BARRA = '7fb8514f-4c08-4913-8b4d-d826e3087f38';

const STOPWORDS = new Set(['de', 'con', 'y', 'la', 'el', 'en', 'los', 'las', 'por', 'a', 'un', 'una', 'del', 'para', 'al', 'o', 'gr', 'kg', 'uds', 'und']);

function normalizeTokens(str) {
  if (!str) return [];
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0 && !STOPWORDS.has(t));
}

function normalize(str) {
  return normalizeTokens(str).join(' ');
}

function tokenSimilarity(s1, s2) {
  const set1 = new Set(normalizeTokens(s1));
  const set2 = new Set(normalizeTokens(s2));
  if (set1.size === 0 || set2.size === 0) return 0;
  let intersection = 0;
  for (const t of set1) {
    if (set2.has(t)) intersection++;
  }
  const union = new Set([...set1, ...set2]).size;
  return intersection / union;
}

// Clean and extract ingredients list from text
function parseIngredients(text) {
  if (!text) return [];
  return text
    .split(/[,+\n\r•\-\/]/)
    .map(s => s.trim().replace(/^[\d\.]+\s*(gr|kg|ml|lt|g|l|unidades|uds|piezas)?\s*/i, '').trim())
    .filter(s => s.length > 2 && !/^(incluye|servido|opcion|opcional|a escoger|gratis|caja)/i.test(s));
}

async function prepareSyncData() {
  const menuItems = JSON.parse(fs.readFileSync(path.join(__dirname, 'parsed_menu_items.json'), 'utf8'));
  const dbProds = JSON.parse(fs.readFileSync(path.join(__dirname, 'db_existing_prods.json'), 'utf8'));

  // Deduplicate menuItems by normalized name
  const seenMenu = new Map();
  for (const item of menuItems) {
    const norm = normalize(item.nombre);
    if (seenMenu.has(norm)) {
      const existing = seenMenu.get(norm);
      if ((item.ingredientes_o_descripcion && !existing.ingredientes_o_descripcion) || (item.contenido_combo && !existing.contenido_combo)) {
        seenMenu.set(norm, item);
      }
      continue;
    }
    seenMenu.set(norm, item);
  }
  const uniqueItems = Array.from(seenMenu.values());

  const actions = [];

  for (const item of uniqueItems) {
    const itemNorm = normalize(item.nombre);
    const itemUpper = item.nombre.trim().toUpperCase();

    let bestMatch = null;
    let bestScore = 0;

    for (const dbP of dbProds) {
      const dbNorm = normalize(dbP.nombre);
      const dbUpper = dbP.nombre.trim().toUpperCase();

      if (itemUpper === dbUpper || itemNorm === dbNorm) {
        bestMatch = dbP;
        bestScore = 1.0;
        break;
      }

      let score = tokenSimilarity(item.nombre, dbP.nombre);
      const priceDiff = Math.abs(item.precio - (dbP.precio_venta || 0));

      if (score >= 0.5) {
        if (priceDiff === 0) score += 0.25;
        else if (priceDiff <= 1.5) score += 0.1;
        else if (priceDiff > 5) score -= 0.35;
      }

      const itemDesc = (item.ingredientes_o_descripcion || '') + ' ' + (item.contenido_combo || '') + ' ' + item.nombre;
      const dbName = dbP.nombre.toLowerCase();
      if (dbName.includes('pizza') && itemDesc.toLowerCase().includes('pizza')) score += 0.15;
      if ((dbName.includes('cerveza') || dbName.includes('balde')) && (itemDesc.toLowerCase().includes('cerveza') || itemDesc.toLowerCase().includes('balde'))) score += 0.15;
      if (dbName.includes('burger') || dbName.includes('hamburguesa')) {
        if (item.seccion.toLowerCase().includes('burger') || itemDesc.toLowerCase().includes('hamburguesa')) score += 0.15;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = dbP;
      }
    }

    const isMatch = bestScore >= 0.70;
    const isDrink = /coctel|bebida|cerveza|balde|whisky|vino|trago|shot/i.test(item.seccion + ' ' + item.nombre);
    const categoriaId = isDrink ? CAT_BARRA : CAT_PIZZERIA;

    // Rules from user:
    // Regular dishes: Put ingredients/details into `descripcion` (NOT in `notas_preparacion`).
    // Combos: Put what the combo includes into `notas_preparacion` (kitchen notes).
    let descripcion = item.ingredientes_o_descripcion || item.nombre;
    let notasPreparacion = [];

    if (item.es_combo) {
      const comboText = item.contenido_combo || item.ingredientes_o_descripcion || item.nombre;
      notasPreparacion = [comboText];
      descripcion = comboText;
    } else {
      notasPreparacion = [];
    }

    if (isMatch && bestMatch) {
      actions.push({
        type: 'UPDATE',
        productId: bestMatch.id,
        nombreActual: bestMatch.nombre,
        nombreNuevo: bestMatch.nombre, // Preserve current name or update if appropriate
        precioNuevo: item.precio,
        precioAnterior: bestMatch.precio_venta,
        descripcion,
        notasPreparacion,
        esCompuesto: !item.es_combo, // Regular dishes are compuesto
        categoriaId: bestMatch.categoria_id || categoriaId,
        esCombo: item.es_combo,
        rawItem: item
      });
    } else {
      actions.push({
        type: 'INSERT',
        nombreNuevo: item.nombre,
        precioNuevo: item.precio,
        descripcion,
        notasPreparacion,
        esCompuesto: !item.es_combo,
        categoriaId,
        esCombo: item.es_combo,
        rawItem: item
      });
    }
  }

  return actions;
}

async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  const actions = await prepareSyncData();

  const updates = actions.filter(a => a.type === 'UPDATE');
  const inserts = actions.filter(a => a.type === 'INSERT');

  console.log(`=== SYNC PLAN (${isDryRun ? 'DRY RUN' : 'REAL EXECUTION'}) ===`);
  console.log(`Total items to process: ${actions.length}`);
  console.log(`- Updates to existing products: ${updates.length}`);
  console.log(`- Inserts as new products: ${inserts.length}`);

  if (isDryRun) {
    console.log('\n--- SAMPLE UPDATES (5) ---');
    updates.slice(0, 5).forEach(u => {
      console.log(`[UPDATE] ${u.nombreActual}: $${u.precioAnterior} -> $${u.precioNuevo} | Combo: ${u.esCombo} | Notas: ${JSON.stringify(u.notasPreparacion)}`);
    });

    console.log('\n--- SAMPLE INSERTS (5) ---');
    inserts.slice(0, 5).forEach(i => {
      console.log(`[INSERT] ${i.nombreNuevo}: $${i.precioNuevo} | Combo: ${i.esCombo} | Notas: ${JSON.stringify(i.notasPreparacion)}`);
    });
    return;
  }

  // --- Real Execution ---
  console.log('\nEjecutando actualizaciones e inserciones en Supabase...');

  // 1. Process Updates
  let updatedCount = 0;
  for (const u of updates) {
    const { error } = await supabase.from('productos')
      .update({
        precio_venta: u.precioNuevo,
        descripcion: u.descripcion,
        notas_preparacion: u.notasPreparacion,
        es_compuesto: u.esCompuesto,
        categoria_id: u.categoriaId,
        sede_id: null,
        sedes_ids: null,
        estado_activo: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', u.productId);

    if (error) {
      console.error(`Error actualizando ${u.nombreActual}:`, error.message);
    } else {
      updatedCount++;
    }
  }
  console.log(`Actualizados ${updatedCount} productos en BD.`);

  // 2. Process Inserts
  let insertedCount = 0;
  const insertedMap = new Map();
  for (const i of inserts) {
    const { data, error } = await supabase.from('productos')
      .insert({
        empresa_id: EMPRESA_ID,
        nombre: i.nombreNuevo,
        precio_venta: i.precioNuevo,
        descripcion: i.descripcion,
        notas_preparacion: i.notasPreparacion,
        es_compuesto: i.esCompuesto,
        categoria_id: i.categoriaId,
        sede_id: null,
        sedes_ids: null,
        estado_activo: true
      })
      .select('id, nombre')
      .single();

    if (error) {
      console.error(`Error insertando ${i.nombreNuevo}:`, error.message);
    } else {
      insertedCount++;
      insertedMap.set(i.nombreNuevo, data.id);
    }
  }
  console.log(`Insertados ${insertedCount} nuevos productos en BD.`);

  // 3. Process Insumos & Recetas for regular dishes (es_compuesto = true)
  console.log('\nProcesando insumos y recetas para platos elaborados...');
  const { data: existingInsumos } = await supabase.from('inventario_insumos')
    .select('id, nombre')
    .eq('empresa_id', EMPRESA_ID);

  const insumoMap = new Map();
  (existingInsumos || []).forEach(ins => insumoMap.set(ins.nombre.trim().toLowerCase(), ins.id));

  let newInsumosCreated = 0;
  let recetasCreated = 0;

  for (const action of actions) {
    if (!action.esCompuesto) continue; // Only regular dishes get recipes

    const prodId = action.productId || insertedMap.get(action.nombreNuevo);
    if (!prodId) continue;

    const ingText = action.descripcion || '';
    const ingredients = parseIngredients(ingText);
    if (ingredients.length === 0) continue;

    for (const ing of ingredients) {
      const ingLower = ing.toLowerCase();
      let insumoId = insumoMap.get(ingLower);

      if (!insumoId) {
        // Create new insumo
        const { data: newIns, error: insErr } = await supabase.from('inventario_insumos')
          .insert({
            empresa_id: EMPRESA_ID,
            nombre: ing.charAt(0).toUpperCase() + ing.slice(1),
            unidad_medida: 'Und',
            cantidad_actual: 0,
            costo_promedio: 0,
            categoria: 'General'
          })
          .select('id')
          .single();

        if (!insErr && newIns) {
          insumoId = newIns.id;
          insumoMap.set(ingLower, insumoId);
          newInsumosCreated++;
        }
      }

      if (insumoId) {
        // Check if receta already exists
        const { data: existingReceta } = await supabase.from('recetas')
          .select('id')
          .eq('empresa_id', EMPRESA_ID)
          .eq('producto_id', prodId)
          .eq('insumo_id', insumoId)
          .maybeSingle();

        if (!existingReceta) {
          const { error: recErr } = await supabase.from('recetas')
            .insert({
              empresa_id: EMPRESA_ID,
              producto_id: prodId,
              insumo_id: insumoId,
              cantidad_necesaria: 0, // as requested: user fills manually later
              unidad_medida: 'Und'
            });

          if (!recErr) recetasCreated++;
        }
      }
    }
  }

  console.log(`Insumos creados: ${newInsumosCreated}`);
  console.log(`Recetas vinculadas (cantidad 0): ${recetasCreated}`);
  console.log('\nSincronización completada con éxito.');
}

run().catch(console.error);
