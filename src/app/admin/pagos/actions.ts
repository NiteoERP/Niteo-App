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

export async function getPagosPendientes() {
  try {
    const { supabase } = await requireSuperAdmin();
    const { data, error } = await supabase
      .from('suscripciones_pagos')
      .select(`
        *,
        empresas:empresa_id ( nombre_comercial, plan_suscripcion, estado_activo )
      `)
      .eq('estado', 'pendiente_aprobacion')
      .order('fecha_registro', { ascending: true });

    if (error) {
      console.error('Error fetching pagos pendientes:', error);
      return { success: false, error: error.message, pagos: [] };
    }

    // Obtener tasas BCV únicas para las fechas de los pagos pendientes
    const fechasUnicas = [...new Set(
      (data || []).map(p => {
        const fecha = p.fecha_pago || p.fecha_registro;
        return fecha ? new Date(fecha).toISOString().split('T')[0] : null;
      }).filter(Boolean)
    )];

    let tasasPorFecha: Record<string, number> = {};
    if (fechasUnicas.length > 0) {
      const { data: tasas } = await supabase
        .from('tasa_cambiaria')
        .select('fecha, tasa_bcv')
        .in('fecha', fechasUnicas);
      (tasas || []).forEach((t: any) => {
        tasasPorFecha[t.fecha] = t.tasa_bcv;
      });
    }

    const formattedPagos = (data || []).map((p: any) => {
      const fechaRef = p.fecha_pago || p.fecha_registro;
      const fechaStr = fechaRef ? new Date(fechaRef).toISOString().split('T')[0] : null;
      // Tasa BCV del día del pago (o la más reciente disponible si no hay exacta)
      const tasaBCV = fechaStr ? (tasasPorFecha[fechaStr] || null) : null;
      const montoBs = tasaBCV ? Math.round(p.monto * tasaBCV * 100) / 100 : null;

      return {
        ...p,
        tasa_bcv: tasaBCV,
        monto_bs_calculado: montoBs,
        empresas: p.empresas ? {
          ...p.empresas,
          plan: p.empresas.plan_suscripcion || 'PRO',
          estado: p.empresas.estado_activo ? 'activa' : 'inactiva'
        } : null
      };
    });

    return { success: true, pagos: formattedPagos };
  } catch (err: any) {
    console.error('Error in getPagosPendientes:', err);
    return { success: false, error: err.message, pagos: [] };
  }
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

    // 2. Detectar plan del pago: primero de la columna dedicada, fallback a parsear referencia
    //    (el fallback es para pagos registrados antes de la migración migrate_billing_v2.sql)
    let planDetectado = 'PRO';
    if (pago.plan_solicitado) {
      // Columna dedicada: "PRO + [recetas]" → extraemos el plan base
      const planBase = pago.plan_solicitado.split(' ')[0].toUpperCase();
      if (['STARTER', 'PRO', 'ENTERPRISE'].includes(planBase)) {
        planDetectado = planBase;
      }
    } else {
      // Fallback legacy: buscar en referencia
      const referencia = pago.referencia || '';
      if (referencia.toUpperCase().includes('ENTERPRISE')) planDetectado = 'ENTERPRISE';
      else if (referencia.toUpperCase().includes('STARTER')) planDetectado = 'STARTER';
      else if (referencia.toUpperCase().includes('PRO')) planDetectado = 'PRO';
    }

    // 3. Calcular fecha de vencimiento según ciclo de facturación
    //    Mensual: 1ro del mes siguiente a las 00:00:00
    //    Anual:   1ro del mes actual + 12 meses (trabaja todo el año, vence el 1ro del 13vo mes)
    const esAnual = !!(pago.plan_solicitado && pago.plan_solicitado.includes('[ANUAL]'));
    const hoy = new Date();
    const nuevaFecha = esAnual
      ? new Date(hoy.getFullYear(), hoy.getMonth() + 12, 1, 0, 0, 0, 0)  // 1ro en 12 meses
      : new Date(hoy.getFullYear(), hoy.getMonth() + 1,  1, 0, 0, 0, 0); // 1ro del próximo mes

    // 3.5. Extraer módulos adicionales (plugins) de plan_solicitado
    let modulosDetectados: string[] = [];
    if (pago.plan_solicitado && pago.plan_solicitado.includes('+ [')) {
      const match = pago.plan_solicitado.match(/\+ \[([^\]]+)\]/);
      if (match && match[1]) {
        modulosDetectados = match[1].split(',').map((m: string) => m.trim());
      }
    }

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
        modulos_activos: modulosDetectados,
      }, { onConflict: 'empresa_id' });

    if (errSub) return { success: false, error: errSub.message };

    // 6. Mantener sincronizada la tabla empresas
    await supabase
      .from('empresas')
      .update({
        plan_suscripcion: planDetectado.toLowerCase(),
        fecha_vencimiento_plan: nuevaFecha.toISOString(),
      })
      .eq('id', pago.empresa_id);

    revalidatePath('/admin');
    revalidatePath('/admin/pagos');
    revalidatePath('/admin/empresas');
    revalidatePath('/dashboard', 'layout');
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
        // Guardamos el motivo en notas_admin para no destruir la referencia original del cliente
        notas_admin: motivo ? `Rechazado: ${motivo}` : 'Rechazado por administrador',
      })
      .eq('id', pagoId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/pagos');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
