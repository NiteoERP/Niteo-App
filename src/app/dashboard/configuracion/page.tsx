import React from 'react';
import { getEmpresaData } from './actions';
import GeneralForm from './GeneralForm';

export const metadata = {
  title: 'Perfil General | Configuración Niteo',
};

export default async function SettingsGeneralPage() {
  const { empresa, error } = await getEmpresaData();

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-800/80 pb-4">
        <h2 className="text-xl font-bold text-white">Perfil General de la Empresa</h2>
        <p className="text-xs text-neutral-400 mt-1">
          Actualiza los datos institucionales, rubro operativo y preferencias horarias.
        </p>
      </div>

      {empresa ? (
        <GeneralForm empresa={empresa} />
      ) : (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error || 'No se pudo cargar la información de la empresa.'}
        </div>
      )}
    </div>
  );
}
