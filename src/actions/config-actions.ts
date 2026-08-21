'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getTasaBcvAction() {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  try {
    const { data, error } = await supabase
      .from('tasas_cambio')
      .select('tasa_bcv, fecha')
      .order('fecha', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // Intenta con "tasa" si "tasa_bcv" no existe
      const { data: d2, error: e2 } = await supabase
        .from('tasas_cambio')
        .select('tasa, fecha')
        .order('fecha', { ascending: false })
        .limit(1)
        .single();
      
      if (e2 || !d2) return { tasa: 36.50, fecha: null };
      return { tasa: Number(d2.tasa), fecha: d2.fecha };
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
    // Intentamos guardar en la tabla central
    const today = new Date().toISOString().split('T')[0];

    // Primero verificamos si hay una columna 'tasa_bcv' o 'tasa'
    const { error: insertError1 } = await supabase
      .from('tasas_cambio')
      .upsert({ fecha: today, tasa_bcv: nuevaTasa }, { onConflict: 'fecha' });
    
    if (insertError1) {
      const { error: insertError2 } = await supabase
        .from('tasas_cambio')
        .upsert({ fecha: today, tasa: nuevaTasa }, { onConflict: 'fecha' });
        
      if (insertError2) throw insertError2;
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/compras');
    revalidatePath('/dashboard/configuracion');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
