'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

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

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('id, empresa_id')
    .eq('id', session.user.id)
    .maybeSingle();

  let empresaNombre = 'Empresa Desconocida';
  let userName = session.user.user_metadata?.full_name || session.user.email || 'Usuario';

  if (perfil?.empresa_id) {
    const { data: emp } = await supabase
      .from('empresas')
      .select('nombre_comercial')
      .eq('id', perfil.empresa_id)
      .maybeSingle();
    if (emp?.nombre_comercial) empresaNombre = emp.nombre_comercial;
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

export async function switchAccount(targetIdOrToken: string) {
  const cookieStore = await cookies();
  let currentAccounts = await getSavedAccounts();
  const supabase = await createClient();

  // 1. Resguardar la sesión actual activa antes de rotar
  try {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession?.user?.id && currentSession?.refresh_token) {
      const idx = currentAccounts.findIndex(a => a.id === currentSession.user.id);
      if (idx >= 0) {
        currentAccounts[idx].refresh_token = currentSession.refresh_token;
      }
    }
  } catch (e) {
    console.warn('No se pudo respaldar la sesión previa:', e);
  }

  // 2. Buscar la cuenta objetivo
  const targetAcc = currentAccounts.find(a => a.id === targetIdOrToken || a.refresh_token === targetIdOrToken);
  const tokenToUse = targetAcc ? targetAcc.refresh_token : targetIdOrToken;

  if (!tokenToUse) {
    return { success: false, error: 'Cuenta no encontrada en la lista.' };
  }

  // 3. Ejecutar refreshSession en Supabase
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: tokenToUse });

  if (error || !data.session) {
    console.error('Error al cambiar de cuenta en Supabase:', error?.message);
    
    // Si la sesión expiró o fue cerrada, removerla del vault para limpiar
    if (targetAcc) {
      currentAccounts = currentAccounts.filter(a => a.id !== targetAcc.id);
      cookieStore.set(VAULT_COOKIE, JSON.stringify(currentAccounts), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
        path: '/'
      });
    }

    return { 
      success: false, 
      error: 'La sesión de esta cuenta expiró o fue cerrada. Debes volver a iniciar sesión en ella.' 
    };
  }

  // 4. IMPORTANTE: Guardar el nuevo refresh_token generado por Supabase (Refresh Token Rotation)
  if (targetAcc) {
    targetAcc.refresh_token = data.session.refresh_token;
  } else {
    currentAccounts.push({
      id: data.session.user.id,
      email: data.session.user.email || '',
      nombre: data.session.user.user_metadata?.full_name || data.session.user.email || 'Usuario',
      empresa: 'Empresa',
      refresh_token: data.session.refresh_token
    });
  }

  cookieStore.set(VAULT_COOKIE, JSON.stringify(currentAccounts), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/'
  });

  revalidatePath('/dashboard', 'layout');
  return { success: true };
}

export async function addAccountToVault(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Por favor completa el correo y la contraseña.' };
  }

  const supabase = await createClient();

  // 1. Respaldar la sesión actual en el vault
  await saveCurrentSessionToVault();

  // 2. Iniciar sesión con la nueva cuenta
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    const { translateAuthError } = await import('@/utils/errors');
    return { success: false, error: translateAuthError(error?.message || 'Credenciales incorrectas.') };
  }

  // 3. Guardar la nueva cuenta en el vault
  await saveCurrentSessionToVault();

  revalidatePath('/dashboard', 'layout');
  return { success: true };
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

  revalidatePath('/dashboard', 'layout');
  revalidatePath('/login');
}
