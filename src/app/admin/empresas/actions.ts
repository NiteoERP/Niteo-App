'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
  if (perfil?.rol !== 'SUPERADMIN') throw new Error('Sin permisos');
  const adminSupabase = createAdminClient();
  return { supabase: adminSupabase, user };
}

export async function getEmpresas() {
  try {
    const { supabase } = await requireSuperAdmin();

    const { data, error } = await supabase
      .from('empresas')
      .select(`
        id,
        nombre_comercial,
        email_contacto,
        plan_suscripcion,
        estado_activo,
        fecha_registro,
        fecha_vencimiento_plan,
        suscripciones_empresas (
          plan,
          estado,
          fecha_vencimiento,
          modulos_activos
        )
      `)
      .order('fecha_registro', { ascending: false });

    if (error) {
      console.error('Error fetching empresas:', error);
      return { success: false, error: error.message, empresas: [] };
    }

    const formattedEmpresas = (data || []).map((e: any) => ({
      ...e,
      plan: e.plan_suscripcion || 'PRO',
      estado: e.estado_activo ? 'activa' : 'inactiva',
      // email_contacto viene directamente del spread de `e`
    }));


    return { success: true, empresas: formattedEmpresas };
  } catch (err: any) {
    console.error('Error in getEmpresas:', err);
    return { success: false, error: err.message, empresas: [] };
  }
}

export async function cambiarPlan(empresaId: string, plan: string, dias: number = 30) {
  try {
    const { supabase } = await requireSuperAdmin();

    const target = new Date();
    target.setUTCDate(target.getUTCDate() + dias);
    const yyyy = target.getUTCFullYear();
    const mm = String(target.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(target.getUTCDate()).padStart(2, '0');
    const fechaVencIso = plan.toUpperCase() === 'LIFETIME'
      ? '2099-12-31T23:59:59.999-04:00'
      : new Date(`${yyyy}-${mm}-${dd}T23:59:59.999-04:00`).toISOString();

    const esSuspendida = plan.toUpperCase() === 'SUSPENDIDA';

    const { error } = await supabase
      .from('suscripciones_empresas')
      .upsert({
        empresa_id: empresaId,
        plan: plan.toUpperCase(),
        estado: esSuspendida ? 'SUSPENDIDA' : 'ACTIVA',
        fecha_vencimiento: fechaVencIso,
      }, { onConflict: 'empresa_id' });

    if (error) return { success: false, error: error.message };

    await supabase
      .from('empresas')
      .update({
        plan_suscripcion: plan.toUpperCase(),
        fecha_vencimiento_plan: fechaVencIso,
        estado_activo: !esSuspendida,
      })
      .eq('id', empresaId);

    revalidatePath('/admin/empresas');
    revalidatePath('/dashboard', 'layout');
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
    base.setUTCDate(base.getUTCDate() + dias);
    const yyyy = base.getUTCFullYear();
    const mm = String(base.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(base.getUTCDate()).padStart(2, '0');
    const fechaVencIso = new Date(`${yyyy}-${mm}-${dd}T23:59:59.999-04:00`).toISOString();

    const { error } = await supabase
      .from('suscripciones_empresas')
      .upsert({
        empresa_id: empresaId,
        plan: sub?.plan || 'PRO',
        estado: 'ACTIVA',
        fecha_vencimiento: fechaVencIso,
      }, { onConflict: 'empresa_id' });

    if (error) return { success: false, error: error.message };

    await supabase
      .from('empresas')
      .update({
        fecha_vencimiento_plan: fechaVencIso,
        estado_activo: true,
      })
      .eq('id', empresaId);

    revalidatePath('/admin/empresas');
    revalidatePath('/dashboard', 'layout');
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
        estado: 'SUSPENDIDA',
        fecha_vencimiento: new Date().toISOString(),
      }, { onConflict: 'empresa_id' });

    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/empresas');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function actualizarModulosEmpresa(empresaId: string, modulos: string[]) {
  try {
    const { supabase } = await requireSuperAdmin();

    const { data: existing } = await supabase
      .from('suscripciones_empresas')
      .select('id')
      .eq('empresa_id', empresaId)
      .maybeSingle();

    let error = null;
    if (existing) {
      const res = await supabase
        .from('suscripciones_empresas')
        .update({ modulos_activos: modulos })
        .eq('empresa_id', empresaId);
      error = res.error;
    } else {
      const res = await supabase
        .from('suscripciones_empresas')
        .insert({
          empresa_id: empresaId,
          plan: 'PRO',
          estado: 'ACTIVA',
          modulos_activos: modulos,
        });
      error = res.error;
    }

    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/empresas');
    revalidatePath('/dashboard', 'layout');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

