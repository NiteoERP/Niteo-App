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

  // Asegurar horas correctas para las fechas (inicio de día a fin de día)
  const p_fecha_inicio = startOfDay(new Date(startDate)).toISOString();
  const p_fecha_fin = endOfDay(new Date(endDate)).toISOString();
  const p_sede_id = sedeId === 'ALL' ? null : sedeId;

  // Mapear el reportId a la función RPC correspondiente
  let rpcName = '';
  let rpcParams: any = {};
  
  switch (reportId) {
    case 'ventas_diarias':
      rpcName = 'get_reporte_ventas_diarias';
      rpcParams = { p_empresa_id: profile.empresa_id, p_sede_id, p_fecha_inicio, p_fecha_fin };
      break;
    case 'ventas_productos':
      rpcName = 'get_reporte_ventas_productos';
      rpcParams = { p_empresa_id: profile.empresa_id, p_sede_id, p_fecha_inicio, p_fecha_fin };
      break;
    case 'ventas_usuarios':
      rpcName = 'get_reporte_ventas_usuarios';
      rpcParams = { p_empresa_id: profile.empresa_id, p_sede_id, p_fecha_inicio, p_fecha_fin };
      break;
    case 'cuentas_por_cobrar':
      rpcName = 'get_reporte_cuentas_por_cobrar';
      rpcParams = { p_empresa_id: profile.empresa_id, p_sede_id };
      break;
    default:
      return { success: false, error: "Reporte no implementado todavía." };
  }

  const { data, error } = await supabase.rpc(rpcName, rpcParams);

  if (error) {
    console.error("Error generando reporte:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}
