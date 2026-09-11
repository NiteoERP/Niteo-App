'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock } from 'lucide-react';
import { EstadoLicencia } from '@/actions/licencia-actions';

interface LicenseBannerProps {
  licencia: EstadoLicencia;
}

export default function LicenseBanner({ licencia }: LicenseBannerProps) {
  if (licencia.estado === 'ACTIVA') return null;

  if (licencia.estado === 'TRIAL') {
    if (licencia.diasRestantes > 5) return null; // No molestar hasta los últimos 5 días
    
    return (
      <div className="bg-indigo-600/10 border-b border-indigo-500/20 px-4 py-2 flex items-center justify-center gap-3 text-indigo-400 text-sm">
        <Clock size={16} />
        <span>Tu periodo de prueba termina en <strong>{licencia.diasRestantes} días</strong>.</span>
        <Link href="/dashboard/billing" className="font-bold underline hover:text-indigo-300">
          Activar mi cuenta
        </Link>
      </div>
    );
  }

  if (licencia.estado === 'GRACIA') {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-center gap-3 text-amber-400 text-sm">
        <AlertTriangle size={16} />
        <span>Tu licencia se ha vencido. Tienes <strong>{3 - licencia.diasVencido} días</strong> de gracia antes del bloqueo de reportes.</span>
        <Link href="/dashboard/billing" className="font-bold underline hover:text-amber-300">
          Renovar ahora
        </Link>
      </div>
    );
  }

  if (licencia.estado === 'VENCIDA') {
    return (
      <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center justify-center gap-3 text-red-400 text-sm shadow-sm">
        <AlertTriangle size={16} />
        <span><strong>Licencia Vencida hace {licencia.diasVencido} días.</strong> El acceso a los módulos financieros ha sido restringido.</span>
        <Link href="/dashboard/billing" className="font-bold bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors">
          Solucionar
        </Link>
      </div>
    );
  }

  return null;
}
