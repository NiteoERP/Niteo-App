'use server';

import { cache } from 'react';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export interface EstadoLicencia {
  estado: 'ACTIVA' | 'TRIAL' | 'GRACIA' | 'VENCIDA';
  diasRestantes: number;    // >= 0 cuando está vigente o en gracia; < 0 si está vencida
  diasVencido: number;      // 0 si está activa, > 0 si ya pasó la fecha de corte
  planSuscripcion: string;
  modulosActivos: string[];
  fechaVencimiento: string | null;
  bloqueoFuerte: boolean;   // Si debe bloquear módulos administrativos (después de los 3 días de cortesía)
  pagoEnRevision?: boolean; // true cuando la empresa ya reportó un pago y está pendiente de aprobación
}

/**
 * Normaliza una fecha de vencimiento al final del día (23:59:59.999) en hora de Venezuela (UTC-4),
 * garantizando que ningún plan se venza antes de que termine su día calendario completo.
 */
function normalizarFinDeDiaVenezuela(rawIso: string | Date): Date {
  const d = typeof rawIso === 'string' ? new Date(rawIso) : new Date(rawIso.getTime());
  // Si fue guardada a las 00:00:00 UTC (ej. 1ro del mes en servidor UTC), tomamos su año/mes/día UTC.
  // De lo contrario, tomamos su fecha en Venezuela (UTC-4).
  const esMedianocheUTC = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
  const ref = esMedianocheUTC ? d : new Date(d.getTime() - 4 * 3600 * 1000);
  const year = ref.getUTCFullYear();
  const month = String(ref.getUTCMonth() + 1).padStart(2, '0');
  const day = String(ref.getUTCDate()).padStart(2, '0');
  return new Date(`${year}-${month}-${day}T23:59:59.999-04:00`);
}

