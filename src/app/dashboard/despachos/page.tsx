import React from 'react';
import { Truck } from 'lucide-react';

export default function DespachosPage() {
  return (
    <div className="flex h-full w-full bg-neutral-950 text-white flex-col items-center justify-center p-8 text-center">
      <Truck size={64} className="text-emerald-500 mb-6" />
      <h1 className="text-3xl font-black mb-4">Módulo de Despachos</h1>
      <p className="text-neutral-400 max-w-md">
        Este módulo está actualmente en construcción. Pronto podrás gestionar envíos, rutas y transportistas desde aquí.
      </p>
    </div>
  );
}
