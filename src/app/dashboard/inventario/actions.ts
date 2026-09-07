'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createInsumo(empresaId: string, sedeId: string, nombre: string, unidad_medida: string, costo_promedio: number, cantidad_actual: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase.from('inventario_insumos').insert([{ empresa_id: empresaId, sede_id: sedeId, nombre, unidad_medida, costo_promedio, cantidad_actual }]).select().single();
  if (error) return { success: false, error: error.message };
  
  // Registrar movimiento si hay cantidad inicial
  if (data && cantidad_actual > 0 && user) {
    await supabase.from('movimientos_inventario').insert({
      empresa_id: empresaId,
      insumo_id: data.id,
      usuario_id: user.id,
      tipo_movimiento: 'ENTRADA',
      cantidad: cantidad_actual,
      costo_perdido: 0,
      motivo: 'STOCK_INICIAL',
      fecha_movimiento: new Date().toISOString(),
    });
  }
  
  revalidatePath('/dashboard/inventario');
  return { success: true, data };
}

export async function deleteInsumo(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('inventario_insumos').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  revalidatePath('/dashboard/inventario');
  return { success: true };
}

export async function updateProducto(productoId: string, descripcion: string, es_compuesto: boolean, estado_activo: boolean = true) {
  const supabase = await createClient();
  const { error } = await supabase.from('productos').update({ descripcion, es_compuesto, estado_activo }).eq('id', productoId);
  if (error) return { success: false, error: error.message };
  revalidatePath('/dashboard/inventario');
  return { success: true };
}

export async function addInsumoToReceta(empresaId: string, productoId: string, itemId: string, tipo: 'insumo' | 'producto', cantidad: number) {
  const supabase = await createClient();
  const payload = {
    empresa_id: empresaId,
    producto_id: productoId,
    cantidad_necesaria: cantidad,
    insumo_id: tipo === 'insumo' ? itemId : null,
    subproducto_id: tipo === 'producto' ? itemId : null,
  };
  
  const { error } = await supabase.from('recetas').insert([payload]);
  if (error) return { success: false, error: error.message };
  revalidatePath('/dashboard/inventario');
  return { success: true };
}

export async function removeInsumoFromReceta(recetaId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('recetas').delete().eq('id', recetaId);
  if (error) return { success: false, error: error.message };
  revalidatePath('/dashboard/inventario');
  return { success: true };
}

export async function ajustarInventarioBatch(
  empresaId: string,
  sedeId: string,
  adjustments: { id: string; cantidad_actual: number; cantidad_anterior: number }[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let hasError = false;

  for (const adj of adjustments) {
    // 1. Actualizar la cantidad en inventario
    const { error } = await supabase
      .from('inventario_insumos')
      .update({ cantidad_actual: adj.cantidad_actual })
      .eq('id', adj.id)
      .eq('empresa_id', empresaId)
      .eq('sede_id', sedeId);

    if (error) {
      console.error(error);
      hasError = true;
      continue;
    }

    // 2. Registrar el movimiento del ajuste
    if (user) {
      const diff = adj.cantidad_actual - adj.cantidad_anterior;
      const tipoMov = diff >= 0 ? 'ENTRADA' : 'SALIDA';

      await supabase.from('movimientos_inventario').insert({
        empresa_id: empresaId,
        insumo_id: adj.id,
        usuario_id: user.id,
        tipo_movimiento: tipoMov,
        cantidad: Math.abs(diff),
        costo_perdido: 0,
        motivo: 'AJUSTE_INVENTARIO',
        fecha_movimiento: new Date().toISOString(),
      });
    }
  }

  revalidatePath('/dashboard/inventario');
  return { success: !hasError };
}

export async function getMovimientosInventario(empresaId: string, sedeId?: string) {
  const supabase = await createClient();

  let query = supabase
    .from('movimientos_inventario')
    .select('*, inventario_insumos(nombre, unidad_medida, sede_id)')
    .eq('empresa_id', empresaId)
    .order('fecha_movimiento', { ascending: false })
    .limit(200);

  const { data, error } = await query;
  if (error) return [];

  // Fetch user names separately (no FK relationship)
  const userIds = [...new Set((data || []).map((m: any) => m.usuario_id).filter(Boolean))];
  let userMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: perfiles } = await supabase.from('perfiles').select('id, nombre_completo').in('id', userIds);
    if (perfiles) {
      perfiles.forEach((p: any) => { userMap[p.id] = p.nombre_completo; });
    }
  }

  return (data || [])
    .filter((m: any) => !sedeId || m.inventario_insumos?.sede_id === sedeId)
    .map((m: any) => ({
      ...m,
      insumo_nombre: m.inventario_insumos?.nombre || 'Insumo eliminado',
      insumo_unidad: m.inventario_insumos?.unidad_medida || '',
      operador_nombre: userMap[m.usuario_id] || 'Sistema',
    }));
}
