'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getListasPrecios() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  const { data: userData } = await supabase
    .from('usuarios')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!userData) return { success: false, error: 'Usuario no encontrado' };

  const { data, error } = await supabase
    .from('listas_precios')
    .select('*')
    .eq('empresa_id', userData.empresa_id)
    .order('fecha_creacion', { ascending: false });

  if (error) {
    console.error('Error fetching listas de precios:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function createListaPrecio(payload: {
  nombre: string;
  tipo_calculo: string;
  porcentaje_modificador?: number;
  moneda?: string;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  const { data: userData } = await supabase
    .from('usuarios')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!userData) return { success: false, error: 'Usuario no encontrado' };

  const { data, error } = await supabase
    .from('listas_precios')
    .insert([{
      empresa_id: userData.empresa_id,
      nombre: payload.nombre,
      tipo_calculo: payload.tipo_calculo,
      porcentaje_modificador: payload.porcentaje_modificador || 0,
      moneda: payload.moneda || 'USD',
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating lista precio:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/configuracion/listas-precios');
  return { success: true, data };
}

export async function updateListaPrecio(id: string, payload: {
  nombre: string;
  tipo_calculo: string;
  porcentaje_modificador?: number;
  moneda?: string;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  const { data, error } = await supabase
    .from('listas_precios')
    .update({
      nombre: payload.nombre,
      tipo_calculo: payload.tipo_calculo,
      porcentaje_modificador: payload.porcentaje_modificador || 0,
      moneda: payload.moneda || 'USD',
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating lista precio:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/configuracion/listas-precios');
  return { success: true, data };
}

export async function toggleListaPrecio(id: string, estado_activo: boolean) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  const { error } = await supabase
    .from('listas_precios')
    .update({ estado_activo })
    .eq('id', id);

  if (error) {
    console.error('Error toggling lista precio:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/configuracion/listas-precios');
  return { success: true };
}

export async function deleteListaPrecio(id: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  const { error } = await supabase
    .from('listas_precios')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting lista precio:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/configuracion/listas-precios');
  return { success: true };
}

export async function getPreciosPorProducto(producto_id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  const { data, error } = await supabase
    .from('productos_precios')
    .select('lista_precio_id, precio')
    .eq('producto_id', producto_id);

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}
