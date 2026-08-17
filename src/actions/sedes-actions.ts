'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Tipos
export interface Sede {
  id: string;
  empresa_id: string;
  nombre_sede: string;
  direccion?: string;
  estado_activo: boolean;
  master_key?: string;
  sistema_pos?: string;
  ultima_sincronizacion?: string;
  estado_sincronizacion: string;
}

// Generador de Pairing Code seguro y fácil de tipear (ej: NITEO-A1B2-C3D4)
function generatePairingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluidos I, O, 1, 0 para evitar confusión visual
  let code = 'NITEO-';
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  code += '-';
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

/**
 * Obtiene todas las sedes de la empresa del usuario logueado.
 */
export async function getSedes(): Promise<Sede[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!perfil) return [];

  const { data: sedes, error } = await supabase
    .from('sedes')
    .select('*')
    .eq('empresa_id', perfil.empresa_id)
    .order('nombre_sede', { ascending: true });

  if (error) {
    console.error('Error fetching sedes:', error);
    return [];
  }

  return sedes as Sede[];
}

/**
 * Genera y guarda un nuevo master_key para una sede específica.
 */
export async function generarMasterKey(sedeId: string): Promise<{ success: boolean; key?: string; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  // Verificamos que la sede pertenece a la empresa del usuario
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!perfil) return { success: false, error: 'Perfil no encontrado' };

  const newKey = generatePairingCode();

  const { error } = await supabase
    .from('sedes')
    .update({ master_key: newKey })
    .eq('id', sedeId)
    .eq('empresa_id', perfil.empresa_id); // Security hardening

  if (error) {
    console.error('Error updating master_key:', error);
    return { success: false, error: 'No se pudo generar la llave' };
  }

  revalidatePath('/dashboard/configuracion/sedes');
  return { success: true, key: newKey };
}

/**
 * Crea una nueva sede
 */
export async function crearSede(formData: FormData) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!perfil) return { error: 'Perfil no encontrado' };

  const nombreSede = formData.get('nombre_sede') as string;
  const direccion = formData.get('direccion') as string;

  if (!nombreSede) return { error: 'Nombre es requerido' };

  const { error } = await supabase
    .from('sedes')
    .insert({
      empresa_id: perfil.empresa_id,
      nombre_sede: nombreSede,
      direccion: direccion || null,
    });

  if (error) {
    console.error('Error al crear sede:', error);
    return { error: 'Ocurrió un error al crear la sucursal.' };
  }

  revalidatePath('/dashboard/configuracion/sedes');
  return { success: true };
}
