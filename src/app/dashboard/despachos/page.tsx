import React from 'react';
import { createClient } from '@/utils/supabase/server';
import DespachosManager from './DespachosManager';
import { Truck, FileText } from 'lucide-react';
import Link from 'next/link';

export default async function DespachosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const empresaId = user?.app_metadata?.empresa_id;

  if (!empresaId) return <div className="p-8 text-rose-400">Error: No tienes empresa configurada.</div>;

  // Obtener perfil para restricción de sedes
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('sede_id, rol')
    .eq('id', user.id)
    .single();

  const userRole = user.app_metadata?.user_role || perfil?.rol || 'CAJERO';
  const userSedeId = perfil?.sede_id || '';

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
        <div>
          <Link href="/dashboard/despachos/historial" className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg transition-colors border border-neutral-700 text-sm font-medium">
            <FileText size={18} />
            Ver Historial
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <DespachosManager empresaId={empresaId} userSedeId={userSedeId} userRole={userRole} />
      </div>
    </div>
  );
}
