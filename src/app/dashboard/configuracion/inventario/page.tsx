import React from 'react';
import { getEmpresaData } from '../actions';
import InventarioConfigForm from './InventarioConfigForm';

export const metadata = {
  title: 'Inventario & Costeo | Configuración Niteo',
};

export default async function InventarioConfigPage() {
  const { empresa, error } = await getEmpresaData();

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-800/80 pb-4">
        <h2 className="text-xl font-bold text-white">Inventario & Valoración de Costo</h2>
        <p className="text-xs text-neutral-400 mt-1">
          Configura las fórmulas y reglas para calcular el costo promedio de tus productos y mercancías transferidas.
        </p>
      </div>

      {empresa ? (
        <InventarioConfigForm empresa={empresa} />
      ) : (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error || 'No se encontró la empresa asociada.'}
        </div>
      )}
    </div>
  );
}
