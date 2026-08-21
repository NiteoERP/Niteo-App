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
