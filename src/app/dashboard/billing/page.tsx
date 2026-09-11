import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { getEstadoLicencia } from '@/actions/licencia-actions';
import { getMetodosPagoActivos } from '../../../app/admin/metodos-pago/actions';
import BillingClientForm from './BillingClientForm';
import { CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function BillingPage() {
  const licencia = await getEstadoLicencia();
  
  if (!licencia) {
    redirect('/login');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from('perfiles').select('empresa_id, rol').eq('id', user?.id).single();
  
  if (perfil?.rol !== 'MASTER' && perfil?.rol !== 'SUPERADMIN') {
    redirect('/dashboard');
  }
  
  let historialPagos: any[] = [];
  try {
    const { data: pagos } = await supabase
      .from('suscripciones_pagos')
      .select('*')
      .eq('empresa_id', perfil?.empresa_id)
      .order('fecha_registro', { ascending: false });
    historialPagos = pagos || [];
  } catch {
    historialPagos = [];
  }

  // Cargar métodos de pago activos desde la tabla niteo_metodos_pago
  let metodosPago: any[] = [];
  try {
    metodosPago = await getMetodosPagoActivos();
  } catch {
    metodosPago = [];
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Facturación y Licencia</h1>
          <p className="text-neutral-400 text-sm">Gestiona tu plan de Niteo, añade módulos y reporta tus pagos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Estado actual */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Estado Actual</h2>
            
            <div className={`p-4 rounded-xl border mb-6 ${
              licencia.estado === 'ACTIVA' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
              licencia.estado === 'TRIAL' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
              licencia.estado === 'GRACIA' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
              'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              <div className="flex items-center gap-2 font-bold mb-1">
                {licencia.estado === 'ACTIVA' && <CheckCircle size={18} />}
                {licencia.estado === 'TRIAL' && <ShieldCheck size={18} />}
                {(licencia.estado === 'GRACIA' || licencia.estado === 'VENCIDA') && <AlertTriangle size={18} />}
                Licencia {licencia.estado}
              </div>
              <p className="text-sm opacity-90">
                {licencia.planSuscripcion === 'LIFETIME' 
                  ? 'Acceso de por vida'
                  : licencia.estado === 'VENCIDA'
                    ? `Vencida hace ${licencia.diasVencido} días`
                    : licencia.estado === 'ACTIVA'
                      ? `Renovación en ${licencia.diasRestantes} días`
                      : licencia.estado === 'GRACIA'
                        ? `Pago en revisión (Gracia: ${licencia.diasRestantes} días)`
                        : `Quedan ${licencia.diasRestantes} días`}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider mb-1">Plan Actual</p>
                <p className="text-white font-medium capitalize">{licencia.planSuscripcion}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider mb-1">Módulos Activos</p>
                {licencia.modulosActivos.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {licencia.modulosActivos.map(m => (
                      <span key={m} className="px-2 py-1 bg-neutral-800 text-neutral-300 rounded text-xs">
                        {m}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-400 text-sm">Ninguno</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Reportar Pago */}
        <div className="lg:col-span-2">
          <BillingClientForm 
            historialPagos={historialPagos || []} 
            planActual={licencia.planSuscripcion}
            modulosActuales={licencia.modulosActivos || []}
            metodosPago={metodosPago}
          />
        </div>

      </div>
    </div>
  );
}


