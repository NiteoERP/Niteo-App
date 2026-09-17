import React from 'react';
import MigracionClient from './MigracionClient';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Migración de Datos | Niteo',
};

export default async function MigracionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');
  if (user.app_metadata?.user_role !== 'MASTER') return redirect('/dashboard');

  const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  
  let sedes: any[] = [];
  if (perfil) {
    const { data: sedesData } = await supabase.from('sedes').select('id, nombre_sede').eq('empresa_id', perfil.empresa_id);
    sedes = sedesData || [];
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Migración de Datos</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Importa tus productos, clientes y facturación desde archivos Excel (.xlsx) o tu base de datos (.db).
          </p>
        </div>
      </div>
      <MigracionClient sedes={sedes} />
    </div>
  );
}



