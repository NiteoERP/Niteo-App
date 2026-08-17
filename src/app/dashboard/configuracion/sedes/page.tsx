import React from 'react';
import { getSedes } from '@/actions/sedes-actions';
import SedesClient from './SedesClient';

export const metadata = {
  title: 'Configuración de Sedes | Niteo',
};

export default async function SedesPage() {
  const sedes = await getSedes();

  return (
    <div className="space-y-8">
      {/* Encabezado interno de la pestaña */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/50 pb-4">
        <div>
          <h2 className="text-xl font-medium text-white">Sedes y Vinculación POS</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Gestiona tus sucursales y genera llaves de acceso para vincular tus cajas (Niteo Sync).
          </p>
        </div>
      </div>

      <SedesClient initialSedes={sedes} />
    </div>
  );
}
