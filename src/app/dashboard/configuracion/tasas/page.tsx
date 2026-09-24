import React from 'react';
import GlobalTasaManager from '@/components/configuracion/GlobalTasaManager';

export const metadata = {
  title: 'Monedas & Tasas | Configuración Niteo',
};

export default function TasasPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-800/80 pb-4">
        <h2 className="text-xl font-bold text-white">Monedas & Tasas de Cambio</h2>
        <p className="text-xs text-neutral-400 mt-1">
          Gestiona la tasa oficial del Banco Central de Venezuela (BCV), tasas personalizadas y conversión multimoneda.
        </p>
      </div>

      <GlobalTasaManager />
    </div>
  );
}
