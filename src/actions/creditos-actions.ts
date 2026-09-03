'use server';

import { createClient } from '@/utils/supabase/server';
import { startOfDay, endOfDay } from 'date-fns';
import { registrarAsiento } from './contabilidad-actions';
import { unstable_noStore as noStore } from 'next/cache';

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

  const { data: factura, error: errFac } = await supabase.from('ventas_facturas').select('saldo_pendiente').eq('id', facturaId).eq('empresa_id', profile.empresa_id).single();
  if (errFac || !factura) return { success: false, error: "Factura no encontrada" };

  const nuevo_saldo = Math.max(0, factura.saldo_pendiente - montoAbonado);
  const estado_pago = nuevo_saldo > 0 ? 2 : 1;

  const { error: errUpd } = await supabase.from('ventas_facturas').update({ saldo_pendiente: nuevo_saldo, estado_pago }).eq('id', facturaId);
  if (errUpd) return { success: false, error: errUpd.message };

  const { error: errIns } = await supabase.from('ventas_pagos').insert({
    empresa_id: profile.empresa_id,
    factura_id: facturaId,
    id_pos: 'WEB_' + crypto.randomUUID(),
    tipo_pago: metodoPago,
    monto: montoAbonado,
    fecha_pago: fechaPago || new Date().toISOString()
  });

  if (errIns) return { success: false, error: errIns.message };

  try {
    const isTransferencia = metodoPago.toLowerCase().includes('transferencia') || metodoPago.toLowerCase().includes('zelle');
    const cuentaPago = isTransferencia ? '1.1.02' : '1.1.01'; // Bancos o Caja

    await registrarAsiento(
      profile.empresa_id,
      fechaPago || new Date().toISOString(),
      `Abono de factura ${facturaId} - Método: ${metodoPago}`,
      'abono_credito',
      facturaId,
      user.id,
      [
        { codigo_cuenta: cuentaPago, debe: montoAbonado, haber: 0 }, // Entra dinero
        { codigo_cuenta: '1.1.03', debe: 0, haber: montoAbonado } // Disminuye CXC
      ]
    );
  } catch (err) {
    console.error("Error contable en abono:", err);
  }

  return { success: true };
}

export async function registrarAbonoGlobal(clienteId: string, sedeId: string, monto: number, metodoPago: string, fechaPago?: string, referencia?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: "Perfil no encontrado" };

  let query = supabase.from('ventas_facturas').select('id, saldo_pendiente').eq('cliente_id', clienteId).eq('empresa_id', profile.empresa_id).gt('saldo_pendiente', 0).order('fecha_venta', { ascending: true });
  if (sedeId !== 'ALL') query = query.eq('sede_id', sedeId);

  const { data: facturas, error: errFacs } = await query;
  if (errFacs) return { success: false, error: errFacs.message };

  let restante = monto;
  let facturasPagadas = 0;

  for (const fac of facturas || []) {
    if (restante <= 0) break;

    const monto_abonar = Math.min(fac.saldo_pendiente, restante);
    const nuevo_saldo = fac.saldo_pendiente - monto_abonar;
    const estado_pago = nuevo_saldo > 0 ? 2 : 1;

    await supabase.from('ventas_facturas').update({ saldo_pendiente: nuevo_saldo, estado_pago }).eq('id', fac.id);
    await supabase.from('ventas_pagos').insert({
      empresa_id: profile.empresa_id,
      factura_id: fac.id,
      id_pos: 'WEB_GLB_' + crypto.randomUUID(),
      tipo_pago: metodoPago,
      monto: monto_abonar,
      fecha_pago: fechaPago || new Date().toISOString()
    });

    restante -= monto_abonar;
    facturasPagadas++;
  }

  const montoRealAbonado = monto - restante;
  if (montoRealAbonado > 0) {
    try {
      const isTransferencia = metodoPago.toLowerCase().includes('transferencia') || metodoPago.toLowerCase().includes('zelle');
      const cuentaPago = isTransferencia ? '1.1.02' : '1.1.01'; // Bancos o Caja

      await registrarAsiento(
        profile.empresa_id,
        fechaPago || new Date().toISOString(),
        `Abono global de cliente - Método: ${metodoPago}`,
        'abono_global',
        clienteId,
        user.id,
        [
          { codigo_cuenta: cuentaPago, debe: montoRealAbonado, haber: 0 },
          { codigo_cuenta: '1.1.03', debe: 0, haber: montoRealAbonado }
        ]
      );
    } catch (err) {
      console.error("Error contable en abono global:", err);
    }
  }

  return { 
    success: true, 
    restante, 
    facturasPagadas 
  };
}



export async function getHistorialAbonosCliente(clienteId: string) {
  noStore();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Perfil no encontrado' };

  const { data, error } = await supabase
    .from('ventas_pagos')
    .select(`
      id,
      monto,
      tipo_pago,
      fecha_pago,
      ventas_facturas!inner (
        id,
        cliente_id,
        numero_documento,
        id_pos
      )
    `)
    .eq('ventas_facturas.cliente_id', clienteId)
    .eq('empresa_id', profile.empresa_id)
    .order('fecha_pago', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}
