'use server';

import { createClient } from '@/utils/supabase/server';

export async function fetchDeliveryData(
  startDate: string,
  endDate: string,
  sedesFiltro: string[],
  repFiltro: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!perfil) throw new Error("Perfil no encontrado");

  // Niteo opera en America/Caracas (UTC-4).
  // El rango va desde el inicio del día local hasta el fin del día local,
  // convirtiéndolo a UTC sumando 4 horas para que la query de Supabase sea exacta.
  const startDateTime = `${startDate}T04:00:00.000Z`; // 00:00 Caracas = 04:00 UTC

  // 23:59:59 Caracas = siguiente día 03:59:59 UTC. Calculamos correctamente:
  const endDateObj = new Date(`${endDate}T00:00:00.000Z`);
  endDateObj.setUTCDate(endDateObj.getUTCDate() + 1);
  endDateObj.setUTCHours(3, 59, 59, 999);
  const endDateTime = endDateObj.toISOString();

  let query = supabase
    .from('ventas_facturas')
    .select(`
      id, 
      fecha_registro_real,
      pago_repartidor,
      sede_id,
      repartidor_id,
      sede:sedes!ventas_facturas_sede_id_fkey(nombre_sede),
      repartidor:perfiles!ventas_facturas_repartidor_id_fkey(nombre_completo)
    `)
    .eq('empresa_id', perfil.empresa_id)
    .eq('estado_delivery', 'ENTREGADO')
    .gte('fecha_registro_real', startDateTime)
    .lte('fecha_registro_real', endDateTime);

  if (sedesFiltro && sedesFiltro.length > 0) {
    query = query.in('sede_id', sedesFiltro);
  }
  
  if (repFiltro) {
    query = query.eq('repartidor_id', repFiltro);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error("Error fetching deliveries:", error);
    throw new Error(error.message);
  }

  return data || [];
}
