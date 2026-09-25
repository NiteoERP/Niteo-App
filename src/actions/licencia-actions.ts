'use server';

import { createClient } from '@/utils/supabase/server';
import { differenceInDays, addDays } from 'date-fns';
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
      fechaVenc.setDate(fechaVenc.getDate() + 7); // Changed from 14 to 7 for the 7-day trial
    }

    const difDias = differenceInDays(fechaVenc, hoy);

    // Revisar pagos pendientes en suscripciones_pagos
    let enGraciaSilenciosa = false;
    try {
      const { data: pagoPendiente } = await supabase
        .from('suscripciones_pagos')
        .select('*')
        .eq('empresa_id', perfil.empresa_id)
        .eq('estado', 'pendiente_aprobacion')
        .limit(1)
        .maybeSingle();

      const dateField = pagoPendiente?.fecha_registro || pagoPendiente?.fecha_reporte || pagoPendiente?.created_at;
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
    // (o desde la fecha de pago)
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
      // If there is a sub record, check its state. Otherwise default to TRIAL.
      const estadoSub = sub ? (sub.estado || 'TRIAL').toUpperCase() : 'TRIAL';
      estado = (estadoSub === 'ACTIVA' || estadoSub === 'ACTIVO') ? 'ACTIVA' : 'TRIAL';
      
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

  const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!perfil) return { success: false, error: 'Sin perfil' };

  const monto = parseFloat(formData.get('monto') as string);
  const metodo_pago = formData.get('metodo_pago') as string;
  const referencia = formData.get('referencia') as string;
  const plan_solicitado = formData.get('plan_solicitado') as string;
  const archivo = formData.get('comprobante') as File;

  if (!monto || !metodo_pago) {
    return { success: false, error: 'Monto y método son requeridos' };
  }

  let comprobante_url = null;

  if (archivo && archivo.size > 0) {
    try {
      const ext = archivo.name.split('.').pop();
      const fileName = `${perfil.empresa_id}/${Date.now()}.${ext}`;
      const { data: fileData, error: fileError } = await supabase.storage
        .from('comprobantes')
        .upload(fileName, archivo);
        
      if (!fileError && fileData) {
        comprobante_url = fileData.path;
      }
    } catch (e) {
      console.warn('Error al subir comprobante:', e);
    }
  }

  const modulos = formData.get('modulos') as string;
  const ciclo   = (formData.get('ciclo') as string) || 'mensual'; // mensual | anual
  // planCompleto: "PRO [ANUAL] + [recetas,multi-price]" o "PRO [MENSUAL] + [recetas]"
  const cicloTag    = ciclo === 'anual' ? '[ANUAL]' : '[MENSUAL]';
  const planConCiclo = `${plan_solicitado || 'STARTER'} ${cicloTag}`;
  const planCompleto = modulos ? `${planConCiclo} + [${modulos}]` : planConCiclo;

  // Insertar en suscripciones_pagos con columnas dedicadas para plan y comprobante
  const { error } = await supabase.from('suscripciones_pagos').insert({
    empresa_id: perfil.empresa_id,
    monto,
    metodo_pago,
    referencia: referencia || 'S/R',   // referencia original del cliente, intacta y limpia
    plan_solicitado: planCompleto,      // columna dedicada — sin mezclar con referencia
    comprobante_url,                    // URL del archivo en Storage
    moneda: 'USD',
    estado: 'pendiente_aprobacion',
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // ── AUTO-GRACIA O MANTENER ACTIVO ──
  // Si el usuario reporta un pago, no queremos reducirle el tiempo si estaba haciendo un pago anticipado.
  // Vamos a obtener su suscripción actual:
  try {
    const { data: subActual } = await supabase
      .from('suscripciones_empresas')
      .select('estado, fecha_vencimiento')
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

      await supabase
        .from('suscripciones_empresas')
        .upsert({
          empresa_id: perfil.empresa_id,
          plan: planCompleto.split(' ')[0].toUpperCase() || 'STARTER',
          estado: 'gracia',
          fecha_vencimiento: fechaGracia.toISOString(),
        }, { onConflict: 'empresa_id' });
    }
  } catch {
    console.warn('No se pudo actualizar estado gracia — usando gracia silenciosa');
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/billing');
  return { success: true };
}
