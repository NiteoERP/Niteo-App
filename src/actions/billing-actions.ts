'use server';

import { createClient } from '@/utils/supabase/server';

export async function activarTrialAction() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Usuario no autenticado" };

    const empresaId = user.app_metadata?.empresa_id;

    if (!empresaId) return { success: false, error: "No tienes una empresa asignada." };

    // Llamar al RPC en el backend
    const { data, error } = await supabase.rpc('rpc_activar_trial');

    if (error) {
      console.error("RPC Error:", error);
      return { success: false, error: error.message || "Error al ejecutar RPC en Supabase" };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Action Catch Error:", err);
    return { success: false, error: err.message || "Error desconocido en el servidor" };
  }
}

export async function reportarPagoManual(metodo: string, referencia: string, monto: number, banco_destino: string = '', fecha_pago: string = '') {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Usuario no autenticado' };

    const empresaId = user.app_metadata?.empresa_id;
    if (!empresaId) return { success: false, error: 'Sin empresa asignada' };

    const { error } = await supabase.from('suscripciones_pagos').insert({
      empresa_id: empresaId,
      metodo_pago: metodo,
      referencia: referencia,
      monto: monto,
      estado: 'pendiente_aprobacion', banco_destino, fecha_pago
    });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error reportando pago:', err);
    return { success: false, error: err.message };
  }
}

export async function aprobarPagoManual(pagoId: string, empresaId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.user_role !== 'MASTER') {
      return { success: false, error: 'No autorizado' };
    }

    const { error: errPago } = await supabase
      .from('suscripciones_pagos')
      .update({ estado: 'aprobado', fecha_revision: new Date().toISOString(), revisado_por: user.id })
      .eq('id', pagoId);
    if (errPago) throw errPago;

    const { error: errSub } = await supabase
      .from('suscripciones_empresas')
      .update({ plan: 'PRO', estado: 'activa' })
      .eq('empresa_id', empresaId);
    if (errSub) throw errSub;

    return { success: true };
  } catch (err: any) {
    console.error('Error aprobando pago:', err);
    return { success: false, error: err.message };
  }
}
