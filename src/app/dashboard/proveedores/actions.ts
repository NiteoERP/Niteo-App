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
    .select('id, numero_factura, concepto, total, saldo_pendiente, fecha_emision, pagos:compras_pagos(id, monto, metodo_pago, referencia, banco_origen, created_at)')
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
    usuario_id: user.id
  };
  if (fechaPago) {
    payload.created_at = fechaPago;
  }

  const { error } = await supabase.from('compras_pagos').insert(payload);

  if (error) return { success: false, error: error.message };
  return { success: true };
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
  tasa?: number
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

  // 1. Insert into compras_facturas (supplier debt tracking)
  const { data: factura, error: facError } = await supabase.from('compras_facturas')
    .insert({
      empresa_id: profile.empresa_id,
      sede_id: sedeId || null,
      proveedor_id: proveedorId,
      numero_factura: numeroFactura || 'S/N',
      concepto: concepto || 'Compra registrada manualmente',
      total: total,
      saldo_pendiente: total,
      fecha_emision: fechaEmision,
      usuario_id: user.id
    })
    .select('id')
    .single();

  if (facError) return { success: false, error: facError.message };

  // 2. Also register in compras_puntuales so it shows in Compras history
  const tasaActual = tasa || (await getTasaBcvAction()).tasa || 36.5;
  const monedaFinal = moneda || 'USD';
  const montoDivisas = monedaFinal === 'USD' ? total : total / tasaActual;
  const montoBs = montoDivisas * tasaActual;

  await supabase.from('compras_puntuales').insert({
    id_empresa: profile.empresa_id,
    id_sede: sedeId || null,
    proveedor: prov?.nombre_comercial || 'Proveedor',
    monto_divisas: montoDivisas,
    monto_bs: montoBs,
    tasa_cambio: tasaActual,
    detalles: concepto || 'Compra registrada manualmente',
    metodo_pago: metodoPago || 'Por pagar',
    estado: 'PROCESADA',
    usuario_id: user.id
  });

  return { success: true };
}
