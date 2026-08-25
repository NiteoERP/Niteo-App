import React from 'react';
import { createClient } from '@/utils/supabase/server';
import TeamManager from './TeamManager';
import { redirect } from 'next/navigation';

export default async function EquipoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const empresaId = user?.app_metadata?.empresa_id;
  const userRole = user?.app_metadata?.user_role;

  if (!empresaId) return <div className="p-8 text-rose-400">Error: No tienes empresa configurada.</div>;
  if (userRole !== 'MASTER') redirect('/dashboard'); // Solo Master puede ver el equipo

  const { data: miembros } = await supabase
    .from('perfiles')
    .select('id, nombre_completo, rol')
    .eq('empresa_id', empresaId)
    .order('rol', { ascending: false }); // MASTERs primeros

  return (
    <div className="space-y-8 max-w-5xl animate-in fade-in duration-300">
      
      <div className="border-b border-neutral-800 pb-5">
        <h1 className="text-xl md:text-2xl font-bold text-white">Gestión de Equipo</h1>
        <p className="text-neutral-400 text-xs md:text-sm mt-1">Administra los accesos y roles de tu personal en la plataforma.</p>
      </div>

      <TeamManager initialMembers={miembros || []} currentUserId={user.id} />
      
    </div>
  );
}

