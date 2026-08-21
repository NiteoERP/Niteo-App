'use server';

import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
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

export async function createUser(email: string, password: string, nombreCompleto: string, rol: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const empresaId = user?.app_metadata?.empresa_id;
  
  if (!empresaId || user?.app_metadata?.user_role !== 'MASTER') {
    return { success: false, error: 'No autorizado' };
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: {
      nombre_completo: nombreCompleto,
    },
    app_metadata: {
      empresa_id: empresaId,
      user_role: rol
    }
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // The database trigger might handle perfiles insertion automatically, 
  // but if we need to force update the role:
  await supabaseAdmin.from('perfiles').update({ rol }).eq('id', newUser.user.id);

  revalidatePath('/dashboard/equipo');
  return { success: true };
}
