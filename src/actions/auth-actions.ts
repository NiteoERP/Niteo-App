'use server'

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function registrarUsuario(formData: FormData) {
  const supabase = await createClient();
  
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const companyName = formData.get('companyName') as string;

  // Validación básica
  if (!email || !password || !fullName || !companyName) {
    return redirect(`/register?error=Por favor, completa todos los campos obligatorios.`);
  }

  if (password.length < 6) {
    return redirect(`/register?error=La contraseña debe tener al menos 6 caracteres.`);
  }

  // 1. Registro en Supabase Auth
  // Pasamos el fullName y companyName como metadata para que el Trigger SQL
  // construya el Tenant automáticamente sin riesgo de fallos parciales.
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        company_name: companyName,
      }
    }
  });

  if (error) {
    return redirect(`/register?error=${encodeURIComponent(error.message)}`);
  }

  // Al no tener confirmación de email (PLG activado), la sesión ya se establece.
  // 2. Redirigir al usuario a su nuevo ecosistema (Dashboard principal)
  redirect('/dashboard');
}

export async function iniciarSesion(formData: FormData) {
  const supabase = await createClient();
  
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Login error:', error.message);
    return redirect(`/login?error=${encodeURIComponent('Error: ' + error.message)}`);
  }

  redirect('/dashboard');
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
