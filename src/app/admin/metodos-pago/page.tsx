import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getMetodosPago } from './actions';
import AdminMetodosPagoClient from './AdminMetodosPagoClient';

export default async function AdminMetodosPagoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
  if (perfil?.rol !== 'SUPERADMIN') redirect('/dashboard');

  const { metodos } = await getMetodosPago();

  return <AdminMetodosPagoClient metodos={metodos} />;
}
