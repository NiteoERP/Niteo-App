'use server';

import { createClient } from '@/utils/supabase/server';
import { getTasaBcvAction } from '@/actions/config-actions';

export async function getProveedoresConDeuda(sedeId: string, page: number = 1, limit: number = 20, searchQuery: string = '') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Perfil no encontrado' };

  const p_sede_id = sedeId === 'ALL' ? null : sedeId;

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.rpc('get_proveedores_con_deuda', {
    p_empresa_id: profile.empresa_id,
    p_sede_id
  }, { count: 'exact' });

  if (searchQuery && searchQuery.trim() !== '') {
    query = query.ilike('nombre_proveedor', `%${searchQuery.trim()}%`);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) return { success: false, error: error.message };
  return { success: true, data, totalCount: count || 0 };
}

export async function getFacturasProveedor(proveedorId: string, sedeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  let query = supabase.from('compras_facturas')
    .select('id, numero_factura, concepto, total, saldo_pendiente, fecha_emision, fecha_vencimiento, pagos:compras_pagos(id, monto, metodo_pago, referencia, banco_origen, fecha_pago)')
    .eq('proveedor_id', proveedorId)
    .order('fecha_emision', { ascending: false });
    
  if (sedeId !== 'ALL') {
    query = query.eq('sede_id', sedeId);
  }

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function registrarPagoProveedor(facturaId: string, monto: number, metodoPago: string, referencia: string, bancoOrigen: string, fechaPago?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const payload: any = {
    factura_id: facturaId,
    monto,
    metodo_pago: metodoPago,
    referencia,
    banco_origen: bancoOrigen,
    usuario_id: user.id,
    fecha_pago: fechaPago || new Date().toISOString()
  };

  const { error } = await supabase.from('compras_pagos').insert(payload);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function registrarPagoGeneralProveedor(
  proveedorId: string,
  sedeId: string,
  montoTotal: number,
  metodoPago: string,
  referencia?: string,
  bancoOrigen?: string,
  fechaPago?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  if (!montoTotal || montoTotal <= 0) {
    return { success: false, error: 'El monto a abonar debe ser mayor a 0' };
  }

  // Traer todas las facturas pendientes ordenadas por emisión (más vieja primero - FIFO)
  let query = supabase.from('compras_facturas')
    .select('id, saldo_pendiente, fecha_emision')
    .eq('proveedor_id', proveedorId)
    .gt('saldo_pendiente', 0)
    .order('fecha_emision', { ascending: true });

  if (sedeId && sedeId !== 'ALL') {
    query = query.eq('sede_id', sedeId);
  }

  const { data: facturas, error: facErr } = await query;
  if (facErr) return { success: false, error: facErr.message };
  if (!facturas || facturas.length === 0) {
    return { success: false, error: 'No hay facturas pendientes para este proveedor.' };
  }

  let remanente = montoTotal;
  let facturasAbonadas = 0;

  for (const fac of facturas) {
    if (remanente <= 0) break;
    const saldo = Number(fac.saldo_pendiente);
    if (saldo <= 0) continue;

    const abono = Math.min(saldo, remanente);
    if (abono <= 0) continue;

    const { error: pErr } = await supabase.from('compras_pagos').insert({
      factura_id: fac.id,
      monto: abono,
      metodo_pago: metodoPago,
      referencia: referencia || null,
      banco_origen: bancoOrigen || null,
      usuario_id: user.id,
      fecha_pago: fechaPago || new Date().toISOString()
    });

    if (pErr) {
      console.error('Error al registrar abono en cascada:', pErr);
      return { success: false, error: 'Error al aplicar pago: ' + pErr.message };
    }

    remanente -= abono;
    facturasAbonadas++;
  }

  return { success: true, facturasAbonadas, remanenteSobrante: remanente };
}

export async function getHistoricoProveedores(meses: number = 6) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Perfil no encontrado' };

  const { data, error } = await supabase.rpc('get_historico_proveedores', {
    p_empresa_id: profile.empresa_id,
    p_meses: meses
  });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getTodosProveedores() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Perfil no encontrado' };

  const { data, error } = await supabase.from('proveedores')
    .select('id, nombre_comercial, rif_cedula, numero_contacto, ubicacion')
    .eq('empresa_id', profile.empresa_id)
    .eq('estado_activo', true)
    .order('nombre_comercial');

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function crearProveedor(datos: {
  nombre: string;
  rif?: string;
  telefono?: string;
  ubicacion?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Perfil no encontrado' };

  const { data, error } = await supabase.from('proveedores')
    .insert({
      empresa_id: profile.empresa_id,
      nombre_comercial: datos.nombre.trim(),
      rif_cedula: datos.rif?.trim() || null,
      numero_contacto: datos.telefono?.trim() || null,
      ubicacion: datos.ubicacion?.trim() || null,
      estado_activo: true
    })
    .select('id, nombre_comercial, rif_cedula, numero_contacto, ubicacion')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

// Keep backward compat alias
export async function crearProveedorRapido(nombre: string) {
  return crearProveedor({ nombre });
}

export async function crearFacturaProveedor(
  proveedorId: string,
  sedeId: string,
  numeroFactura: string,
  concepto: string,
  total: number,
  fechaEmision: string,
  metodoPago?: string,
  moneda?: string,
  tasa?: number,
  fechaVencimiento?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Perfil no encontrado' };

  // Get proveedor name for display
  const { data: prov } = await supabase.from('proveedores')
    .select('nombre_comercial')
    .eq('id', proveedorId)
    .single();

  const bcv = await getTasaBcvAction();
  const tasaActual = (tasa && tasa > 1) ? tasa : (bcv.tasa || 804.81);
  const monedaFinal = moneda || 'USD';
  const totalUSD = monedaFinal === 'USD' ? total : (total / (tasaActual > 0 ? tasaActual : 1));
  const montoBs = monedaFinal === 'USD' ? (total * tasaActual) : total;

  const isDeuda = !metodoPago || metodoPago.toLowerCase().includes('por pagar');
  const saldoPendiente = isDeuda ? Number(totalUSD.toFixed(2)) : 0;

  let conceptoFinal = concepto || 'Compra registrada manualmente';
  if (monedaFinal === 'VES') {
    conceptoFinal += ` (Bs. ${Number(total).toLocaleString('es-VE', { minimumFractionDigits: 2 })} @ ${tasaActual})`;
  }

  // 1. Insert into compras_facturas (supplier debt tracking)
  const { data: factura, error: facError } = await supabase.from('compras_facturas')
    .insert({
      empresa_id: profile.empresa_id,
      sede_id: sedeId || null,
      proveedor_id: proveedorId,
      numero_factura: numeroFactura || 'S/N',
      concepto: conceptoFinal,
      total: Number(totalUSD.toFixed(2)),
      saldo_pendiente: saldoPendiente,
      fecha_emision: fechaEmision,
      fecha_vencimiento: fechaVencimiento || null,
      usuario_id: user.id
    })
    .select('id')
    .single();

  if (facError) return { success: false, error: facError.message };

  if (!isDeuda && factura?.id) {
    await supabase.from('compras_pagos').insert({
      factura_id: factura.id,
      monto: Number(totalUSD.toFixed(2)),
      metodo_pago: metodoPago,
      referencia: 'Pago al contado / registro inicial',
      fecha_pago: fechaEmision || new Date().toISOString(),
      usuario_id: user.id
    });
  }

  // 2. Also register in compras_puntuales so it shows in Compras history
  await supabase.from('compras_puntuales').insert({
    id_empresa: profile.empresa_id,
    id_sede: sedeId || null,
    proveedor: prov?.nombre_comercial || 'Proveedor',
    monto_divisas: Number(totalUSD.toFixed(2)),
    monto_bs: Number(montoBs.toFixed(2)),
    tasa_cambio: tasaActual,
    detalles: conceptoFinal,
    metodo_pago: metodoPago || 'Por pagar',
    estado: 'PROCESADA',
    usuario_id: user.id
  });

  return { success: true };
}

import { registrarFacturaInsumos } from '@/actions/compras-actions';

export async function crearFacturaProveedorConInsumos(
  proveedorId: string,
  sedeId: string,
  numeroFactura: string,
  concepto: string,
  fechaEmision: string,
  metodoPago: string,
  moneda: 'USD' | 'VES',
  tasa: number,
  fechaVencimiento: string,
  items: any[]
) {
  const supabase = await createClient();
  const { data: prov } = await supabase.from('proveedores').select('nombre_comercial').eq('id', proveedorId).single();
  
  let tasaFinal = tasa;
  if (!tasaFinal || tasaFinal <= 1) {
    const bcv = await getTasaBcvAction();
    tasaFinal = bcv.tasa || 804.81;
  }

  const res = await registrarFacturaInsumos({
    proveedor: prov?.nombre_comercial || 'Proveedor',
    proveedor_id: proveedorId,
    moneda,
    tasa: tasaFinal,
    metodo_pago: metodoPago,
    descripcion: concepto,
    numero_factura: numeroFactura,
    fecha_emision: fechaEmision,
    fecha_vencimiento: fechaVencimiento || undefined,
    items
  });

  return res;
}
