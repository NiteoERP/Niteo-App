'use server';

import { createClient } from '@/utils/supabase/server';
import { startOfDay, endOfDay } from 'date-fns';

export async function generateReport(
  reportId: string, 
  sedeId: string | null, 
  startDate: Date, 
  endDate: Date
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { data: profile } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!profile) return { success: false, error: "Perfil no encontrado" };

  // Mapear el reportId a la función RPC correspondiente
  let rpcName = '';
  switch (reportId) {
    case 'ventas_diarias':
      rpcName = 'get_reporte_ventas_diarias';
      break;
    case 'ventas_productos':
      rpcName = 'get_reporte_ventas_productos';
      break;
    case 'ventas_usuarios':
      rpcName = 'get_reporte_ventas_usuarios';
      break;
    default:
      return { success: false, error: "Reporte no implementado todavía." };
  }

  // Asegurar horas correctas para las fechas (inicio de día a fin de día)
  const p_fecha_inicio = startOfDay(new Date(startDate)).toISOString();
  const p_fecha_fin = endOfDay(new Date(endDate)).toISOString();
  const p_sede_id = sedeId === 'ALL' ? null : sedeId;

  const { data, error } = await supabase.rpc(rpcName, {
    p_empresa_id: profile.empresa_id,
    p_sede_id,
    p_fecha_inicio,
    p_fecha_fin
  });

  if (error) {
    console.error("Error generando reporte:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}
