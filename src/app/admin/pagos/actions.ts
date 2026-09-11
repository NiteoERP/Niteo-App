'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
  if (perfil?.rol !== 'SUPERADMIN') throw new Error('Sin permisos');
  return { supabase, user };
}

export async function getPagosPendientes() {
  const { supabase } = await requireSuperAdmin();
  const { data, error } = await supabase
    .from('suscripciones_pagos')
    .select(`
      *,
      empresas:empresa_id ( nombre_comercial, plan, estado )
    `)
    .eq('estado', 'pendiente_aprobacion')
    .order('fecha_registro', { ascending: true });

  if (error) return { success: false, error: error.message, pagos: [] };
  return { success: true, pagos: data || [] };
}

export async function getPagosHistorial() {
  const { supabase } = await requireSuperAdmin();
  const { data, error } = await supabase
    .from('suscripciones_pagos')
    .select(`
      *,
      empresas:empresa_id ( nombre_comercial )
    `)
    .in('estado', ['aprobado', 'rechazado'])
    .order('fecha_registro', { ascending: false })
    .limit(100);

  if (error) return { success: false, error: error.message, pagos: [] };
  return { success: true, pagos: data || [] };
}

export async function aprobarPago(pagoId: string) {
  try {
    const { supabase, user } = await requireSuperAdmin();

    // 1. Obtener el pago con su info de plan
    const { data: pago, error: errPago } = await supabase
      .from('suscripciones_pagos')
      .select('*')
      .eq('id', pagoId)
      .single();

    if (errPago || !pago) return { success: false, error: 'Pago no encontrado' };

    // 2. Detectar plan del pago (viene en referencia como "STARTER" | "PRO" | "ENTERPRISE")
    const referencia = pago.referencia || '';
    let planDetectado = 'PRO';
    if (referencia.toUpperCase().includes('ENTERPRISE')) planDetectado = 'ENTERPRISE';
    else if (referencia.toUpperCase().includes('STARTER')) planDetectado = 'STARTER';
    else if (referencia.toUpperCase().includes('PRO')) planDetectado = 'PRO';

    // 3. Calcular nueva fecha de vencimiento (+30 días desde hoy)
    const nuevaFecha = new Date();
    nuevaFecha.setDate(nuevaFecha.getDate() + 30);

    // 4. Aprobar el pago
    const { error: errUpdate } = await supabase
      .from('suscripciones_pagos')
      .update({
        estado: 'aprobado',
        fecha_revision: new Date().toISOString(),
        revisado_por: user.id,
      })
      .eq('id', pagoId);

    if (errUpdate) return { success: false, error: errUpdate.message };

    // 5. Actualizar o insertar la suscripción de la empresa
    const { error: errSub } = await supabase
      .from('suscripciones_empresas')
      .upsert({
        empresa_id: pago.empresa_id,
        plan: planDetectado,
        estado: 'activa',
        fecha_vencimiento: nuevaFecha.toISOString(),
      }, { onConflict: 'empresa_id' });

    if (errSub) return { success: false, error: errSub.message };

    revalidatePath('/admin/pagos');
    return { success: true, plan: planDetectado };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function rechazarPago(pagoId: string, motivo: string) {
  try {
    const { supabase, user } = await requireSuperAdmin();

    const { error } = await supabase
      .from('suscripciones_pagos')
      .update({
        estado: 'rechazado',
        fecha_revision: new Date().toISOString(),
        revisado_por: user.id,
        referencia: motivo
          ? `[RECHAZADO: ${motivo}]`
          : '[RECHAZADO]',
      })
      .eq('id', pagoId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/pagos');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
