'use server';

import { createClient } from '@/utils/supabase/server';

export async function getProveedoresConDeuda(sedeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Perfil no encontrado' };

  const p_sede_id = sedeId === 'ALL' ? null : sedeId;

  const { data, error } = await supabase.rpc('get_proveedores_con_deuda', {
    p_empresa_id: profile.empresa_id,
    p_sede_id
  });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getFacturasProveedor(proveedorId: string, sedeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  let query = supabase.from('compras_facturas')
    .select('id, numero_factura, concepto, total, saldo_pendiente, fecha_emision')
    .eq('proveedor_id', proveedorId)
    .gt('saldo_pendiente', 0)
    .order('fecha_emision', { ascending: true })
    .limit(10);
    
  if (sedeId !== 'ALL') {
    query = query.eq('sede_id', sedeId);
  }

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function registrarPagoProveedor(facturaId: string, monto: number, metodoPago: string, referencia: string, bancoOrigen: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { error } = await supabase.from('compras_pagos').insert({
    factura_id: facturaId,
    monto,
    metodo_pago: metodoPago,
    referencia,
    banco_origen: bancoOrigen,
    usuario_id: user.id
  });

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
    .select('id, nombre_comercial, rif_cedula')
    .eq('empresa_id', profile.empresa_id)
    .order('nombre_comercial');

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function crearProveedorRapido(nombre: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Perfil no encontrado' };

  const { data, error } = await supabase.from('proveedores')
    .insert({
      empresa_id: profile.empresa_id,
      nombre_comercial: nombre,
      estatus: 1
    })
    .select('id, nombre_comercial, rif_cedula')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function crearFacturaProveedor(proveedorId: string, sedeId: string, numeroFactura: string, concepto: string, total: number, fechaEmision: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Perfil no encontrado' };

  const { error } = await supabase.from('compras_facturas')
    .insert({
      empresa_id: profile.empresa_id,
      sede_id: sedeId,
      proveedor_id: proveedorId,
      numero_factura: numeroFactura || 'S/N',
      concepto: concepto || 'Compra registrada manualmente',
      total: total,
      saldo_pendiente: total,
      fecha_emision: fechaEmision,
      usuario_id: user.id
    });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
