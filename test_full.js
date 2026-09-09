require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function registrarCompraInsumoJS(supabase, p_insumo_id, p_usuario_id, p_cantidad, p_costo_total) {
  const { data: insumo, error: insErr } = await supabase
    .from('inventario_insumos')
    .select('empresa_id, cantidad_actual, costo_promedio')
    .eq('id', p_insumo_id)
    .single();

  if (insErr || !insumo) return { error: insErr?.message || 'Insumo no encontrado' };

  const v_cant_actual = Number(insumo.cantidad_actual || 0);
  const v_costo_prom = Number(insumo.costo_promedio || 0);
  const v_costo_unitario = p_costo_total / p_cantidad;
  const v_nueva_cantidad = v_cant_actual + p_cantidad;
  const v_nuevo_costo = ((v_cant_actual * v_costo_prom) + (p_cantidad * v_costo_unitario)) / v_nueva_cantidad;

  const { error: movErr } = await supabase.from('movimientos_inventario').insert({
    empresa_id: insumo.empresa_id,
    insumo_id: p_insumo_id,
    usuario_id: p_usuario_id,
    tipo_movimiento: 'ENTRADA',
    cantidad: p_cantidad,
    costo_perdido: 0,
    motivo: 'AJUSTE_INVENTARIO'
  });

  if (movErr) return { error: movErr.message };

  const { error: updErr } = await supabase.from('inventario_insumos').update({
    cantidad_actual: v_nueva_cantidad,
    costo_promedio: Number(v_nuevo_costo.toFixed(4))
  }).eq('id', p_insumo_id);

  if (updErr) return { error: updErr.message };

  return { success: true };
}

async function testRegistrar() {
  const p_insumo_id = 'e9259b38-1bc7-49ab-aa87-be6d992a945e';
  const p_usuario_id = '5e536842-2136-48aa-8dce-a313a73a313f'; // diego
  
  const res = await registrarCompraInsumoJS(supabase, p_insumo_id, p_usuario_id, 3, 10);
  console.log("Result:", res);

  const { data } = await supabase.from('inventario_insumos').select('cantidad_actual').eq('id', p_insumo_id).single();
  console.log("Stock after:", data);
}
testRegistrar();
