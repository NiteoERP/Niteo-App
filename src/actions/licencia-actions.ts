'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { differenceInDays } from 'date-fns';
import { revalidatePath } from 'next/cache';

export interface EstadoLicencia {
  estado: 'ACTIVA' | 'TRIAL' | 'GRACIA' | 'VENCIDA';
  diasRestantes: number;  // Si es negativo, indica días de vencido
  diasVencido: number;    // 0 si está activa, >0 si está vencida
  planSuscripcion: string;
  modulosActivos: string[];
  fechaVencimiento: string | null;
  bloqueoFuerte: boolean; // Si debe bloquear reportes/finanzas
}

export async function getEstadoLicencia(): Promise<EstadoLicencia | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('empresa_id')
      .eq('id', user.id)
      .single();

    if (!perfil?.empresa_id) return null;

    // 1. Consultar tabla oficial suscripciones_empresas
    const { data: sub } = await supabase
      .from('suscripciones_empresas')
      .select('plan, estado, fecha_vencimiento, fecha_registro, modulos_activos')
      .eq('empresa_id', perfil.empresa_id)
      .maybeSingle();

    // Consultar el estado en la tabla de empresas (fallback si no hay suscripción)
    const { data: empresa } = await supabase
      .from('empresas')
      .select('fecha_registro')
      .eq('id', perfil.empresa_id)
      .single();

    // Determinar el plan activo
    const plan = (sub?.plan || 'PRO').toUpperCase();
    const modulos = sub?.modulos_activos || [];

    const hoy = new Date();

    // Plan LIFETIME
    if (plan === 'LIFETIME') {
      return {
        estado: 'ACTIVA',
        diasRestantes: 9999,
        diasVencido: 0,
        planSuscripcion: 'LIFETIME',
        modulosActivos: modulos,
        fechaVencimiento: '2099-12-31T23:59:59.000Z',
        bloqueoFuerte: false,
      };
    }

    let fechaVenc: Date | null = null;
    if (sub?.fecha_vencimiento) {
      fechaVenc = new Date(sub.fecha_vencimiento);
    } else {
      const regDate = (sub?.fecha_registro || empresa?.fecha_registro) ? new Date(sub?.fecha_registro || empresa?.fecha_registro) : new Date();
      fechaVenc = new Date(regDate);
      fechaVenc.setDate(fechaVenc.getDate() + 7); // 7-day trial
    }

    const difDias = differenceInDays(fechaVenc, hoy);

    // Revisar pagos pendientes en suscripciones_pagos
    let enGraciaSilenciosa = false;
    try {
      const { data: pagoPendiente } = await supabase
        .from('suscripciones_pagos')
        .select('id, fecha_registro, estado')
        .eq('empresa_id', perfil.empresa_id)
        .eq('estado', 'pendiente_aprobacion')
        .order('fecha_registro', { ascending: false })
        .limit(1)
        .maybeSingle();

      const dateField = pagoPendiente?.fecha_registro;
      if (dateField) {
        const diasDesdePago = differenceInDays(hoy, new Date(dateField));
        if (diasDesdePago <= 5) {
          enGraciaSilenciosa = true;
        }
      }
    } catch {
      // Ignorar
    }

    let estado: 'ACTIVA' | 'TRIAL' | 'GRACIA' | 'VENCIDA' = 'ACTIVA';
    let bloqueoFuerte = false;
    let diasFinales = difDias;

    // Si hay un pago pendiente en los últimos 5 días, aseguramos al menos 5 días de gracia desde hoy
    if (enGraciaSilenciosa && diasFinales < 5) {
      diasFinales = 5;
    }

    if (diasFinales < 0) {
      if (diasFinales >= -3) {
        estado = 'GRACIA';
      } else {
        estado = 'VENCIDA';
        bloqueoFuerte = true;
      }
    } else {
      const estadoSub = sub ? (sub.estado || 'TRIAL').toUpperCase() : 'TRIAL';
      estado = (estadoSub === 'ACTIVA' || estadoSub === 'ACTIVO') ? 'ACTIVA' : (estadoSub === 'GRACIA' ? 'GRACIA' : 'TRIAL');
      
      // Si el pago está en verificación, anulamos el modo TRIAL y mostramos GRACIA
      if (enGraciaSilenciosa && estado !== 'ACTIVA') {
        estado = 'GRACIA';
      }
    }

    return {
      estado,
      diasRestantes: diasFinales,
      diasVencido: diasFinales < 0 ? Math.abs(diasFinales) : 0,
      planSuscripcion: plan,
      modulosActivos: modulos,
      fechaVencimiento: fechaVenc.toISOString(),
      bloqueoFuerte,
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
    };
  }
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

