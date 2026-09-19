'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Store } from 'lucide-react';

export default function SedeSelector({ sedes, activeSedeId }: { sedes: any[], activeSedeId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSede = e.target.value;
    document.cookie = `active_sede=${newSede}; path=/; max-age=31536000; SameSite=Lax;`;
    const params = new URLSearchParams(window.location.search);
    if (newSede === 'ALL') {
      params.delete('sede');
    } else {
      params.set('sede', newSede);
    }
    // Forzar navegación completa para que todas las pantallas y Server Components
    // recarguen inmediatamente los datos de la nueva sede seleccionada sin caché obsoleto
    window.location.href = `${window.location.pathname}?${params.toString()}`;
  };

  if (sedes.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 w-fit">
      <Store size={16} className="text-indigo-400" />
      <span className="text-sm font-medium text-neutral-400">Sede:</span>
      <select 
        value={activeSedeId || ''} 
        onChange={handleChange}
        className="bg-transparent border-none text-white text-sm font-bold focus:outline-none focus:ring-0 cursor-pointer appearance-none pr-4"
      >
        {sedes.map(s => (
          <option key={s.id} value={s.id} className="bg-neutral-900 text-white">{s.nombre_sede}</option>
        ))}
      </select>
    </div>
  );
}
