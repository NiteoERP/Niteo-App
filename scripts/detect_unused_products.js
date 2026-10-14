const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const EMPRESA_ID = '818d1555-e879-4f1d-8bed-39eb466aa5e3';

async function main() {
  console.log('=== ANALIZANDO PRODUCTOS USADOS VS NO USADOS EN PELUCHE ===\n');

  // 1. Fetch all products of Peluche
  const { data: prods, error: pErr } = await supabase.from('productos')
    .select('id, nombre, precio_venta, categoria_id, estado_activo, sede_id, updated_at')
    .eq('empresa_id', EMPRESA_ID);

  if (pErr) throw pErr;
  console.log(`Total productos en catálogo de Peluche: ${prods.length}`);

  // 2. Fetch sales activity from ventas_detalles for Peluche
  console.log('Consultando ventas históricas en ventas_detalles...');
  let from = 0;
  const batchSize = 1000;
  const salesCountByProd = new Map();

  while (true) {
    const { data: batch, error: vErr } = await supabase.from('ventas_detalles')
      .select('producto_id, cantidad')
      .eq('empresa_id', EMPRESA_ID)
      .not('producto_id', 'is', null)
      .range(from, from + batchSize - 1);

    if (vErr) {
      console.error('Error fetching ventas_detalles batch:', vErr.message);
      break;
    }
    if (!batch || batch.length === 0) break;

    for (const v of batch) {
      const pId = v.producto_id;
      salesCountByProd.set(pId, (salesCountByProd.get(pId) || 0) + Number(v.cantidad || 1));
    }

    if (batch.length < batchSize) break;
    from += batchSize;
  }

  console.log(`Productos que registran ventas en ventas_detalles: ${salesCountByProd.size}`);

  // 3. Classify products
  const zeroSales = [];
  const withSales = [];

  for (const p of prods) {
    const totalSold = salesCountByProd.get(p.id) || 0;

    if (totalSold === 0) {
      zeroSales.push({ ...p, totalSold: 0 });
    } else {
      withSales.push({ ...p, totalSold });
    }
  }

  console.log(`\nProductos con 0 ventas registradas: ${zeroSales.length}`);
  console.log(`Productos con ventas registradas: ${withSales.length}`);

  // Classify zero sales
  const zeroGroups = {
    'Promociones y Combos Antiguos / Descontinuados': [],
    'Variantes de Pizzas Sin Ventas': [],
    'Bebidas / Licores Sin Ventas': [],
    'Adicionales y Contornos Sin Ventas': [],
    'Almuerzos o Platos de Trabajador Sin Ventas': [],
    'Otros Platos Sin Ventas': []
  };

  for (const p of zeroSales) {
    const n = p.nombre.toUpperCase();
    if (n.includes('SEMANA SANTA') || n.includes('BLACK FRIDAY') || n.includes('CUPON') || n.includes('CUMPLEAÑOS') || n.includes('OHANA') || n.includes('DIPLOMA') || n.includes('PROMO') || n.includes('COMBO')) {
      zeroGroups['Promociones y Combos Antiguos / Descontinuados'].push(p);
    } else if (n.includes('PIZZA') || n.includes('CALZONE')) {
      zeroGroups['Variantes de Pizzas Sin Ventas'].push(p);
    } else if (n.includes('REFRESCO') || n.includes('CERVEZA') || n.includes('RON') || n.includes('WHISKY') || n.includes('VINO') || n.includes('AGUA') || n.includes('BALDE')) {
      zeroGroups['Bebidas / Licores Sin Ventas'].push(p);
    } else if (n.includes('TRAB') || n.includes('EMPLEADO')) {
      zeroGroups['Almuerzos o Platos de Trabajador Sin Ventas'].push(p);
    } else if (n.includes('ADICIONAL') || n.includes('EXTRA') || n.includes('PORCION') || n.includes('SALSA')) {
      zeroGroups['Adicionales y Contornos Sin Ventas'].push(p);
    } else {
      zeroGroups['Otros Platos Sin Ventas'].push(p);
    }
  }

  fs.writeFileSync(path.join(__dirname, 'unused_products_analysis.json'), JSON.stringify({
    totalProds: prods.length,
    zeroSalesCount: zeroSales.length,
    withSalesCount: withSales.length,
    zeroGroups,
    zeroSalesList: zeroSales
  }, null, 2));

  console.log('\n--- RESUMEN POR CATEGORÍAS DE PRODUCTOS SIN VENTAS ---');
  for (const [grp, list] of Object.entries(zeroGroups)) {
    console.log(`\n=== ${grp} (${list.length}) ===`);
    list.slice(0, 10).forEach(p => console.log(`  - [${p.nombre}] ($${p.precio_venta})`));
    if (list.length > 10) console.log(`    ... y ${list.length - 10} más.`);
  }
}

main().catch(console.error);
