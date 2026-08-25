import React from 'react';
import { createClient } from '@/utils/supabase/server';
import BillingClient from './BillingClient';

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  const empresaId = user.app_metadata?.empresa_id;

  let sub = null;
  if (empresaId) {
    const { data } = await supabase
      .from('suscripciones_empresas')
      .select('*')
      .eq('empresa_id', empresaId)
      .single();
    sub = data;
  }

  // Determine current active plan
  let planActual = 'INACTIVO';
  if (sub?.estado === 'activa') {
    planActual = sub.plan || 'TRIAL';
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-12 animate-in fade-in duration-500">
      
      {planActual !== 'LIFETIME' && (
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            Escala tu negocio con <span className="text-indigo-400">Niteo PRO</span>
          </h1>
          <p className="text-neutral-400 max-w-2xl mx-auto text-lg">
            Elige el plan que mejor se adapte al tamaño de tu empresa. Cambia de plan o cancela en cualquier momento.
          </p>
        </div>
      )}

      <BillingClient planActual={planActual} />

      {planActual !== 'LIFETIME' && (
        <div className="text-center pt-12 border-t border-neutral-800">
          <p className="text-sm text-neutral-500">
            Aceptamos Binance Pay para pagos automáticos en criptomonedas, y transferencias manuales vía Zelle o Pago Móvil.
            <br/> Tu suscripción se activará inmediatamente tras la confirmación.
          </p>
        </div>
      )}
    </div>
  );
}
