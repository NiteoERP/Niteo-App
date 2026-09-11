'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
  if (perfil?.rol !== 'SUPERADMIN') throw new Error('Sin permisos');
  return { supabase };
}

export async function getMetodosPago() {
  const { supabase } = await requireSuperAdmin();
  const { data, error } = await supabase
    .from('niteo_metodos_pago')
    .select('*')
    .order('orden');
  if (error) return { success: false, error: error.message, metodos: [] };
  return { success: true, metodos: data || [] };
}

export async function upsertMetodoPago(metodo: {
  id?: string;
  tipo: string;
  nombre: string;
  activo: boolean;
  datos: Record<string, string>;
  instrucciones: string;
  orden: number;
}) {
  try {
    const { supabase } = await requireSuperAdmin();

    if (metodo.id) {
      const { error } = await supabase
        .from('niteo_metodos_pago')
        .update({
          nombre: metodo.nombre,
          activo: metodo.activo,
          datos: metodo.datos,
          instrucciones: metodo.instrucciones,
          orden: metodo.orden,
        })
        .eq('id', metodo.id);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase
        .from('niteo_metodos_pago')
        .insert({
          tipo: metodo.tipo,
          nombre: metodo.nombre,
          activo: metodo.activo,
          datos: metodo.datos,
          instrucciones: metodo.instrucciones,
          orden: metodo.orden,
        });
      if (error) return { success: false, error: error.message };
    }

    revalidatePath('/admin/metodos-pago');
    revalidatePath('/dashboard/billing');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleMetodoPago(id: string, activo: boolean) {
  try {
    const { supabase } = await requireSuperAdmin();
    const { error } = await supabase
      .from('niteo_metodos_pago')
      .update({ activo })
      .eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath('/admin/metodos-pago');
    revalidatePath('/dashboard/billing');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function eliminarMetodoPago(id: string) {
  try {
    const { supabase } = await requireSuperAdmin();
    const { error } = await supabase
      .from('niteo_metodos_pago')
      .delete()
      .eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath('/admin/metodos-pago');
    revalidatePath('/dashboard/billing');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Esta función la usa /dashboard/billing (cliente) para leer los métodos activos
export async function getMetodosPagoActivos() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('niteo_metodos_pago')
    .select('id, tipo, nombre, datos, instrucciones')
    .eq('activo', true)
    .order('orden');
  if (error) return [];
  return data || [];
}
