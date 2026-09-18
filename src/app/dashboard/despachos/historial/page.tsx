import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { Truck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import HistorialClient from './HistorialClient';

export default async function HistorialDespachosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const empresaId = user?.app_metadata?.empresa_id;

  if (!empresaId) return <div className="p-8 text-rose-400">Error: No tienes empresa configurada.</div>;

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('sede_id, rol')
    .eq('id', user.id)
    .single();

  const userRole = user.app_metadata?.user_role || perfil?.rol || 'CAJERO';
  const userSedeId = perfil?.sede_id || '';

  // Get despachos
  let query = supabase
    .from('despachos')
    .select(`
      *,
      origen:sedes!despachos_sede_origen_id_fkey(nombre_sede),
      destino:sedes!despachos_sede_destino_id_fkey(nombre_sede),
      creador:perfiles!despachos_usuario_id_fkey(nombre_completo),
      items:despachos_items(*)
    `)
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false });

  if (userRole !== 'ADMINISTRADOR' && userRole !== 'GERENTE_GENERAL') {
    query = query.or(`sede_origen_id.eq.${userSedeId},sede_destino_id.eq.${userSedeId}`);
  }

  const { data: despachos } = await query;

  return (
    <div className="flex h-full w-full bg-neutral-950 text-white flex-col relative overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-neutral-800 bg-neutral-900/50 relative z-10">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="text-indigo-400" size={28} />
            Historial de Despachos
          </h1>
          <p className="text-neutral-400 text-sm mt-1">Revisa, confirma y corrige envíos entre sedes.</p>
        </div>
        <div>
          <Link href="/dashboard/despachos" className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg transition-colors border border-neutral-700 text-sm font-medium">
            <ArrowLeft size={18} />
            Volver a Nuevo Despacho
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <HistorialClient 
          despachos={despachos || []} 
          userSedeId={userSedeId} 
          userRole={userRole} 
        />
      </div>
    </div>
  );
}
