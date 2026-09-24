import React from 'react';
import { getEmpresaData } from '../actions';
import CatalogoConfigForm from './CatalogoConfigForm';

export const metadata = {
  title: 'Catálogo Online | Configuración Niteo',
};

export default async function CatalogoConfigPage() {
  const { empresa, error } = await getEmpresaData();

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-800/80 pb-4">
        <h2 className="text-xl font-bold text-white">Catálogo Online & WhatsApp</h2>
        <p className="text-xs text-neutral-400 mt-1">
          Habilita tu vitrina digital en la web y configura el número telefónico para recibir pedidos de clientes.
        </p>
      </div>

      {empresa ? (
        <CatalogoConfigForm empresa={empresa} />
      ) : (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error || 'No se encontró la empresa asociada.'}
        </div>
      )}
    </div>
  );
}
