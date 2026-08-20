'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateCompanyName(empresaId: string, newName: string) {
  const supabase = await createClient();
  
  // Update the database
  const { error } = await supabase
    .from('empresas')
    .update({ nombre_comercial: newName })
    .eq('id', empresaId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Revalidate so next full refresh gets the fresh data
  revalidatePath('/dashboard/configuracion');
  
  return { success: true };
}
