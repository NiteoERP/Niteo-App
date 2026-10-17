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

    // Obtener tasas BCV únicas para las fechas de los pagos pendientes + última tasa disponible como respaldo
    const fechasUnicas = [...new Set(
      (data || []).map(p => {
        const fecha = p.fecha_pago || p.fecha_registro;
        return fecha ? new Date(fecha).toISOString().split('T')[0] : null;
      }).filter(Boolean)
    )];

    const tasasPorFecha: Record<string, number> = {};
    if (fechasUnicas.length > 0) {
      const { data: tasas } = await supabase
        .from('tasa_cambiaria')
        .select('fecha, tasa_bcv')
        .in('fecha', fechasUnicas);
      (tasas || []).forEach((t: any) => {
        tasasPorFecha[t.fecha] = Number(t.tasa_bcv);
      });
    }

    // Tasa BCV más reciente como fallback
    let tasaReciente: number | null = null;
    const { data: ultimaTasa } = await supabase
      .from('tasa_cambiaria')
      .select('tasa_bcv')
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (ultimaTasa?.tasa_bcv) {
      tasaReciente = Number(ultimaTasa.tasa_bcv);
    }

    const formattedPagos = (data || []).map((p: any) => {
      const fechaRef = p.fecha_pago || p.fecha_registro;
      const fechaStr = fechaRef ? new Date(fechaRef).toISOString().split('T')[0] : null;
      const tasaBCV = (fechaStr && tasasPorFecha[fechaStr]) ? tasasPorFecha[fechaStr] : tasaReciente;
      const montoBs = tasaBCV ? Math.round(Number(p.monto) * tasaBCV * 100) / 100 : null;

      return {
        ...p,
        tasa_bcv: tasaBCV,
        monto_bs_calculado: montoBs,
        empresas: p.empresas ? {
          ...p.empresas,
          plan: p.empresas.plan_suscripcion || 'PRO',
          estado: p.empresas.estado_activo ? 'ACTIVA' : 'INACTIVA'
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
    let planDetectado = 'PRO';
    if (pago.plan_solicitado) {
      const planBase = pago.plan_solicitado.split(' ')[0].toUpperCase();
      if (['STARTER', 'PRO', 'ENTERPRISE', 'LIFETIME'].includes(planBase)) {
        planDetectado = planBase;
      }
    } else {
      const referencia = (pago.referencia || '').toUpperCase();
      if (referencia.includes('ENTERPRISE')) planDetectado = 'ENTERPRISE';
      else if (referencia.includes('STARTER')) planDetectado = 'STARTER';
      else if (referencia.includes('PRO')) planDetectado = 'PRO';
    }

    // Consultar suscripción actual para respetar renovaciones anticipadas y módulos operativos
    const { data: subActual } = await supabase
      .from('suscripciones_empresas')
      .select('plan, estado, fecha_vencimiento, modulos_activos')
      .eq('empresa_id', pago.empresa_id)
      .maybeSingle();

    // 3. Calcular fecha de vencimiento según ciclo de facturación (fin del día 23:59:59.999 UTC-4 Venezuela)
    const esAnual = !!(pago.plan_solicitado && pago.plan_solicitado.includes('[ANUAL]'));
    const hoy = new Date();
    const vencActual = subActual?.fecha_vencimiento ? new Date(subActual.fecha_vencimiento) : null;
    const baseActiva = (vencActual && vencActual > hoy) ? vencActual : hoy;

    let nuevaFecha: Date;
    if (esAnual) {
      // Sumar 1 año completo respetando días restantes si renueva anticipadamente
      const target = new Date(baseActiva);
      target.setUTCFullYear(target.getUTCFullYear() + 1);
      const yyyy = target.getUTCFullYear();
      const mm = String(target.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(target.getUTCDate()).padStart(2, '0');
      nuevaFecha = new Date(`${yyyy}-${mm}-${dd}T23:59:59.999-04:00`);
    } else {
      const primeroProximoMes = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() + 1, 1));
      const diasHastaPrimero = Math.ceil((primeroProximoMes.getTime() - hoy.getTime()) / 86400000);

      let target: Date;
      if (vencActual && vencActual > hoy) {
        // Renovación anticipada: sumar 1 mes completo sobre la fecha de vencimiento vigente
        target = new Date(vencActual);
        target.setUTCMonth(target.getUTCMonth() + 1);
      } else if (diasHastaPrimero <= 7) {
        // Si paga en los últimos 7 días del mes, extender hasta el 1ro del mes subsiguiente
        target = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() + 2, 1));
      } else {
        // Garantizar mínimo 30 días completos o el 1ro del próximo mes (el que otorgue mayor vigencia)
        const masTreintaDias = new Date(hoy.getTime() + 30 * 86400000);
        target = masTreintaDias > primeroProximoMes ? masTreintaDias : primeroProximoMes;
      }
      const yyyy = target.getUTCFullYear();
      const mm = String(target.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(target.getUTCDate()).padStart(2, '0');
      nuevaFecha = new Date(`${yyyy}-${mm}-${dd}T23:59:59.999-04:00`);
    }

    // 3.5. Extraer módulos adicionales (plugins) de plan_solicitado preservando módulos base ('mesas', 'delivery')
    const modulosPrevios: string[] = Array.isArray(subActual?.modulos_activos)
      ? subActual.modulos_activos.filter((m: string) => m === 'mesas' || m === 'delivery')
      : ['mesas', 'delivery'];

    let pluginsDetectados: string[] = [];
    if (pago.plan_solicitado && pago.plan_solicitado.includes('+ [')) {
      const match = pago.plan_solicitado.match(/\+ \[([^\]]+)\]/);
      if (match && match[1]) {
        pluginsDetectados = match[1].split(',').map((m: string) => m.trim()).filter(Boolean);
      }
    }
    const modulosFinales = Array.from(new Set([...modulosPrevios, ...pluginsDetectados]));

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

    // 5. Actualizar o insertar la suscripción de la empresa (usando 'ACTIVA' en mayúsculas acorde al enum)
    const { error: errSub } = await supabase
      .from('suscripciones_empresas')
      .upsert({
        empresa_id: pago.empresa_id,
        plan: planDetectado,
        estado: 'ACTIVA',
        fecha_vencimiento: nuevaFecha.toISOString(),
        modulos_activos: modulosFinales,
      }, { onConflict: 'empresa_id' });

    if (errSub) return { success: false, error: errSub.message };

    // 6. Mantener sincronizada la tabla empresas
    await supabase
      .from('empresas')
      .update({
        plan_suscripcion: planDetectado.toUpperCase(),
        fecha_vencimiento_plan: nuevaFecha.toISOString(),
        estado_activo: true,
      })
      .eq('id', pago.empresa_id);

    revalidatePath('/admin');
    revalidatePath('/admin/pagos');
    revalidatePath('/admin/empresas');
    revalidatePath('/dashboard', 'layout');
    revalidatePath('/dashboard/billing');
    return { success: true, plan: planDetectado, fechaVencimiento: nuevaFecha.toISOString() };
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
        notas_admin: motivo ? `Rechazado: ${motivo}` : 'Rechazado por administrador',
      })
      .eq('id', pagoId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/pagos');
    revalidatePath('/dashboard/billing');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
