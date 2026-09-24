import React from 'react';
import TerminalesPOS from '@/components/configuracion/TerminalesPOS';

export const metadata = {
  title: 'Terminales POS | Configuración Niteo',
};

export default function TerminalesPOSPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-800/80 pb-4">
        <h2 className="text-xl font-bold text-white">Puntos de Venta (Terminales POS)</h2>
        <p className="text-xs text-neutral-400 mt-1">
          Asocia y administra las cajas registradoras físicas y terminales táctiles activas por sede.
        </p>
      </div>

      <TerminalesPOS />
    </div>
  );
}
