'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createInsumo(empresaId: string, sedeId: string, nombre: string, unidad_medida: string, costo_promedio: number, cantidad_actual: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('inventario_insumos').insert([{ empresa_id: empresaId, sede_id: sedeId, nombre, unidad_medida, costo_promedio, cantidad_actual }]).select().single();
  if (error) return { success: false, error: error.message };
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

export async function ajustarInventarioBatch(empresaId: string, sedeId: string, adjustments: { id: string, cantidad_actual: number }[]) {
  const supabase = await createClient();
  let hasError = false;
  for (const adj of adjustments) {
    const { error } = await supabase
      .from('inventario_insumos')
      .update({ cantidad_actual: adj.cantidad_actual })
      .eq('id', adj.id)
      .eq('empresa_id', empresaId).eq('sede_id', sedeId);
    if (error) {
      console.error(error);
      hasError = true;
    }
  }
  revalidatePath('/dashboard/inventario');
  return { success: !hasError };
}
