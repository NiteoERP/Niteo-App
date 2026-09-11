import React from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { EstadoLicencia } from '@/actions/licencia-actions';

interface LicenseLockProps {
  licencia: EstadoLicencia;
  moduloNombre: string;
}

export default function LicenseLock({ licencia, moduloNombre }: LicenseLockProps) {
  if (!licencia.bloqueoFuerte) return null; // No debe mostrarse si no hay bloqueo fuerte

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-2xl">
      <div className="bg-neutral-900 border border-red-500/30 p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center max-w-md mx-4">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6">
          <Lock size={32} />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">Módulo Bloqueado</h2>
        <p className="text-neutral-400 mb-6">
          El acceso a <strong>{moduloNombre}</strong> está restringido porque tu licencia tiene {licencia.diasVencido} días de vencimiento. 
          El Terminal POS sigue funcionando para no detener tus ventas.
        </p>

        <Link 
          href="/dashboard/billing"
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-colors"
        >
          Renovar Licencia
        </Link>
      </div>
    </div>
  );
}
