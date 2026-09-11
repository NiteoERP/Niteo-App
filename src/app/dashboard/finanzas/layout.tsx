import React from 'react';
import { getEstadoLicencia } from '@/actions/licencia-actions';
import LicenseLock from '@/components/licencias/LicenseLock';

export default async function FinanzasLayout({ children }: { children: React.ReactNode }) {
  const licencia = await getEstadoLicencia();
  
  return (
    <div className="relative h-full">
      {licencia?.bloqueoFuerte && <LicenseLock licencia={licencia} moduloNombre="Finanzas" />}
      
      <div className={licencia?.bloqueoFuerte ? 'opacity-20 pointer-events-none' : ''}>
        {children}
      </div>
    </div>
  );
}
