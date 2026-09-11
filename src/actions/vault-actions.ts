'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export interface SavedAccount {
  id: string;
  email: string;
  nombre: string;
  empresa: string;
  refresh_token: string;
}

const VAULT_COOKIE = 'niteo_saved_accounts';

export async function getSavedAccounts(): Promise<SavedAccount[]> {
  const cookieStore = await cookies();
  const vault = cookieStore.get(VAULT_COOKIE);
  if (!vault) return [];
  try {
    return JSON.parse(vault.value);
  } catch {
    return [];
  }
}

export async function saveCurrentSessionToVault() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) return;

  const { data: perfil } = await supabase.from('perfiles').select('id, empresa_id').eq('id', session.user.id).single();
  let empresaNombre = 'Empresa Desconocida';
  let userName = session.user.user_metadata?.full_name || session.user.email;

  if (perfil?.empresa_id) {
    const { data: emp } = await supabase.from('empresas').select('nombre_comercial').eq('id', perfil.empresa_id).single();
    if (emp) empresaNombre = emp.nombre_comercial;
  }

  const newAccount: SavedAccount = {
    id: session.user.id,
    email: session.user.email || '',
    nombre: userName,
    empresa: empresaNombre,
    refresh_token: session.refresh_token
  };

  const currentAccounts = await getSavedAccounts();
  const existingIndex = currentAccounts.findIndex(a => a.id === session.user.id);

  if (existingIndex >= 0) {
    currentAccounts[existingIndex] = newAccount;
  } else {
    currentAccounts.push(newAccount);
  }

  const cookieStore = await cookies();
  cookieStore.set(VAULT_COOKIE, JSON.stringify(currentAccounts), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 año
    path: '/'
  });
}

export async function switchAccount(refreshToken: string) {
  const supabase = await createClient();
  // Al hacer refreshSession, Supabase SSR automáticamente sobreescribe las cookies de auth
  // con la sesión de esta otra cuenta.
  const { error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  
  if (error) {
    // Si el token expiró, lo removemos del vault y mandamos a login
    return { success: false, error: 'La sesión expiró. Debes volver a iniciar sesión.' };
  }

  revalidatePath('/dashboard', 'layout');
  redirect('/dashboard');
}

export async function removeSavedAccount(accountId: string) {
  const currentAccounts = await getSavedAccounts();
  const filtered = currentAccounts.filter(a => a.id !== accountId);
  const cookieStore = await cookies();
  
  cookieStore.set(VAULT_COOKIE, JSON.stringify(filtered), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/'
  });

  revalidatePath('/login');
}
