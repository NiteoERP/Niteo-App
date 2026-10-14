const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const EMPRESA_ID = '818d1555-e879-4f1d-8bed-39eb466aa5e3';

async function verify() {
  console.log('====================================================');
  console.log('    VERIFICACIÓN GENERAL DEL CATÁLOGO EN SUPABASE   ');
  console.log('====================================================\n');

  // 1. Total Productos
  const { count: totalProds } = await supabase.from('productos')
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', EMPRESA_ID);

  console.log(`1. Total de Productos en El Peluche: ${totalProds}`);

  // 2. Combos vs Platos Regulares
  const { data: allProds } = await supabase.from('productos')
    .select('id, nombre, precio_venta, descripcion, notas_preparacion, es_compuesto')
    .eq('empresa_id', EMPRESA_ID);

  const combos = allProds.filter(p => p.notas_preparacion && p.notas_preparacion.length > 0);
  const regularElaborados = allProds.filter(p => p.es_compuesto && (!p.notas_preparacion || p.notas_preparacion.length === 0));

  console.log(`2. Total de Combos / Promociones con Notas de Cocina: ${combos.length}`);
  console.log(`3. Total de Platos Elaborados (con Recetas, sin notas de cocina): ${regularElaborados.length}`);

  console.log('\n--- MUESTRA DE COMBOS (Notas de Cocina listas para comanda) ---');
  combos.slice(0, 5).forEach((c, i) => {
    console.log(`${i + 1}. [${c.nombre}] ($${c.precio_venta})`);
    console.log(`   Notas Cocina: ${JSON.stringify(c.notas_preparacion)}`);
    console.log(`   Descripción: ${c.descripcion}`);
  });

  console.log('\n--- MUESTRA DE PLATOS ELABORADOS (Ingredientes en descripción, notas vacías) ---');
  regularElaborados.slice(0, 5).forEach((p, i) => {
    console.log(`${i + 1}. [${p.nombre}] ($${p.precio_venta})`);
    console.log(`   Notas Cocina: ${JSON.stringify(p.notas_preparacion)}`);
    console.log(`   Descripción: ${p.descripcion}`);
  });

  // 4. Insumos
  const { count: totalInsumos } = await supabase.from('inventario_insumos')
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', EMPRESA_ID);

  console.log(`\n4. Total de Insumos en inventario_insumos: ${totalInsumos}`);

  // 5. Recetas
  const { count: totalRecetas } = await supabase.from('recetas')
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', EMPRESA_ID);

  console.log(`5. Total de Recetas vinculadas en recetas: ${totalRecetas}`);

  // Sample Receta with its insumos
  const sampleProd = regularElaborados[0];
  if (sampleProd) {
    const { data: recData } = await supabase.from('recetas')
      .select('insumo_id, cantidad_necesaria, inventario_insumos(nombre)')
      .eq('empresa_id', EMPRESA_ID)
      .eq('producto_id', sampleProd.id);

    console.log(`\n--- RECETA DE EJEMPLO: [${sampleProd.nombre}] ---`);
    recData.forEach(r => {
      console.log(`   - Insumo: ${r.inventario_insumos?.nombre} | Cantidad: ${r.cantidad_necesaria}`);
    });
  }
}

verify().catch(console.error);
