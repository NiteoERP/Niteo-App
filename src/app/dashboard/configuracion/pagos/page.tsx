import React from 'react';
import { getEmpresaData } from '../actions';
import MetodosPagoManager from './MetodosPagoManager';

export const metadata = {
  title: 'Métodos de Pago | Configuración Niteo',
};

export default async function PagosConfigPage() {
  const { empresa, error } = await getEmpresaData();

  const initialMetodos: string[] = Array.isArray(empresa?.metodos_pago) ? empresa.metodos_pago : [];

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-800/80 pb-4">
        <h2 className="text-xl font-bold text-white">Centro de Métodos de Pago</h2>
        <p className="text-xs text-neutral-400 mt-1">
          Configura y organiza las formas de cobro en caja (POS) y las modalidades de desembolso para compras.
        </p>
      </div>

      {empresa ? (
        <MetodosPagoManager empresaId={empresa.id} initialMetodosVenta={initialMetodos} />
      ) : (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error || 'No se encontró la empresa asociada.'}
        </div>
      )}
    </div>
  );
}
