import React from 'react';
import { createClient } from '@/utils/supabase/server';
import DespachosManager from './DespachosManager';
import { Truck } from 'lucide-react';

export default async function DespachosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const empresaId = user?.app_metadata?.empresa_id;

  if (!empresaId) return <div className="p-8 text-rose-400">Error: No tienes empresa configurada.</div>;

  return (
    <div className="flex h-full w-full bg-neutral-950 text-white flex-col relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-neutral-800 bg-neutral-900/50 relative z-10">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="text-indigo-400" size={28} />
            Módulo de Despachos
          </h1>
          <p className="text-neutral-400 text-sm mt-1">Gestiona el traslado de insumos entre sedes.</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <DespachosManager empresaId={empresaId} />
      </div>
    </div>
  );
}
