'use server';

import { createClient } from '@/utils/supabase/server';

export async function getAuditoriaLogs(page: number = 1, limit: number = 50) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autorizado' };

    const { data: profile } = await supabase.from('perfiles').select('empresa_id, rol').eq('id', user.id).single();
    if (!profile) return { success: false, error: 'Perfil no encontrado' };

    if (profile.rol !== 'MASTER') {
      return { success: false, error: 'Solo el rol MASTER puede ver la auditoría' };
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Obtener logs con el nombre de usuario
    // Supabase auth.users no se puede joinear fácilmente desde la UI, usaremos perfiles
    const { data: logs, error, count } = await supabase
      .from('auditoria_logs')
      .select('*, perfiles:usuario_id(nombre_completo, rol)', { count: 'exact' })
      .eq('empresa_id', profile.empresa_id)
      .order('fecha_registro', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return { 
      success: true, 
      logs,
      total: count || 0
    };
  } catch (error: any) {
    console.error('Error fetching auditoria logs:', error);
    return { success: false, error: error.message, logs: [], total: 0 };
  }
}
