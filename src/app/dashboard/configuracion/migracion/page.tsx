import React from 'react';
import MigracionClient from './MigracionClient';

export const metadata = {
  title: 'Migración de Datos | Niteo',
};

export default function MigracionPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/50 pb-4">
        <div>
          <h2 className="text-xl font-medium text-white">Migración de Datos</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Importa o exporta tu catálogo de productos utilizando archivos Excel (.xlsx).
          </p>
        </div>
      </div>
      <MigracionClient />
    </div>
  );
}
