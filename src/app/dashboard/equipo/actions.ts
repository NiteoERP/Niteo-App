'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateMemberRole(memberId: string, newRole: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('perfiles')
    .update({ rol: newRole })
    .eq('id', memberId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/equipo');
  return { success: true };
}
