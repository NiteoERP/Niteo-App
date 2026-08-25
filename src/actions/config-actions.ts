'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getTasaBcvAction() {
  const supabase = await createClient();

  try {
    // Obtenemos la tasa más reciente registrada
    const { data, error } = await supabase
      .from('tasa_cambiaria')
      .select('tasa_bcv, fecha')
      .order('fecha', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return { tasa: 36.50, fecha: null };
    }

    return { tasa: Number(data.tasa_bcv), fecha: data.fecha };
  } catch (err) {
    return { tasa: 36.50, fecha: null };
  }
}

export async function updateTasaBcvAction(nuevaTasa: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  try {
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('tasa_cambiaria')
      .upsert({ fecha: today, tasa_bcv: nuevaTasa }, { onConflict: 'fecha' });

    if (error) throw error;

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/compras');
    revalidatePath('/dashboard/configuracion');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
