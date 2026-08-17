'use server'

import { createClient } from '@/utils/supabase/server';
import { endOfDay, startOfMonth, startOfToday, subDays, subMonths } from 'date-fns';

export async function getDashboardData(range: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await supabase
    .from('usuarios')
    .select('id_sede')
    .eq('auth_uuid', user.id)
    .single();

  if (!profile) throw new Error("Perfil no encontrado");

  // Definir rangos de fechas
  const now = new Date();
  let startDate = startOfMonth(now);
  let endDate = endOfDay(now);

  switch (range) {
    case 'today':
      startDate = startOfToday();
      break;
    case '7days':
      startDate = subDays(now, 7);
      break;
    case 'lastMonth':
      startDate = startOfMonth(subMonths(now, 1));
      endDate = endOfDay(subDays(startOfMonth(now), 1));
      break;
    case 'thisMonth':
    default:
      startDate = startOfMonth(now);
      break;
  }

  const { data: metrics, error } = await supabase.rpc('get_dashboard_metrics', {
    p_sede_id: profile.id_sede,
    p_fecha_inicio: startDate.toISOString(),
    p_fecha_fin: endDate.toISOString()
  });

  if (error) {
    console.error("Error cargando dashboard:", error);
    return [];
  }

  return metrics || [];
}
