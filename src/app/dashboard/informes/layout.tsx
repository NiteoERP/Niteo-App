import React from 'react';
import { getEstadoLicencia } from '@/actions/licencia-actions';
import LicenseLock from '@/components/licencias/LicenseLock';

export default async function InformesLayout({ children }: { children: React.ReactNode }) {
  const licencia = await getEstadoLicencia();
  
  return (
    <div className="relative h-full min-h-[500px]">
      {licencia?.bloqueoFuerte && <LicenseLock licencia={licencia} moduloNombre="Informes" />}
      
      <div className={licencia?.bloqueoFuerte ? 'opacity-20 pointer-events-none' : ''}>
        {children}
      </div>
    </div>
  );
}
