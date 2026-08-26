import React from 'react';
import { createClient } from '@/utils/supabase/server';
import ComprasClient from './ComprasClient';
import { cookies } from 'next/headers';

export default async function ComprasPage({ searchParams }: { searchParams: Promise<{ sede?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const empresaId = user?.app_metadata?.empresa_id;

  if (!empresaId) return <div className="p-8 text-rose-400">Error: No tienes empresa configurada.</div>;

  const { data: profile } = await supabase.from('perfiles').select('sede_id, rol').eq('id', user?.id).single();
  const { data: sedesDb } = await supabase.from('sedes').select('id, nombre_sede').eq('empresa_id', empresaId);
  const sedes = sedesDb || [];
  
  const cookieStore = await cookies();
  const activeSedeCookie = cookieStore.get('active_sede')?.value;

  let activeSedeId = profile?.sede_id;
  if (profile?.rol === 'MASTER' && params.sede) {
    activeSedeId = params.sede;
  } else if (profile?.rol === 'MASTER' && activeSedeCookie) {
    activeSedeId = activeSedeCookie;
  } else if (!activeSedeId && sedes.length > 0) {
    activeSedeId = sedes[0].id;
  }

  return <ComprasClient sedes={sedes} activeSedeId={activeSedeId || ''} profile={profile} />;
}
