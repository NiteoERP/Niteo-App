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

export async function getDeudaHistorica(sedeId: string, diasAtras: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Perfil no encontrado' };

  const p_sede_id = sedeId === 'ALL' ? null : sedeId;
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  const p_fecha_corte = d.toISOString();

  const { data, error } = await supabase.rpc('get_deuda_proveedores_a_fecha', {
    p_empresa_id: profile.empresa_id,
    p_fecha_corte,
    p_sede_id
  });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}
