'use client';

import React, { useState } from 'react';
import TerminalVirtual from '@/components/pos/TerminalVirtual';
import { Store, ShoppingCart, MapPin } from 'lucide-react';
import type { ProductoPOS } from '@/actions/pos-actions';
import type { Sede } from '@/actions/sedes-actions';

interface TerminalWrapperProps {
  catalogo: ProductoPOS[];
  sedes: Sede[];
  metodosDisponibles?: string[];
  tasaActiva?: number;
  empresaNombre?: string;
  licencia?: any;
}

export default function TerminalWrapper({
  catalogo,
  sedes,
  metodosDisponibles,
  tasaActiva,
  empresaNombre,
  licencia
}: TerminalWrapperProps) {
  // Inicializamos la sede seleccionada con la primera disponible
  const [selectedSedeId, setSelectedSedeId] = useState<string | null>(
    sedes.length > 0 ? sedes[0].id : null
  );

  if (!selectedSedeId || sedes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <ShoppingCart size={28} className="text-indigo-400" />
        </div>
        <div>
          <h3 className="text-white font-bold text-lg">No hay sedes disponibles</h3>
          <p className="text-neutral-400 text-sm mt-1 max-w-md">
            Para usar el Terminal Web necesitas tener al menos una sede activa.
          </p>
        </div>
        <a
          href="/dashboard/configuracion/sedes"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          <Store size={16} />
          Ir a Configuración de Sedes
        </a>
      </div>
    );
  }

  const selectedSede = sedes.find(s => s.id === selectedSedeId);

  return (
    <div className="space-y-4">
      {sedes.length > 1 && (
        <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 p-4 rounded-2xl animate-in fade-in duration-300">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400 shrink-0">
            <Store size={20} />
          </div>
          <div className="flex-1">
            <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">
              Sucursal Activa para Facturación
            </p>
            <select
              value={selectedSedeId}
              onChange={(e) => setSelectedSedeId(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer hover:border-neutral-700"
            >
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre_sede} {s.tipo_sede === 'VIRTUAL' ? '(Virtual)' : '(Física)'}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Como pasamos un key, React desmontará y montará el TerminalVirtual 
          nuevo al cambiar de sede, asegurando que el estado (carrito, etc) se reinicie. */}
      <TerminalVirtual
        key={selectedSedeId}
        catalogo={catalogo}
        sedeVirtualId={selectedSedeId}
        metodosDisponibles={metodosDisponibles}
        tasaActiva={tasaActiva}
        empresaNombre={empresaNombre}
        licencia={licencia}
      />
    </div>
  );
}
