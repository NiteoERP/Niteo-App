import React from 'react';
import ListasPreciosManager from './ListasPreciosManager';

export const metadata = {
  title: 'Listas de Precios | Configuración Niteo',
};

export default function ListasPreciosPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-800/80 pb-4">
        <h2 className="text-xl font-bold text-white">Listas de Precios</h2>
        <p className="text-xs text-neutral-400 mt-1">
          Gestiona múltiples listas de precios (Crédito, Mayor, Detal) y establece reglas de cálculo automático.
        </p>
      </div>

      <ListasPreciosManager />
    </div>
  );
}
