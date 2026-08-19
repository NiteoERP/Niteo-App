'use server';

import { createClient } from '@/utils/supabase/server';
import { randomUUID } from 'crypto';

export async function setupWorkspace(formData: {
  nombreEmpresa: string;
  nombreSede: string;
  sistemaPos: string;
}) {
  const supabase = await createClient();

  // 1. Obtener usuario autenticado
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { success: false, error: 'No estás autorizado. Inicia sesión nuevamente.' };
  }

  // 2. Llamar al RPC para evitar problemas de RLS
  const { data: masterKey, error: rpcErr } = await supabase.rpc('rpc_completar_onboarding', {
    p_nombre_completo: user.user_metadata?.full_name || 'Admin',
    p_nombre_comercial: formData.nombreEmpresa,
    p_nombre_sede: formData.nombreSede,
    p_sistema_pos: formData.sistemaPos
  });

  if (rpcErr) {
    return { success: false, error: 'Error al configurar el espacio: ' + rpcErr.message };
  }

  return { success: true, masterKey: masterKey as string };
}

