'use server'

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function completarOnboarding(formData: FormData) {
  const supabase = await createClient();
  
  const fullName = formData.get('fullName') as string;
  const companyName = formData.get('companyName') as string;

  if (!fullName || !companyName) {
    return; // O manejar error
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  // Bypass RLS para el onboarding usando Service Role
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Crear Empresa
  const { data: empresa, error: empErr } = await supabaseAdmin
    .from('empresas')
    .insert({ nombre_comercial: companyName })
    .select('id')
    .single();

  if (empErr || !empresa) {
    console.error('Error al crear empresa:', empErr);
    return;
  }

  // 2. Crear Sede Principal
  const { data: sede, error: sedeErr } = await supabaseAdmin
    .from('sedes')
    .insert({ empresa_id: empresa.id, nombre_sede: 'Sede Principal' })
    .select('id')
    .single();

  if (sedeErr || !sede) {
    console.error('Error al crear sede:', sedeErr);
    return;
  }

  // 3. Crear Perfil
  const { error: profErr } = await supabaseAdmin
    .from('perfiles')
    .insert({
      id: user.id,
      empresa_id: empresa.id,
      sede_id: sede.id,
      nombre_completo: fullName,
      rol: 'MASTER'
    });

  if (profErr) {
    console.error('Error al crear perfil:', profErr);
    return;
  }

  // El trigger en postgres (on_empresa_created) debería haber creado la suscripción.
  redirect('/dashboard');
}
