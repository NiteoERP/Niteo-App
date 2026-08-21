'use server'

import { createClient } from '@/utils/supabase/server';
import { endOfDay, startOfMonth, startOfToday, subDays, subMonths } from 'date-fns';

export async function getDashboardData(range: string, sedeId?: string | null) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await supabase
    .from('perfiles')
    .select('sede_id, empresa_id')
    .eq('id', user.id)
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

  // Si el perfil tiene una sede fija, OBLIGATORIAMENTE usamos esa sede. Si no, usamos la que pida el cliente (o null para global)
  const finalSedeId = profile.sede_id ? profile.sede_id : (sedeId || null);

  const { data: metrics, error } = await supabase.rpc('get_dashboard_rentabilidad', {
    p_empresa_id: profile.empresa_id,
    p_fecha_inicio: startDate.toISOString(),
    p_fecha_fin: endDate.toISOString(),
    p_sede_id: finalSedeId
  });

  if (error) {
    console.error("Error cargando dashboard:", error);
    return [];
  }

  return metrics || [];
}

export async function getSedes() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase.from('perfiles').select('empresa_id, sede_id').eq('id', user.id).single();
  if (!profile) return [];

  // Si el perfil ya está anclado a una sede, devolvemos vacío para NO mostrar el selector global en la UI
  if (profile.sede_id) {
    return [];
  }

  // Si tiene acceso global (sede_id IS NULL), devolvemos todas las sedes de la empresa
  const { data } = await supabase.from('sedes').select('id, nombre, direccion').eq('empresa_id', profile.empresa_id);
  return data || [];
}
