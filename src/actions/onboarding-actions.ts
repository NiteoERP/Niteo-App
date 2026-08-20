'use server'

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function completarOnboarding(formData: FormData) {
  const supabase = await createClient();
  
  const fullName = formData.get('fullName') as string;
  const companyName = formData.get('companyName') as string;

  if (!fullName || !companyName) {
    return; // O manejar error
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  // Usar la función RPC para saltarse RLS de forma segura sin necesitar llaves maestras en Vercel
  const { error: rpcError } = await supabase.rpc('rpc_completar_onboarding', {
    p_nombre_completo: fullName,
    p_nombre_comercial: companyName,
    p_nombre_sede: 'Sede Principal',
    p_sistema_pos: 'Aronium'
  });

  if (rpcError) {
    console.error('Error en RPC onboarding:', rpcError);
    return;
  }

  redirect('/dashboard');
}
