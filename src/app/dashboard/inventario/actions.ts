'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createInsumo(empresaId: string, nombre: string, unidad_medida: string, costo_unitario: number, stock_actual: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('insumos').insert([{ empresa_id: empresaId, nombre, unidad_medida, costo_unitario, stock_actual }]).select().single();
  if (error) return { success: false, error: error.message };
  revalidatePath('/dashboard/inventario');
  return { success: true, data };
}

export async function deleteInsumo(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('insumos').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  revalidatePath('/dashboard/inventario');
  return { success: true };
}

export async function updateProducto(productoId: string, descripcion: string, es_compuesto: boolean) {
  const supabase = await createClient();
  // Aronium sync usually uses id_producto column if it's external, or just id. Assuming 'id_producto' per CatalogView
  const { error } = await supabase.from('productos').update({ descripcion, es_compuesto }).eq('id_producto', productoId);
  if (error) return { success: false, error: error.message };
  revalidatePath('/dashboard/inventario');
  return { success: true };
}

export async function addInsumoToReceta(empresaId: string, productoId: string, insumoId: string, cantidad: number) {
  const supabase = await createClient();
  const { error } = await supabase.from('recetas').insert([{ empresa_id: empresaId, producto_id: productoId, insumo_id: insumoId, cantidad_necesaria: cantidad }]);
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
