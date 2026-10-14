const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const EMPRESA_ID = '818d1555-e879-4f1d-8bed-39eb466aa5e3';

const explicitPairs = [
  // 1. Mini Pizzas
  { newName: '140 MINI PIZZAS', origName: '140 MINI PIZZAS', origId: '04c3260c-ce1a-4d32-aa77-3e8113ce0f96' },
  { newName: '70 MINI PIZZAS', origName: '70 MINI PIZZAS', origId: '5b1b4603-51bf-4c74-9582-4f2277dcf922' },

  // 2. Antipasto
  { newName: '1KG. ANTIPASTO', origName: '1 KG DE ANTIPASTO', origId: '80aa3fa4-aa04-43ea-933e-e6ec8c70fa56' },
  { newName: '250GR. ANTIPASTO', origName: '250 gr de ANTIPASTO', origId: 'f03a6162-ddba-4eb2-a08b-402264cae096' },

  // 3. Combos Navidad / Duos
  { newName: 'COMBO FAMILIAR NAVIDAD', origName: 'COMBO NAVIDAD ', origId: '6b6a6b57-6066-4122-8356-8e50337f715e' },
  { newName: '2 PASTICHOS PERSONALES + BEBIDA DE 1 LITRO', origName: 'DUO PASTICHOS PERSONALES', origId: 'a3f7f940-be7e-47dd-af10-d7b157362f66' },

  // 4. Pastichos
  { newName: 'PASTICHO TRADICIONAL 1KG', origName: 'PASTICHO 1 KG', origId: '194071fc-81fe-4ae2-9a54-ac99d8661330' },
  { newName: 'PASTICHO PERSONAL 1/2KG', origName: 'PASTICHO PERSONAL', origId: '6b81d7d2-7ecf-410a-b50a-8a1a36746ce8' },
  { newName: 'PASTICHO ESPECIAL 1KG', origName: 'PASTICHO PARA 2 ESPECIAL', origId: 'b9437ff2-520f-48d6-96fe-8b1eec1859eb' },
  { newName: 'PASTICHO TRADICIONAL 2KG', origName: 'COMBO FAMILIAR PASTICHO 2KG', origId: '9fa24fbe-6cb7-400d-9b57-f6556488d55d' },
  { newName: 'PASTICHO ESPECIAL 2KG', origName: 'COMBO FAMILIAR PASTICHO 2KG', origId: '9fa24fbe-6cb7-400d-9b57-f6556488d55d' },
  { newName: 'PASTICHO FAMILIAR 3KG', origName: 'COMO FAMILIAR PASTICHO 3KG', origId: 'b90c10ad-5a67-4ae9-a687-9d7499bb8e54' },
  { newName: 'PASTICHO ESPECIAL 3KG', origName: 'COMO FAMILIAR PASTICHO 3KG', origId: 'b90c10ad-5a67-4ae9-a687-9d7499bb8e54' },

  // 5. Hamburguesas y Perros
  { newName: 'ECONÓMICA', origName: 'HAMBURGUESA ECONOMICA SENCILLA', origId: '8249964a-f88a-4e10-acd1-852f0679d2c9' },
  { newName: 'CRISPY SENCILLA', origName: 'HAMBURGUESA CRISPY ', origId: 'a3228ef8-6506-4b3f-9682-fb83dcf97d72' },
  { newName: 'PERRO CALIENTE', origName: 'PERRO SENCILLO', origId: 'ba2ebeb3-5108-4eeb-9a39-de6cd440fa14' },
  { newName: 'PERRO', origName: 'PERRO SENCILLO', origId: 'ba2ebeb3-5108-4eeb-9a39-de6cd440fa14' },
  { newName: 'PAN CON POLLO ESPECIAL', origName: 'PAN CON POLLO', origId: 'a53c8235-bd54-4047-90c0-3f9eb70b2cb0' },

  // 6. Arepas y Patacones
  { newName: 'AREPA SENCILLA', origName: 'AREPITA CLASICA ', origId: '778f5826-e41c-4d91-b8f7-e41b0af28bba' },
  { newName: 'AREPITAS CLÁSICA', origName: 'AREPITA CLASICA ', origId: '778f5826-e41c-4d91-b8f7-e41b0af28bba' },
  { newName: 'AREPA MIXTA', origName: 'AREPITA MIXTA ', origId: '124e4142-2b36-474d-91b3-466d338be274' },
  { newName: 'AREPITAS MIXTA', origName: 'AREPITA MIXTA ', origId: '124e4142-2b36-474d-91b3-466d338be274' },
  { newName: 'AREPA 3 PROTEÍNAS', origName: 'PARRILLA 3 PROTEINAS', origId: 'b72eab29-2f9f-4172-abce-93487e2e8648' },
  { newName: 'PATACONES CLÁSICO', origName: 'PATACON CLASICO TRAB', origId: 'b1dd31df-683f-44fe-9938-4c82e207dfaf' },
  { newName: 'PATACONES MIXTO', origName: 'PATACON MIXTO ', origId: 'd3a45d53-9145-4b30-bc60-1afbd3056565' },
  { newName: 'PATACÓN 3 PROTEÍNAS', origName: 'PARRILLA 3 PROTEINAS', origId: 'b72eab29-2f9f-4172-abce-93487e2e8648' },

  // 7. Sombreros
  { newName: 'SOMBRERO CLÁSICO', origName: 'SOMBRERO 3 PROTEINAS', origId: '9b2234e6-1ad1-4c13-b193-5b2232bf8088' },
  { newName: 'SOMBRERO MIXTO', origName: 'SOMBRERO 3 PROTEINAS', origId: '9b2234e6-1ad1-4c13-b193-5b2232bf8088' },

  // 8. Pollo Broaster / Asado
  { newName: '1 POLLO (12 PIEZAS)', origName: '1 POLLO ENTERO BROASTER', origId: '5815fde5-5cbe-40ea-9868-dfc0c34e7a2d' },

  // 9. Balde
  { newName: 'BALDE DE CERVEZAS PAGA 10 LLEVA 12', origName: 'Promo Balde Feria ', origId: '00a9f4ba-15f6-4d00-89b2-a4b4ccc94ac0' },

  // 10. Combos con Papa y Bebida
  { newName: 'CLÁSICA (PAPA + BEBIDA)', origName: 'HAMBURGUESA CLASICA', origId: '9c2e3e7c-c41b-4937-b05a-131c7da9572b' },
  { newName: 'POLLO (PAPA + BEBIDA)', origName: 'HAMBURGUESA POLLO ESPECIAL', origId: '2f8edefe-a4ca-4f1d-81c8-dc10ffa4b0a9' },
  { newName: 'LOMITO (PAPA + BEBIDA)', origName: 'HAMBURGUESA LOMITO ESPECIAL', origId: '768ae70f-8c38-4e55-842c-29177a64146a' },
  { newName: 'AMERICANA (PAPA + BEBIDA)', origName: 'HAMBURGUESA AMERICANA ', origId: '55ff0513-516d-48c2-9f3c-7d557f3ce4ff' },
  { newName: 'CRISPY (PAPA + BEBIDA)', origName: 'HAMBURGUESA CRISPY ', origId: 'a3228ef8-6506-4b3f-9682-fb83dcf97d72' },
  { newName: 'AÑADE COMBO', origName: 'ADICIONAL PAPA CON BEBIDA', origId: '85bb553a-67a1-4032-89d6-c3b25a18a146' },
  { newName: 'COMBO', origName: 'ADICIONAL PAPA CON BEBIDA', origId: '85bb553a-67a1-4032-89d6-c3b25a18a146' },

  // 11. Extras y Otros
  { newName: 'MAÍZ', origName: 'ADICIONAL MAIZ', origId: 'bc5298a2-f831-4dd9-a5e1-da8340d859fa' },
  { newName: 'TOCINETA', origName: 'ADICIONAL TOCINETA', origId: '8e9778c8-2c7d-419b-b5e0-7bf984653133' },
  { newName: 'SERV. DE PAPAS', origName: 'SERVICIO DE PAPA  200GR', origId: '715f9ba4-3db8-4e77-86ce-620d3df52a91' },
  { newName: 'ESPECIAL', origName: 'LINEA ESPECIAL', origId: 'd6b7e090-e290-488d-a417-380d1e39a347' },
];

