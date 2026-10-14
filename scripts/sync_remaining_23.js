const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const EMPRESA_ID = '818d1555-e879-4f1d-8bed-39eb466aa5e3';
const SEDE_ID = 'b42d7e13-bfc8-40d8-94d4-61908ff269cd';

// Explicit target matching for the 23 items
const explicitTargets = [
  { extractedName: 'B.B.Q FAMILIAR', targetName: 'PIZZA BBQ FAMILIAR ' },
  { extractedName: 'B.B.Q MEDIANA', targetName: 'PIZZA BBQ MEDIANA ' },
  { extractedName: 'B.B.Q PEQUEÑA', targetName: 'PIZZA BBQ PEQUEÑA ' },
  { extractedName: 'AREPA SENCILLA', targetName: 'AREPITA CLASICA ' },
  { extractedName: 'AREPA MIXTA', targetName: 'AREPITA MIXTA ' },
  { extractedName: 'ESPECIAL PROTEÍNA', targetName: 'SALCHIPAPA ESPECIAL PROTEINA' },
  { extractedName: 'SERVICIO DE PAPAS 200GR', targetName: 'SERVICIO DE PAPA  200GR' },
  { extractedName: 'TOCINETA', targetName: 'TOCINETA P/ HAMBURGUESA' },
  { extractedName: 'AÑADE COMBO', targetName: 'ADICIONAL PAPA CON BEBIDA' },
  { extractedName: 'ECONÓMICA SENCILLA', targetName: 'HAMBURGUESA ECONOMICA SENCILLA' },
  { extractedName: 'CRISPY SENCILLA', targetName: 'HAMBURGUESA CRISPY ' },
  { extractedName: 'POLLO ESPECIAL', targetName: 'HAMBURGUESA POLLO ESPECIAL' },
  { extractedName: 'LOMITO ESPECIAL', targetName: 'HAMBURGUESA LOMITO ESPECIAL' },
  { extractedName: 'CRISPY ESPECIAL', targetName: 'HAMBURGUESA CRISPY ' },
  { extractedName: 'PERRO CALIENTE', targetName: 'PERRO SENCILLO' },
  { extractedName: 'PAN CON POLLO ESPECIAL', targetName: 'PAN CON POLLO' },
];

function cleanIngredientName(raw) {
  if (!raw) return '';
  let s = raw.trim().replace(/^[0-9\.\,\-\+\*\•\/\(\)]+\s*(gr|kg|ml|lt|g|l|unidades|uds|piezas|unidad)?\s*/i, '');
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

async function run() {
  const extracted = JSON.parse(fs.readFileSync(path.join(__dirname, 'extracted_3_new_images.json'), 'utf8'));
  const itemsMap = new Map();
  for (const [file, content] of Object.entries(extracted)) {
    const sections = Array.isArray(content) ? content : [content];
    for (const s of sections) {
      for (const p of s.productos || []) {
        itemsMap.set(p.nombre, p);
      }
    }
  }

  const { data: dbInsumos } = await supabase.from('inventario_insumos').select('id, nombre').eq('empresa_id', EMPRESA_ID);
  const insumoMap = new Map();
  (dbInsumos || []).forEach(i => insumoMap.set(i.nombre.trim().toLowerCase(), i.id));

  const { data: dbRecetas } = await supabase.from('recetas').select('producto_id, insumo_id').eq('empresa_id', EMPRESA_ID);
  const recetaSet = new Set();
  (dbRecetas || []).forEach(r => recetaSet.add(`${r.producto_id}:${r.insumo_id}`));

  for (const pair of explicitTargets) {
    const item = itemsMap.get(pair.extractedName);
    if (!item) continue;

    const { data: targetProd } = await supabase.from('productos')
      .select('id, nombre, descripcion')
      .eq('empresa_id', EMPRESA_ID)
      .eq('nombre', pair.targetName)
      .maybeSingle();

    if (!targetProd) {
      console.log('Target prod not found in DB:', pair.targetName);
      continue;
    }

    // Update product
    await supabase.from('productos').update({
      precio_venta: item.precio,
      descripcion: item.ingredientes_o_descripcion || targetProd.descripcion,
      notas_preparacion: [],
      es_compuesto: true,
      sede_id: null,
      sedes_ids: null,
      estado_activo: true,
      updated_at: new Date().toISOString()
    }).eq('id', targetProd.id);

    console.log(`Actualizado [${pair.targetName}] -> $${item.precio}`);

    if (item.ingredientes_o_descripcion) {
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
          }
        }
      }
    }
  }

  console.log('Targeted updates completed successfully.');
}

run().catch(console.error);
