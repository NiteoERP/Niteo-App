import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { Building2, CreditCard, Activity, AlertCircle } from 'lucide-react';

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Obtener métricas básicas
  const { count: empresasCount } = await supabase.from('empresas').select('*', { count: 'exact', head: true });
  
  const { count: pagosPendientes } = await supabase
    .from('pagos_suscripcion')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'PENDIENTE');

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-white mb-2">Panel Master</h1>
        <p className="text-neutral-400">Visión general del ecosistema SaaS Niteo.</p>
      </header>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Building2 className="text-blue-400" size={24} />
          </div>
          <div>
            <p className="text-sm text-neutral-400 font-medium">Empresas Registradas</p>
            <p className="text-2xl font-bold text-white">{empresasCount || 0}</p>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <AlertCircle className="text-amber-400" size={24} />
          </div>
          <div>
            <p className="text-sm text-neutral-400 font-medium">Pagos por Aprobar</p>
            <p className="text-2xl font-bold text-white">{pagosPendientes || 0}</p>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <CreditCard className="text-emerald-400" size={24} />
          </div>
          <div>
            <p className="text-sm text-neutral-400 font-medium">MRR (Ingreso Recurrente)</p>
            <p className="text-2xl font-bold text-white">Proximamente</p>
          </div>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Acciones Rápidas</h2>
        <div className="flex gap-4">
          <a href="/admin/pagos" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors">
            Revisar Pagos
          </a>
          <a href="/admin/empresas" className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-colors">
            Gestionar Empresas y Descuentos
          </a>
        </div>
      </div>
    </div>
  );
}
