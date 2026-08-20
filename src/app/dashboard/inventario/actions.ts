'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createInsumo(empresaId: string, nombre: string, unidad_medida: string, costo_unitario: number, stock_actual: number) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('insumos')
    .insert([{
      empresa_id: empresaId,
      nombre,
      unidad_medida,
      costo_unitario,
      stock_actual
    }])
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard/inventario');
  return { success: true, data };
}

export async function deleteInsumo(id: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('insumos')
    .delete()
    .eq('id', id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard/inventario');
  return { success: true };
}
