'use server';

import { createClient } from '@/utils/supabase/server';
import { startOfDay, endOfDay } from 'date-fns';
import { registrarAsiento } from './contabilidad-actions';

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

export async function getMetodosPago(): Promise<{ success: boolean; data: string[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, data: ['Efectivo', 'Transferencia', 'Pago Móvil'] };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, data: ['Efectivo', 'Transferencia', 'Pago Móvil'] };

  // Obtener los metodos de pago únicos usados históricamente (excluyendo créditos)
  const { data, error } = await supabase.rpc('get_metodos_pago_distinct', { p_empresa_id: profile.empresa_id });
  if (error || !data || data.length === 0) {
    return { success: true, data: ['Efectivo', 'Transferencia', 'Pago Móvil', 'Zelle', 'Punto de Venta'] };
  }
  return { success: true, data: data.map((d: any) => d.tipo_pago as string) };
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


export async function registrarAbono(
  facturaId: string,
  montoUSD: number,
  metodoPago: string,
  monedaEntrada: 'USD' | 'Bs',
  montoEntrada: number,
  tasaCambio: number,
  idempotencyKey: string,
  fechaPago?: string,
  referencia?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Perfil no encontrado' };

  const { data, error } = await supabase.rpc('registrar_abono_seguro', {
    p_empresa_id:      profile.empresa_id,
    p_factura_id:      facturaId,
    p_monto_usd:       montoUSD,
    p_metodo_pago:     metodoPago,
    p_moneda_entrada:  monedaEntrada,
    p_monto_entrada:   montoEntrada,
    p_tasa_cambio:     tasaCambio,
    p_idempotency_key: idempotencyKey,
    p_fecha_pago:      fechaPago || new Date().toISOString(),
    p_referencia:      referencia || null,
  });

  if (error) return { success: false, error: error.message };
  if (!data?.ok) return { success: false, error: data?.error || 'Error en el servidor' };

  // Registrar asiento contable (no falla la transacción si falla el asiento)
  try {
    const isTransferencia = metodoPago.toLowerCase().includes('transferencia') ||
                            metodoPago.toLowerCase().includes('zelle');
    const cuentaPago = isTransferencia ? '1.1.02' : '1.1.01'; // Bancos o Caja

    await registrarAsiento(
      profile.empresa_id,
      fechaPago || new Date().toISOString(),
      `Abono de factura ${facturaId} - ${metodoPago}`,
      'abono_credito',
      facturaId,
      user.id,
      [
        { codigo_cuenta: cuentaPago, debe: montoUSD, haber: 0 },
        { codigo_cuenta: '1.1.03', debe: 0, haber: montoUSD },
      ]
    );
  } catch (err) {
    console.error('[Contabilidad] Error en asiento de abono:', err);
  }

  return { success: true, nuevo_saldo: data.nuevo_saldo };
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
  const batchId = 'GLB_' + crypto.randomUUID();
  const fechaEfectiva = fechaPago || new Date().toISOString();

  for (const fac of facturas || []) {
    if (restante <= 0) break;

    const monto_abonar = Math.min(fac.saldo_pendiente, restante);
    const nuevo_saldo = fac.saldo_pendiente - monto_abonar;
    const estado_pago = nuevo_saldo > 0 ? 2 : 1;

    await supabase.from('ventas_facturas').update({ saldo_pendiente: nuevo_saldo, estado_pago }).eq('id', fac.id);
    await supabase.from('ventas_pagos').insert({
      empresa_id: profile.empresa_id,
      factura_id: fac.id,
      id_pos: batchId,
      tipo_pago: metodoPago,
      monto: monto_abonar,
      fecha_pago: fechaEfectiva,
      referencia: referencia || null
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
        fechaEfectiva,
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
      referencia,
      id_pos,
      ventas_facturas!inner (
        id,
        cliente_id,
        numero_documento,
        id_pos,
        fecha_venta,
        total
      )
    `)
    .eq('ventas_facturas.cliente_id', clienteId)
    .eq('empresa_id', profile.empresa_id)
    .neq('tipo_pago', 'Credito')
    .order('fecha_pago', { ascending: false, nullsFirst: false });

  if (error) return { success: false, error: error.message };

  // Agrupar abonos por lote / transacción (misma fecha y método)
  const gruposMap: Record<string, any> = {};

  for (const pago of data || []) {
    const rawDate = pago.fecha_pago || (pago.ventas_facturas as any)?.fecha_venta;
    const dateObj = rawDate ? new Date(rawDate) : new Date();
    const isGlobalBatch = pago.id_pos && (pago.id_pos.startsWith('GLB_') || pago.id_pos.startsWith('WEB_GLB_'));
    const timeKey = Math.floor(dateObj.getTime() / 60000); // agrupado al minuto
    const groupKey = isGlobalBatch
      ? (pago.id_pos.startsWith('GLB_') ? pago.id_pos : `glb_${timeKey}_${pago.tipo_pago}`)
      : `ind_${pago.id}`;

    if (!gruposMap[groupKey]) {
      gruposMap[groupKey] = {
        id: pago.id,
        fecha: dateObj.toISOString(),
        monto_total: 0,
        tipo_pago: pago.tipo_pago || 'Abono',
        referencia: pago.referencia || null,
        facturas: []
      };
    }

    gruposMap[groupKey].monto_total += Number(pago.monto) || 0;
    gruposMap[groupKey].facturas.push({
      factura_id: (pago.ventas_facturas as any)?.id,
      numero_documento: (pago.ventas_facturas as any)?.numero_documento || (pago.ventas_facturas as any)?.id_pos || 'Factura',
      monto: Number(pago.monto) || 0
    });
  }

  const grupos = Object.values(gruposMap).map((g: any) => ({
    ...g,
    monto_total: Number(g.monto_total.toFixed(2)),
    cantidad_facturas: g.facturas.length
  })).sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return { success: true, data: grupos };
}


export async function getTasaBCVActual(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tasa_cambiaria')
    .select('tasa_bcv')
    .order('fecha', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.tasa_bcv ?? 1;
}
