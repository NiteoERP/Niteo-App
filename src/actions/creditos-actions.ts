'use server';

import { createClient } from '@/utils/supabase/server';
import { startOfDay, endOfDay } from 'date-fns';

export async function getClientesConDeuda(sedeId: string, startDate: string | Date, endDate: string | Date, page: number = 1, limit: number = 20, searchQuery: string = '') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: "Perfil no encontrado" };

  const p_fecha_inicio = typeof startDate === "string" ? startDate : startOfDay(new Date(startDate)).toISOString();
  const p_fecha_fin = typeof endDate === "string" ? endDate : endOfDay(new Date(endDate)).toISOString();
  const p_sede_id = sedeId === 'ALL' ? null : sedeId;

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.rpc('get_clientes_con_deuda', {
    p_empresa_id: profile.empresa_id,
    p_sede_id,
    p_fecha_inicio,
    p_fecha_fin
  }, { count: 'exact' });

  if (searchQuery && searchQuery.trim() !== '') {
    query = query.ilike('nombre_cliente', `%${searchQuery.trim()}%`);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) return { success: false, error: error.message };
  const mappedData = (data || []).map((cli: any) => ({
    id_cliente: cli.cliente_id || cli.id_cliente,
    nombre_cliente: cli.nombre_cliente,
    sedes_involucradas: cli.nombre_sede || cli.sedes_involucradas,
    monto_adeudado: cli.total_deuda || cli.monto_adeudado,
    ultima_compra: cli.ultima_compra || null
  }));
  return { success: true, data: mappedData, totalCount: count || 0 };
}

export async function getMetodosPago() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return [];

  // Obtener los metodos de pago únicos usados históricamente (excluyendo créditos)
  const { data, error } = await supabase.rpc('get_metodos_pago_distinct', { p_empresa_id: profile.empresa_id });
  
  if (error || !data) return ['Transferencia', 'Pago Movil', 'Efectivo', 'Zelle', 'Punto'];
  return data.map((d: any) => d.tipo_pago);
}

export async function getDetalleDeudaCliente(clienteId: string | null, sedeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: "Perfil no encontrado" };

  const p_sede_id = sedeId === 'ALL' ? null : sedeId;

  const { data, error } = await supabase.rpc('get_detalle_deuda_cliente', {
    p_empresa_id: profile.empresa_id,
    p_cliente_id: clienteId,
    p_sede_id
  });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function registrarAbono(facturaId: string, montoAbonado: number, metodoPago: string, fechaPago?: string, referencia?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { data, error } = await supabase.rpc('registrar_abono_factura_v2', {
    p_factura_id: facturaId,
    p_monto: montoAbonado,
    p_metodo_pago: metodoPago,
    p_fecha_pago: fechaPago || null,
    p_usuario_id: user.id
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}


export async function registrarAbonoGlobal(clienteId: string, sedeId: string, monto: number, metodoPago: string, fechaPago?: string, referencia?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const p_sede_id = sedeId === 'ALL' ? null : sedeId;

  const { data, error } = await supabase.rpc('registrar_abono_masivo', {
    p_cliente_id: clienteId,
    p_sede_id: p_sede_id,
    p_monto: monto,
    p_metodo_pago: metodoPago,
    p_fecha_pago: fechaPago || null,
    p_usuario_id: user.id
  });

  if (error) return { success: false, error: error.message };
  return { 
    success: true, 
    restante: data?.restante, 
    facturasPagadas: data?.facturasPagadas 
  };
}
