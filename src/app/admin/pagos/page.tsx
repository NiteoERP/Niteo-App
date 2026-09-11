import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getPagosPendientes, getPagosHistorial } from './actions';
import AdminPagosClient from './AdminPagosClient';

export default async function AdminPagosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
  if (perfil?.rol !== 'SUPERADMIN') redirect('/dashboard');

  const [pendientesRes, historialRes] = await Promise.all([
    getPagosPendientes(),
    getPagosHistorial(),
  ]);

  return (
    <AdminPagosClient
      pagosPendientes={pendientesRes.pagos}
      pagosHistorial={historialRes.pagos}
    />
  );
}
