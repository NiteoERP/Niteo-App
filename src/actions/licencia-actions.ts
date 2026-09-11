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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!perfil) return null;

  const { data: empresa } = await supabase
    .from('empresas')
    .select('fecha_registro, plan_suscripcion, fecha_vencimiento_plan, modulos_activos, estado_suscripcion')
    .eq('id', perfil.empresa_id)
    .single();

  if (!empresa) return null;

  const hoy = new Date();
  
  let fechaVenc = empresa.fecha_vencimiento_plan ? new Date(empresa.fecha_vencimiento_plan) : null;
  const modulos = empresa.modulos_activos || [];
  const plan = empresa.plan_suscripcion || 'starter';

  // Si no hay fecha de vencimiento, usamos 14 días desde el registro (TRIAL)
  if (!fechaVenc) {
    const registro = empresa.fecha_registro ? new Date(empresa.fecha_registro) : new Date();
    fechaVenc = new Date(registro);
    fechaVenc.setDate(fechaVenc.getDate() + 14);
  }

  const difDias = differenceInDays(fechaVenc, hoy);
  
  let estado: 'ACTIVA' | 'TRIAL' | 'GRACIA' | 'VENCIDA' = 'ACTIVA';
  let bloqueoFuerte = false;

  if (difDias < 0) {
    if (difDias >= -3) {
      estado = 'GRACIA';
    } else {
      estado = 'VENCIDA';
      bloqueoFuerte = true;
    }
  } else {
    estado = empresa.estado_suscripcion === 'TRIAL' ? 'TRIAL' : 'ACTIVA';
  }

  return {
    estado,
    diasRestantes: difDias,
    diasVencido: difDias < 0 ? Math.abs(difDias) : 0,
    planSuscripcion: plan,
    modulosActivos: modulos,
    fechaVencimiento: fechaVenc.toISOString(),
    bloqueoFuerte,
  };
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
    const ext = archivo.name.split('.').pop();
    const fileName = `${perfil.empresa_id}/${Date.now()}.${ext}`;
    const { data: fileData, error: fileError } = await supabase.storage
      .from('comprobantes')
      .upload(fileName, archivo);
      
    if (fileError) {
      console.error(fileError);
      return { success: false, error: 'Error subiendo comprobante' };
    }
    comprobante_url = fileData.path;
  }

  const { error } = await supabase.from('pagos_suscripcion').insert({
    empresa_id: perfil.empresa_id,
    usuario_id: user.id,
    monto,
    metodo_pago,
    referencia,
    plan_solicitado,
    comprobante_url,
    estado: 'PENDIENTE'
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
