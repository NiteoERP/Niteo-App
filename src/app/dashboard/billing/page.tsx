'use client';

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';

export default function BillingPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleActivarTrial = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // Usar Server Action importado dinámicamente o fetch a un API si no es Server Component puro.
      // Mejor importar la acción en la parte superior: import { activarTrialAction } from '@/actions/billing-actions';
      const { activarTrialAction } = await import('@/actions/billing-actions');
      const res = await activarTrialAction();
      
      if (res.success) {
        window.location.href = '/dashboard';
      } else {
        setErrorMsg("Error de validación: " + res.error);
        setLoading(false);
      }
    } catch (e: any) {
      setErrorMsg("Fallo crítico en el navegador: " + e.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center space-y-6">
      <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </div>
      <h1 className="text-3xl font-bold text-white tracking-tight">Suscripción Inactiva</h1>
      <p className="text-neutral-400 max-w-md">
        No pudimos validar una suscripción activa para tu empresa. Por favor, contacta con soporte o activa tu periodo de prueba para continuar utilizando Niteo ERP.
      </p>

      {errorMsg && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-rose-500/30 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl shadow-rose-500/20 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Error de Activación</h3>
            <p className="text-sm text-neutral-400 mb-6">{errorMsg}</p>
            <button 
              onClick={() => setErrorMsg('')}
              className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 rounded-xl transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-4 pt-4">
        <a href="mailto:soporte@niteo.app" className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors border border-neutral-700">
          Contactar Soporte
        </a>
        <button 
          onClick={handleActivarTrial}
          disabled={loading}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-600/20 flex items-center justify-center min-w-[200px]"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Probar Versión PRO (7 Días)'}
        </button>
      </div>
    </div>
  );
}
