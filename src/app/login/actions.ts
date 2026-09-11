'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { translateAuthError } from '@/utils/errors'

export async function login(prevState: any, formData: FormData) {
  const rawEmail = formData.get('email') as string;
  const email = rawEmail ? rawEmail.trim().toLowerCase() : '';
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Por favor, completa todos los campos.' };
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Login error:', error.message);
    return { error: translateAuthError(error.message) }
  }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single()

  try {
    const { saveCurrentSessionToVault } = await import('@/actions/vault-actions');
    await saveCurrentSessionToVault();
  } catch (err) {
    console.warn('Error guardando en vault tras login:', err);
  }

  if (perfil?.rol === 'SUPERADMIN') {
    revalidatePath('/admin')
    redirect('/admin')
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
