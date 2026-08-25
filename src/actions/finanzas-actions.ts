'use server';

import { createClient } from '@/utils/supabase/server';

export async function getReporteFinanciero(fechaInicio: string, fechaFin: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autorizado' };

    const { data: profile } = await supabase.from('perfiles').select('empresa_id, rol').eq('id', user.id).single();
    if (!profile) return { success: false, error: 'Perfil no encontrado' };

    if (profile.rol !== 'MASTER' && profile.rol !== 'ADMIN') {
      return { success: false, error: 'No tienes permisos para ver las finanzas' };
    }

    const { data, error } = await supabase.rpc('obtener_flujo_caja', {
      p_empresa_id: profile.empresa_id,
      p_fecha_inicio: fechaInicio,
      p_fecha_fin: fechaFin
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error fetching finanzas:', error);
    // Return empty mock structure if RPC fails (so UI doesn't crash before SQL is run)
    return { 
      success: false, 
      error: error.message,
      data: {
        total_ingresos: 0,
        total_egresos: 0,
        ganancia_neta: 0,
        ingresos_por_dia: [],
        egresos_por_dia: []
      }
    };
  }
}
