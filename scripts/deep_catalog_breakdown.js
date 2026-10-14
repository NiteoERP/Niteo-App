const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const EMPRESA_ID = '818d1555-e879-4f1d-8bed-39eb466aa5e3';

async function main() {
  const { data: prods } = await supabase.from('productos')
    .select('id, nombre, precio_venta, categoria_id, estado_activo')
    .eq('empresa_id', EMPRESA_ID);

  let from = 0;
  const batchSize = 1000;
  const salesMap = new Map();

  while (true) {
    const { data: batch, error } = await supabase.from('ventas_detalles')
      .select('producto_id, cantidad')
      .eq('empresa_id', EMPRESA_ID)
      .not('producto_id', 'is', null)
      .range(from, from + batchSize - 1);

    if (error || !batch || batch.length === 0) break;
    for (const v of batch) {
      salesMap.set(v.producto_id, (salesMap.get(v.producto_id) || 0) + Number(v.cantidad || 1));
    }
    if (batch.length < batchSize) break;
    from += batchSize;
  }

  const classified = prods.map(p => ({
    ...p,
    ventas: salesMap.get(p.id) || 0
  }));

  // 1. Zero sales
  const zeroSales = classified.filter(p => p.ventas === 0);

  // 2. Very low sales (<= 5 sales ever)
  const lowSales = classified.filter(p => p.ventas > 0 && p.ventas <= 5);

  // 3. Worker dishes (TRAB)
  const trabDishes = classified.filter(p => p.nombre.toUpperCase().includes('TRAB') || p.nombre.toUpperCase().includes('EMPLEADO'));

  // 4. Old seasonal promos / expired combos
  const oldPromos = classified.filter(p => {
    const n = p.nombre.toUpperCase();
    return n.includes('SEMANA SANTA') || n.includes('BLACK FRIDAY') || n.includes('CUPON') || n.includes('OHANA') || n.includes('DIPLOMA') || n.includes('CUMPLEAÑOS') || n.includes('CELEBRA');
  });

  console.log(`1. Productos con CERO ventas: ${zeroSales.length}`);
  console.log(`2. Productos con ventas mínimas (1 a 5 ventas en toda la historia): ${lowSales.length}`);
  console.log(`3. Platos de "Trabajador / TRAB": ${trabDishes.length}`);
  console.log(`4. Promos y Combos de temporadas pasadas / expiradas: ${oldPromos.length}`);

  fs.writeFileSync(path.join(__dirname, 'deep_catalog_summary.json'), JSON.stringify({
    zeroSales,
    lowSales,
    trabDishes,
    oldPromos
  }, null, 2));
}

main().catch(console.error);
