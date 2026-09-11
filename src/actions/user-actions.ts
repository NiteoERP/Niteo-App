'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function switchEmpresaAction(nuevaEmpresaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'No autenticado' };

  // Verificar si el usuario realmente pertenece a esta empresa
  const { data: relacion, error: relError } = await supabase
    .from('usuarios_empresas')
    .select('rol')
    .eq('usuario_id', user.id)
    .eq('empresa_id', nuevaEmpresaId)
    .single();

  if (relError || !relacion) {
    return { success: false, error: 'No tienes acceso a esta empresa' };
  }

  // Actualizar el perfil activo
  const { error: updateError } = await supabase
    .from('perfiles')
    .update({ 
      empresa_id: nuevaEmpresaId,
      rol: relacion.rol // Actualiza el rol al que tiene en esa empresa
    })
    .eq('id', user.id);

  if (updateError) {
    return { success: false, error: 'Error al cambiar de cuenta' };
  }

  // Refrescar y redirigir para recargar datos
  revalidatePath('/dashboard', 'layout');
  redirect('/dashboard');
}
