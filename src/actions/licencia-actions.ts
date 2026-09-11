'use server';

import { createClient } from '@/utils/supabase/server';
import { differenceInDays } from 'date-fns';

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
      .select('plan, estado, fecha_vencimiento, fecha_registro')
      .eq('empresa_id', perfil.empresa_id)
      .maybeSingle();

    // Consultar el estado en la tabla de empresas (fallback si no hay suscripción)
    const { data: empresa } = await supabase
      .from('empresas')
      .select('fecha_registro, plan, estado')
      .eq('id', perfil.empresa_id)
      .single();

    // Determinar el plan activo
    const plan = (sub?.plan || empresa?.plan || 'PRO').toUpperCase();

    const hoy = new Date();

    // Plan LIFETIME
    if (plan === 'LIFETIME') {
      return {
        estado: 'ACTIVA',
        diasRestantes: 9999,
        diasVencido: 0,
        planSuscripcion: 'LIFETIME',
        modulosActivos: [],
        fechaVencimiento: '2099-12-31T23:59:59.000Z',
        bloqueoFuerte: false,
      };
    }

    let fechaVenc: Date | null = null;
    if (sub?.fecha_vencimiento) {
      fechaVenc = new Date(sub.fecha_vencimiento);
    } else if (empresa?.fecha_vencimiento_plan) {
      fechaVenc = new Date(empresa.fecha_vencimiento_plan);
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
        .select('fecha_registro')
        .eq('empresa_id', perfil.empresa_id)
        .eq('estado', 'pendiente_aprobacion')
        .order('fecha_registro', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pagoPendiente?.fecha_registro) {
        const diasDesdePago = differenceInDays(hoy, new Date(pagoPendiente.fecha_registro));
        if (diasDesdePago <= 5) {
          enGraciaSilenciosa = true;
        }
      }
    } catch {
      // Ignorar
    }

    let estado: 'ACTIVA' | 'TRIAL' | 'GRACIA' | 'VENCIDA' = 'ACTIVA';
    let bloqueoFuerte = false;

    if (difDias < 0) {
      if (enGraciaSilenciosa) {
        estado = 'GRACIA';
        bloqueoFuerte = false;
      } else if (difDias >= -3) {
        estado = 'GRACIA';
      } else {
        estado = 'VENCIDA';
        bloqueoFuerte = true;
      }
    } else {
      // If there is a sub record, check its state. Otherwise default to TRIAL.
      const estadoSub = sub ? (sub.estado || 'TRIAL').toUpperCase() : 'TRIAL';
      estado = (estadoSub === 'ACTIVA' || estadoSub === 'ACTIVO') ? 'ACTIVA' : 'TRIAL';
    }

    return {
      estado,
      diasRestantes: difDias,
      diasVencido: difDias < 0 ? Math.abs(difDias) : 0,
      planSuscripcion: plan,
      modulosActivos: [],
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
  const planCompleto = modulos ? `${plan_solicitado || 'STARTER'} + [${modulos}]` : (plan_solicitado || 'STARTER');

  // Intentar insertar en suscripciones_pagos primero (tabla estándar)
  const { error } = await supabase.from('suscripciones_pagos').insert({
    empresa_id: perfil.empresa_id,
    monto,
    metodo_pago,
    referencia: referencia ? `${referencia} (${planCompleto})` : `S/R (${planCompleto})`,
    moneda: 'USD',
    estado: 'pendiente_aprobacion',
  });

  if (error) {
    // Si falla, intentar en pagos_suscripcion como fallback
    try {
      await supabase.from('pagos_suscripcion').insert({
        empresa_id: perfil.empresa_id,
        usuario_id: user.id,
        monto,
        metodo_pago,
        referencia,
        plan_solicitado: planCompleto,
        comprobante_url,
        estado: 'PENDIENTE'
      });
      return { success: true };
    } catch {
      return { success: false, error: error.message };
    }
  }

  return { success: true };
}
