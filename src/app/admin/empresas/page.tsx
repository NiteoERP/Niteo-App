import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getEmpresas } from './actions';
import AdminEmpresasClient from './AdminEmpresasClient';

export default async function AdminEmpresasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
  if (perfil?.rol !== 'SUPERADMIN') redirect('/dashboard');

  const { empresas } = await getEmpresas();

  return <AdminEmpresasClient empresas={empresas} />;
}
