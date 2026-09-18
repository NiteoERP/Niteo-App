const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function normalizeUnidadMedida(u) {
  const clean = (u || '').trim().toLowerCase();
  if (clean === 'kg' || clean === 'kilo' || clean === 'kilogramos' || clean === 'kilogramo') return 'Kg';
  if (clean === 'gr' || clean === 'g' || clean === 'gramos' || clean === 'gramo') return 'Gr';
  if (clean === 'lt' || clean === 'l' || clean === 'litros' || clean === 'litro') return 'Lt';
  if (clean === 'ml' || clean === 'mililitros' || clean === 'mililitro') return 'Ml';
  if (clean === 'und' || clean === 'unid' || clean === 'unidad' || clean === 'unidades' || clean === 'uds' || clean === 'ud') return 'Und';
  if (clean === 'cajas' || clean === 'caja' || clean === 'cj' || clean === 'cjs') return 'Cajas';
  if (clean === 'paquetes' || clean === 'paquete' || clean === 'paq' || clean === 'paqs') return 'Paquetes';
  const exact = (u || '').trim();
  if (['Kg', 'KG', 'Gr', 'GR', 'Lt', 'LT', 'Ml', 'ML', 'Und', 'UND', 'Cajas', 'Paquetes'].includes(exact)) {
    if (exact.toUpperCase() === 'KG') return 'Kg';
    if (exact.toUpperCase() === 'GR') return 'Gr';
    if (exact.toUpperCase() === 'LT') return 'Lt';
    if (exact.toUpperCase() === 'ML') return 'Ml';
    if (exact.toUpperCase() === 'UND') return 'Und';
    return exact;
  }
  return 'Und';
}

async function run() {
  const { data: compras } = await supabase.from('compras_puntuales').select('*').order('fecha_registro', { ascending: true });
  
  let countProcessed = 0;

  for (const c of compras) {
    if (!c.detalles) continue;
    let detallesObj;
    if (typeof c.detalles === 'string' && c.detalles.startsWith('{')) {
      try { detallesObj = JSON.parse(c.detalles); } catch (e) { continue; }
    } else if (typeof c.detalles === 'object') {
      detallesObj = c.detalles;
    } else {
      continue;
    }

    if (!detallesObj.is_insumos || !detallesObj.items) continue;

    let needsUpdate = false;

    for (let i = 0; i < detallesObj.items.length; i++) {
      const item = detallesObj.items[i];
      
      if (item.insumo_id && !item.is_new) {
         const { data: e } = await supabase.from('inventario_insumos').select('id').eq('id', item.insumo_id).single();
         if (e) continue;
      }
      
      let idInsumo = null;
      let unitNorm = normalizeUnidadMedida(item.unidad_nueva);
      const nameNorm = (item.nombre_nuevo || '').trim();

      const { data: existIns } = await supabase
         .from('inventario_insumos')
         .select('id, cantidad_actual, costo_promedio')
         .eq('empresa_id', c.id_empresa)
         .eq('sede_id', c.id_sede)
         .ilike('nombre', nameNorm)
         .maybeSingle();

      if (existIns?.id) {
        idInsumo = existIns.id;
      } else {
        console.log('  Creating insumo: ' + nameNorm + ' (' + unitNorm + ')');
        const { data: newIns, error: insErr } = await supabase.from('inventario_insumos').insert({
          empresa_id: c.id_empresa,
          sede_id: c.id_sede,
          nombre: nameNorm,
          unidad_medida: unitNorm,
          cantidad_actual: 0,
          costo_promedio: 0
        }).select('id').single();
        if (insErr) {
          console.error('  Error al crear insumo:', insErr.message);
          continue;
        }
        idInsumo = newIns.id;
      }

      const { data: insumo } = await supabase.from('inventario_insumos').select('cantidad_actual, costo_promedio').eq('id', idInsumo).single();
      const oldCant = Number(insumo.cantidad_actual || 0);
      const oldCost = Number(insumo.costo_promedio || 0);
      
      let usd = item.costoTotal;
      if (detallesObj.monedaOriginal === 'VES') {
         usd = usd / (detallesObj.tasaCambio || 1);
      }
      const unitCost = usd / item.cantidad;
      
      const newCant = oldCant + item.cantidad;
      const newCost = newCant > 0 ? ((oldCant * oldCost) + usd) / newCant : unitCost;

      console.log('  -> Moving ' + nameNorm + ' +' + item.cantidad + ' (New Stock: ' + newCant + ', Avg: ' + newCost + ')');

      await supabase.from('movimientos_inventario').insert({
        empresa_id: c.id_empresa,
        insumo_id: idInsumo,
        usuario_id: c.usuario_id,
        tipo_movimiento: 'ENTRADA',
        cantidad: item.cantidad,
        costo_perdido: usd,
        motivo: 'COMPRA',
        fecha_movimiento: c.fecha_registro
      });

      await supabase.from('inventario_insumos').update({
        cantidad_actual: newCant,
        costo_promedio: newCost
      }).eq('id', idInsumo);

      item.insumo_id = idInsumo;
      item.is_new = false;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await supabase.from('compras_puntuales').update({ detalles: JSON.stringify(detallesObj) }).eq('id', c.id);
      console.log('  Updated compras_puntuales details.');
      countProcessed++;
    }
  }

  console.log('Reconciliation complete. Processed ' + countProcessed + ' compras.');
}

run();