async function run() {
  console.log('=== INICIANDO CONSOLIDACIÓN Y ELIMINACIÓN DE DUPLICADOS ===\n');

  // 1. Rename combos to clearly identify them
  console.log('1. Renombrando combos para evitar ambigüedades...');
  const comboRenames = [
    {
      id: 'da9af741-ee86-4649-8960-d632b4c8790f',
      nombre: 'COMBO DUO PASTICHO NAVIDEÑO',
      descripcion: '1 Pasticho de 1 kg, Ensalada, 2 Hallacas',
      notas_preparacion: ['1 Pasticho 1kg', '2 Hallacas', 'Ensalada'],
      precio_venta: 16
    },
    {
      id: 'c58e8e29-b4b4-4759-9a4f-21a522b585f0',
      nombre: 'COMBO DUO PIZZAS FAMILIARES',
      descripcion: '2 Pizzas familiares tradicionales, 1 adicional para cada pizza, 1 bebida de 1.5LT, 1 snack, incluye caja gratis',
      notas_preparacion: ['2 Pizzas Familiares Tradicionales', '1 adicional para cada pizza', '1 bebida de 1.5LT', '1 snack', 'Caja gratis'],
      precio_venta: 27.99
    },
    {
      id: 'a3f7f940-be7e-47dd-af10-d7b157362f66',
      nombre: 'COMBO DUO PASTICHOS PERSONALES',
      descripcion: '2 pastichos personales, 1 bebida de 1 litro, adicional de queso amarillo',
      notas_preparacion: ['2 pastichos personales', '1 bebida de 1 litro', 'adicional de queso amarillo'],
      precio_venta: 13.99
    },
    {
      id: '1b543af3-7fcb-4881-bfeb-4d4397f29605',
      nombre: 'COMBO DUO HAMBURGUESAS CLASICAS',
      precio_venta: 15
    }
  ];

  for (const cr of comboRenames) {
    const updatePayload = {
      nombre: cr.nombre,
      precio_venta: cr.precio_venta,
      sede_id: null,
      sedes_ids: null,
      estado_activo: true
    };
    if (cr.descripcion) updatePayload.descripcion = cr.descripcion;
    if (cr.notas_preparacion) updatePayload.notas_preparacion = cr.notas_preparacion;

    const { error } = await supabase.from('productos').update(updatePayload).eq('id', cr.id);
    if (error) console.error(`Error renombrando ${cr.nombre}:`, error.message);
    else console.log(`  -> Actualizado: "${cr.nombre}" ($${cr.precio_venta})`);
  }

  // Desactivar combo duplicado id 0980faca-3c1d-45fb-8317-784ba5399c9a (COMBO DUO HALLACAS)
  await supabase.from('productos').update({ estado_activo: false }).eq('id', '0980faca-3c1d-45fb-8317-784ba5399c9a');

  // 2. Load the 41 new products
  const newProds = JSON.parse(fs.readFileSync(path.join(__dirname, 'recently_inserted_prods.json'), 'utf8'));
  const newMap = new Map();
  newProds.forEach(np => newMap.set(np.nombre, np));

  console.log('\n2. Transfiriendo recetas, descripción y notas a los productos originales...');
  let recipesTransferred = 0;
  let productsUpdated = 0;
  let duplicatesDeleted = 0;

  for (const pair of explicitPairs) {
    const newProd = newMap.get(pair.newName);
    if (!newProd) {
      console.warn(`No se encontró producto nuevo con nombre: ${pair.newName}`);
      continue;
    }

    const origId = pair.origId;

    // A. Transfer Recetas from newProd to origProd
    const { data: newRecetas } = await supabase.from('recetas')
      .select('*')
      .eq('producto_id', newProd.id);

    if (newRecetas && newRecetas.length > 0) {
      for (const nr of newRecetas) {
        // Check if origProd already has this insumo
        const { data: existingOrigReceta } = await supabase.from('recetas')
          .select('id')
          .eq('producto_id', origId)
          .eq('insumo_id', nr.insumo_id)
          .maybeSingle();

        if (!existingOrigReceta) {
          await supabase.from('recetas').insert({
            empresa_id: EMPRESA_ID,
            producto_id: origId,
            insumo_id: nr.insumo_id,
            cantidad_necesaria: nr.cantidad_necesaria || 0,
            unidad_medida: nr.unidad_medida || 'Und'
          });
          recipesTransferred++;
        }
      }
      // Delete recetas of newProd
      await supabase.from('recetas').delete().eq('producto_id', newProd.id);
    }

    // B. Update original product with new description, notes, and price
    const updateData = {
      sede_id: null,
      sedes_ids: null,
      estado_activo: true,
      updated_at: new Date().toISOString()
    };
    if (newProd.descripcion) updateData.descripcion = newProd.descripcion;
    if (newProd.notas_preparacion && newProd.notas_preparacion.length > 0) {
      updateData.notas_preparacion = newProd.notas_preparacion;
    }
    if (newProd.precio_venta && newProd.precio_venta > 0) {
      updateData.precio_venta = newProd.precio_venta;
    }
    if (newProd.es_compuesto !== undefined) {
      updateData.es_compuesto = newProd.es_compuesto;
    }

    const { error: updErr } = await supabase.from('productos')
      .update(updateData)
      .eq('id', origId);

    if (updErr) {
      console.error(`Error actualizando original [${pair.origName}]:`, updErr.message);
    } else {
      productsUpdated++;
    }

    // C. Delete the duplicate newProd
    const { error: delErr } = await supabase.from('productos')
      .delete()
      .eq('id', newProd.id);

    if (delErr) {
      console.error(`Error eliminando duplicado [${newProd.nombre}]:`, delErr.message);
    } else {
      duplicatesDeleted++;
    }
  }

  console.log(`\n=== RESUMEN DE CONSOLIDACIÓN ===`);
  console.log(`Recetas transferidas/aseguradas en productos originales: ${recipesTransferred}`);
  console.log(`Productos originales actualizados con recetas y descripciones: ${productsUpdated}`);
  console.log(`Productos duplicados eliminados de la base de datos: ${duplicatesDeleted}`);

  // 3. Verify total products count
  const { count: finalCount } = await supabase.from('productos')
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', EMPRESA_ID)
    .eq('estado_activo', true);

  console.log(`\nTotal de productos activos en el catálogo de Peluche: ${finalCount}`);
}

run().catch(console.error);
