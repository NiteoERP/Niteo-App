'use server';

import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

export async function updateMemberAccess(memberId: string, permisos: string[], sede_id: string | null) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('perfiles')
    .update({ 
      permisos,
      sede_id: sede_id === 'ALL' ? null : sede_id
    })
    .eq('id', memberId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/equipo');
  return { success: true };
}

export async function createUser(email: string, password: string, nombreCompleto: string, permisos: string[], sede_id: string | null, rol: string = 'CAJERO') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const empresaId = user?.app_metadata?.empresa_id;
  
  // Solo MASTER o quienes tengan permiso 'usuarios' pueden crear cuentas
  const { data: profile } = await supabase.from('perfiles').select('permisos').eq('id', user?.id).single();
  
  if (!empresaId || (!profile?.permisos?.includes('usuarios') && user?.app_metadata?.user_role !== 'MASTER')) {
    return { success: false, error: 'No autorizado' };
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Crear el usuario en auth con empresa_id Y user_role en app_metadata.
  // Sin user_role el middleware no puede leer el rol del JWT y envía al usuario a /onboarding.
  const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: {
      nombre_completo: nombreCompleto,
    },
    app_metadata: {
      empresa_id: empresaId,
      user_role: rol,            // FIX: campo requerido por el middleware
    }
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Upsert explícito del perfil para garantizar que empresa_id, rol y nombre_completo
  // estén correctos independientemente de si el trigger de DB funcionó.
  // Sin empresa_id en perfiles, el middleware bloquea al usuario en /dashboard/billing.
  const { error: profileErr } = await supabaseAdmin.from('perfiles').upsert({
    id: newUser.user.id,
    empresa_id: empresaId,          // FIX: obligatorio para pasar el guard del middleware
    nombre_completo: nombreCompleto,
    rol: rol,
    permisos,
    sede_id: sede_id === 'ALL' ? null : sede_id,
    estado_activo: true,
  }, { onConflict: 'id' });

  if (profileErr) {
    console.error('Error guardando perfil del nuevo usuario:', profileErr);
    // No bloqueamos — el usuario auth ya existe. El admin puede corregir manualmente.
  }

  revalidatePath('/dashboard/equipo');
  return { success: true, userId: newUser.user.id };

}


export async function updateMemberRole(memberId: string, newRole: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('perfiles').update({ rol: newRole }).eq('id', memberId);
  if (error) return { success: false, error: error.message };
  revalidatePath('/dashboard/equipo');
  return { success: true };
}

export async function deleteUser(memberId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Solo MASTER puede eliminar usuarios
  if (user?.app_metadata?.user_role !== 'MASTER') {
    return { success: false, error: 'No autorizado' };
  }
  // No puede eliminarse a sí mismo
  if (user.id === memberId) {
    return { success: false, error: 'No puedes eliminarte a ti mismo' };
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Eliminar el usuario de auth — el perfil se borra en cascada (FK ON DELETE CASCADE)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(memberId);
  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard/equipo');
  return { success: true };
}
