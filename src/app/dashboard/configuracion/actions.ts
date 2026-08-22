'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateEmpresaSaaS(empresaId: string, data: any) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('empresas')
    .update({ 
      nombre_comercial: data.nombre_comercial,
      moneda: data.moneda,
      simbolo_moneda: data.simbolo_moneda,
      zona_horaria: data.zona_horaria
    })
    .eq('id', empresaId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Purge layout and configuracion cache to reload context
  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard/configuracion');
  
  return { success: true };
}
