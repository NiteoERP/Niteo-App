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

export async function getEmpresas() {
  const { supabase } = await requireSuperAdmin();

  const { data, error } = await supabase
    .from('empresas')
    .select(`
      id,
      nombre_comercial,
      email_contacto,
      plan,
      estado,
      fecha_registro,
      fecha_vencimiento_plan,
      suscripciones_empresas (
        plan,
        estado,
        fecha_vencimiento
      )
    `)
    .order('fecha_registro', { ascending: false });

  if (error) return { success: false, error: error.message, empresas: [] };
  return { success: true, empresas: data || [] };
}

export async function cambiarPlan(empresaId: string, plan: string, dias: number = 30) {
  try {
    const { supabase } = await requireSuperAdmin();

    const fechaVenc = new Date();
    fechaVenc.setDate(fechaVenc.getDate() + dias);

    const { error } = await supabase
      .from('suscripciones_empresas')
      .upsert({
        empresa_id: empresaId,
        plan: plan.toUpperCase(),
        estado: plan.toUpperCase() === 'SUSPENDIDA' ? 'suspendida' : 'activa',
        fecha_vencimiento: plan.toUpperCase() === 'LIFETIME'
          ? '2099-12-31T23:59:59.000Z'
          : fechaVenc.toISOString(),
      }, { onConflict: 'empresa_id' });

    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/empresas');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function extenderLicencia(empresaId: string, dias: number) {
  try {
    const { supabase } = await requireSuperAdmin();

    // Obtener fecha actual de vencimiento
    const { data: sub } = await supabase
      .from('suscripciones_empresas')
      .select('fecha_vencimiento, plan')
      .eq('empresa_id', empresaId)
      .maybeSingle();

    const base = sub?.fecha_vencimiento
      ? new Date(sub.fecha_vencimiento)
      : new Date();

    // Si ya venció, extender desde HOY
    if (base < new Date()) base.setTime(Date.now());
    base.setDate(base.getDate() + dias);

    const { error } = await supabase
      .from('suscripciones_empresas')
      .upsert({
        empresa_id: empresaId,
        plan: sub?.plan || 'PRO',
        estado: 'activa',
        fecha_vencimiento: base.toISOString(),
      }, { onConflict: 'empresa_id' });

    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/empresas');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function suspenderEmpresa(empresaId: string) {
  try {
    const { supabase } = await requireSuperAdmin();

    const { error } = await supabase
      .from('suscripciones_empresas')
      .upsert({
        empresa_id: empresaId,
        estado: 'suspendida',
        fecha_vencimiento: new Date().toISOString(),
      }, { onConflict: 'empresa_id' });

    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/empresas');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
