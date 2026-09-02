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

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: "Perfil no encontrado" };

  // Insertar el pago
  const { error: insertError } = await supabase.from('ventas_pagos').insert({
    empresa_id: profile.empresa_id,
    factura_id: facturaId,
    id_pos: 'WEB_' + Date.now().toString(),
    tipo_pago: metodoPago,
    monto: montoAbonado,
    fecha_pago: fechaPago || new Date().toISOString()
  });

  if (insertError) return { success: false, error: insertError.message };

  // Descontar del saldo_pendiente
  // Ya que es supabase podemos obtener la factura y actualizarla
  const { data: factura, error: getError } = await supabase
    .from('ventas_facturas')
    .select('saldo_pendiente')
    .eq('id', facturaId)
    .single();

  if (getError || !factura) return { success: false, error: getError?.message || 'Factura no encontrada' };

  const nuevoSaldo = Math.max(0, factura.saldo_pendiente - montoAbonado);
  const nuevoEstado = nuevoSaldo > 0 ? 2 : 1;

  const { error: updateError } = await supabase
    .from('ventas_facturas')
    .update({ saldo_pendiente: nuevoSaldo, estado_pago: nuevoEstado })
    .eq('id', facturaId);

  if (updateError) return { success: false, error: updateError.message };

  return { success: true };
}


export async function registrarAbonoGlobal(clienteId: string, sedeId: string, monto: number, metodoPago: string, fechaPago?: string, referencia?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  let query = supabase.from('ventas_facturas')
    .select('id, saldo_pendiente, empresa_id')
    .eq('cliente_id', clienteId)
    .gt('saldo_pendiente', 0)
    .order('fecha_venta', { ascending: true });

  if (sedeId !== 'ALL') {
    query = query.eq('sede_id', sedeId);
  }

  const { data: facturas, error: getError } = await query;
  if (getError) return { success: false, error: getError.message };
  if (!facturas || facturas.length === 0) return { success: false, error: 'No hay facturas con deuda para este cliente' };

  let montoRestante = monto;
  let abonosRegistrados = 0;

  for (const fac of facturas) {
    if (montoRestante <= 0) break;
    
    const montoAbonar = Math.min(Number(fac.saldo_pendiente), montoRestante);
    
    const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();

    const { error: insertError } = await supabase.from('ventas_pagos').insert({
      empresa_id: profile?.empresa_id,
      factura_id: fac.id,
      id_pos: 'WEB_' + Date.now().toString(),
      tipo_pago: metodoPago,
      monto: montoAbonar,
      fecha_pago: fechaPago || new Date().toISOString()
    });

    if (insertError) {
      console.error(insertError);
      return { success: false, error: insertError.message };
    }

    const nuevoSaldo = Math.max(0, fac.saldo_pendiente - montoAbonar);
    const nuevoEstado = nuevoSaldo > 0 ? 2 : 1;

    const { error: updateError } = await supabase
      .from('ventas_facturas')
      .update({ saldo_pendiente: nuevoSaldo, estado_pago: nuevoEstado })
      .eq('id', fac.id);

    if (updateError) {
      console.error(updateError);
      return { success: false, error: updateError.message };
    }

    
    montoRestante -= montoAbonar;
    abonosRegistrados++;
  }

  return { success: true, restante: montoRestante, facturasPagadas: abonosRegistrados };
}