const getEstadoLicenciaCached = cache(async (): Promise<EstadoLicencia | null> => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // 1. Obtener empresa_id desde JWT (instantáneo) con fallback a perfiles
    let empresaId: string | null = user.app_metadata?.empresa_id || null;
    if (!empresaId) {
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('empresa_id')
        .eq('id', user.id)
        .maybeSingle();
      empresaId = perfil?.empresa_id || null;
    }

    if (!empresaId) return null;

    // 2. Consultar en paralelo suscripción y pagos pendientes de aprobación
    const [subRes, pagoPendienteRes] = await Promise.all([
      supabase
        .from('suscripciones_empresas')
        .select('plan, estado, fecha_vencimiento, fecha_registro, modulos_activos')
        .eq('empresa_id', empresaId)
        .maybeSingle(),
      supabase
        .from('suscripciones_pagos')
        .select('id, fecha_registro, estado')
        .eq('empresa_id', empresaId)
        .eq('estado', 'pendiente_aprobacion')
        .order('fecha_registro', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const sub = subRes.data;
    const pagoPendiente = pagoPendienteRes.data;

    const plan = (sub?.plan || 'PRO').toUpperCase();
    const modulos = sub?.modulos_activos || [];

    // Plan LIFETIME nunca vence
    if (plan === 'LIFETIME') {
      return {
        estado: 'ACTIVA',
        diasRestantes: 9999,
        diasVencido: 0,
        planSuscripcion: 'LIFETIME',
        modulosActivos: modulos,
        fechaVencimiento: '2099-12-31T23:59:59.000Z',
        bloqueoFuerte: false,
        pagoEnRevision: false,
      };
    }

    // Si el estado en base de datos fue suspendido explícitamente por administración
    const estadoSub = sub ? (sub.estado || 'TRIAL').toUpperCase() : 'TRIAL';
    if (estadoSub === 'SUSPENDIDA') {
      return {
        estado: 'VENCIDA',
        diasRestantes: -4,
        diasVencido: 4,
        planSuscripcion: plan,
        modulosActivos: modulos,
        fechaVencimiento: sub?.fecha_vencimiento || new Date().toISOString(),
        bloqueoFuerte: true,
        pagoEnRevision: false,
      };
    }

    let fechaVencBase: Date;
    if (sub?.fecha_vencimiento) {
      fechaVencBase = normalizarFinDeDiaVenezuela(sub.fecha_vencimiento);
    } else {
      let regDateStr = sub?.fecha_registro;
      if (!regDateStr) {
        const { data: empresa } = await supabase
          .from('empresas')
          .select('fecha_registro')
          .eq('id', empresaId)
          .maybeSingle();
        regDateStr = empresa?.fecha_registro;
      }
      const regDate = regDateStr ? new Date(regDateStr) : new Date();
      regDate.setDate(regDate.getDate() + 7); // 7 días de prueba
      fechaVencBase = normalizarFinDeDiaVenezuela(regDate);
    }

    const ahora = new Date();
    const msDiff = fechaVencBase.getTime() - ahora.getTime();
    // Si msDiff >= 0, aún no ha terminado el día de vencimiento en Venezuela:
    // usamos Math.floor(msDiff / 86400000) para que en el último día sea 0 ("vence hoy") y nunca negativo.
    // Si msDiff < 0, ya pasó las 23:59:59 del día de vencimiento: usamos Math.floor para obtener -1, -2, etc.
    const difDias = Math.floor(msDiff / 86400000);

    // Verificar si hay un pago reportado en revisión en los últimos 5 días
    let enGraciaPorPago = false;
    let diasGraciaPago = 5;
    if (pagoPendiente?.fecha_registro) {
      const diasTranscurridosPago = Math.floor((ahora.getTime() - new Date(pagoPendiente.fecha_registro).getTime()) / 86400000);
      if (diasTranscurridosPago <= 5) {
        enGraciaPorPago = true;
        diasGraciaPago = Math.max(1, 5 - diasTranscurridosPago);
      }
    }

    let estado: 'ACTIVA' | 'TRIAL' | 'GRACIA' | 'VENCIDA' = 'ACTIVA';
    let bloqueoFuerte = false;
    let diasRestantes = difDias;
    let diasVencido = difDias < 0 ? Math.abs(difDias) : 0;

    if (enGraciaPorPago) {
      // Si el cliente tiene un pago en revisión:
      // Si su plan aún tenía más días vigentes (pago anticipado), mantenemos su estado ACTIVA.
      // Si estaba por vencer o vencido, pasa a GRACIA con acceso total y 0 bloqueo.
      if (difDias > diasGraciaPago && (estadoSub === 'ACTIVA' || estadoSub === 'ACTIVO')) {
        estado = 'ACTIVA';
        diasRestantes = difDias;
        diasVencido = 0;
      } else {
        estado = 'GRACIA';
        diasRestantes = Math.max(difDias, diasGraciaPago);
        diasVencido = 0;
      }
      bloqueoFuerte = false;
    } else if (difDias < 0) {
      // Ya pasó la fecha de corte y NO ha reportado pago:
      // Damos 3 días de cortesía operativa (difDias = -1, -2, -3) antes de aplicar bloqueoFuerte.
      if (difDias >= -3) {
        estado = 'GRACIA';
        diasRestantes = 3 - Math.abs(difDias); // 2, 1 o 0 días restantes de cortesía
        bloqueoFuerte = false;
      } else {
        estado = 'VENCIDA';
        bloqueoFuerte = true;
      }
    } else {
      // Vigente (difDias >= 0)
      estado = (estadoSub === 'ACTIVA' || estadoSub === 'ACTIVO') ? 'ACTIVA' : 'TRIAL';
    }

    return {
      estado,
      diasRestantes,
      diasVencido,
      planSuscripcion: plan,
      modulosActivos: modulos,
      fechaVencimiento: fechaVencBase.toISOString(),
      bloqueoFuerte,
      pagoEnRevision: enGraciaPorPago,
    };
  } catch (err: any) {
    if (err?.digest?.includes('DYNAMIC_SERVER_USAGE') || err?.digest?.includes('NEXT_REDIRECT')) {
      throw err;
    }
    console.error('Error en getEstadoLicencia:', err);
    return {
      estado: 'ACTIVA',
      diasRestantes: 30,
      diasVencido: 0,
      planSuscripcion: 'PRO',
      modulosActivos: [],
      fechaVencimiento: new Date(Date.now() + 30 * 86400000).toISOString(),
      bloqueoFuerte: false,
      pagoEnRevision: false,
    };
  }
});

export async function getEstadoLicencia(): Promise<EstadoLicencia | null> {
  return getEstadoLicenciaCached();
}

export async function reportarPagoSuscripcion(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: perfil } = await supabase.from('perfiles').select('empresa_id, rol').eq('id', user.id).single();
  if (!perfil?.empresa_id) return { success: false, error: 'Sin empresa asociada al perfil' };

  const monto = parseFloat(formData.get('monto') as string);
  const metodo_pago = (formData.get('metodo_pago') as string)?.trim();
  const referencia = (formData.get('referencia') as string)?.trim();
  const banco_destino = (formData.get('banco_destino') as string)?.trim() || null;
  const fecha_pago = (formData.get('fecha_pago') as string)?.trim() || new Date().toISOString().split('T')[0];
  const plan_solicitado = (formData.get('plan_solicitado') as string)?.trim();
  const archivo = formData.get('comprobante') as File | null;

  if (!monto || isNaN(monto) || monto <= 0) {
    return { success: false, error: 'El monto del pago no es válido.' };
  }
  if (!metodo_pago) {
    return { success: false, error: 'Debes seleccionar un método de pago.' };
  }
  if (!referencia || referencia.length < 3) {
    return { success: false, error: 'Debes ingresar el número de referencia o confirmación del pago.' };
  }

  const esEfectivo = metodo_pago.toLowerCase().includes('efectivo');
  if (!esEfectivo && (!archivo || archivo.size === 0)) {
    return { success: false, error: 'Por favor adjunta la captura o comprobante del pago (imagen o PDF).' };
  }

  const adminSupabase = createAdminClient();
  let comprobante_url: string | null = null;

  if (archivo && archivo.size > 0) {
    if (archivo.size > 10 * 1024 * 1024) {
      return { success: false, error: 'El archivo del comprobante no debe superar los 10 MB.' };
    }
    try {
      const rawExt = (archivo.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const ext = ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(rawExt) ? rawExt : 'jpg';
      const fileName = `${perfil.empresa_id}/${Date.now()}_${referencia.replace(/[^a-zA-Z0-9_-]/g, '').slice(-10)}.${ext}`;
      const arrayBuffer = await archivo.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { data: fileData, error: fileError } = await adminSupabase.storage
        .from('comprobantes')
        .upload(fileName, buffer, {
          contentType: archivo.type || (ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`),
          upsert: true,
        });

      if (fileError || !fileData) {
        console.error('Error subiendo comprobante a Storage:', fileError);
        return { success: false, error: 'Error al guardar la captura del comprobante: ' + (fileError?.message || 'Intenta nuevamente') };
      }
      comprobante_url = fileData.path;
    } catch (e: any) {
      console.error('Excepción al subir comprobante:', e);
      return { success: false, error: 'No se pudo procesar la captura adjunta: ' + (e?.message || 'Archivo inválido') };
    }
  }

  const modulos = (formData.get('modulos') as string)?.trim() || '';
  const ciclo   = (formData.get('ciclo') as string) || 'mensual'; // mensual | anual
  // planCompleto: "PRO [ANUAL] + [recetas,multi-price]" o "PRO [MENSUAL] + [recetas]"
  const cicloTag    = ciclo === 'anual' ? '[ANUAL]' : '[MENSUAL]';
  const planConCiclo = `${plan_solicitado || 'STARTER'} ${cicloTag}`;
  const planCompleto = modulos ? `${planConCiclo} + [${modulos}]` : planConCiclo;

  // Insertar en suscripciones_pagos con todas las columnas de trazabilidad
  const { error } = await adminSupabase.from('suscripciones_pagos').insert({
    empresa_id: perfil.empresa_id,
    monto,
    metodo_pago,
    referencia,
    banco_destino,
    fecha_pago,
    plan_solicitado: planCompleto,
    comprobante_url,
    moneda: 'USD',
    estado: 'pendiente_aprobacion',
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // ── AUTO-GRACIA O MANTENER ACTIVO ──
  // Si el usuario reporta un pago, no queremos reducirle el tiempo si estaba haciendo un pago anticipado.
  try {
    const { data: subActual } = await adminSupabase
      .from('suscripciones_empresas')
      .select('plan, estado, fecha_vencimiento, modulos_activos')
      .eq('empresa_id', perfil.empresa_id)
      .maybeSingle();

    const ahora = new Date();
    const vencActual = subActual?.fecha_vencimiento ? new Date(subActual.fecha_vencimiento) : null;
    
    // Solo le damos 5 días de gracia desde HOY si estaba vencido o le quedaban menos de 5 días.
    // Si tenía más de 5 días (pago anticipado), le dejamos su fecha intacta.
    const necesitaGracia = !vencActual || vencActual < new Date(ahora.getTime() + 5 * 86400000);
    
    if (necesitaGracia) {
      const fechaGracia = new Date();
      fechaGracia.setDate(fechaGracia.getDate() + 5);

      await adminSupabase
        .from('suscripciones_empresas')
        .upsert({
          empresa_id: perfil.empresa_id,
          plan: (subActual?.plan || plan_solicitado || 'STARTER').toUpperCase(),
          estado: 'GRACIA',
          fecha_vencimiento: fechaGracia.toISOString(),
          modulos_activos: subActual?.modulos_activos || [],
        }, { onConflict: 'empresa_id' });
    }
  } catch (e) {
    console.warn('No se pudo actualizar estado gracia — usando gracia silenciosa:', e);
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/billing');
  revalidatePath('/admin');
  revalidatePath('/admin/pagos');
  return { success: true };
}

