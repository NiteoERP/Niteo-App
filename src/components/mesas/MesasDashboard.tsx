'use client';

import React, { useState } from 'react';
import { Unlink, UtensilsCrossed, TableProperties } from 'lucide-react';
import type { TerminalVinculado } from './MesasHub';
import NuevaComanda from './NuevaComanda';
import MesasAbiertas from './MesasAbiertas';

interface Props {
  terminal: TerminalVinculado;
  meseroNombre: string;
  meseroId: string;
  metodosPago: string[];
  onDesvincular: () => void;
}

type Tab = 'nueva' | 'abiertas';

export default function MesasDashboard({ terminal, meseroNombre, meseroId, metodosPago, onDesvincular }: Props) {
  const [tab, setTab] = useState<Tab>('nueva');

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <h1 className="text-lg font-bold text-white">Módulo Mesero</h1>
          <p className="text-neutral-500 text-xs mt-0.5">
            Terminal: <span className="font-mono text-indigo-400">{terminal.terminalCode}</span>
            {' · '}<span className="text-neutral-400">{terminal.sedeNombre}</span>
          </p>
        </div>
        <button
          onClick={onDesvincular}
          className="flex items-center gap-1.5 text-neutral-500 hover:text-red-400 text-xs transition-colors px-3 py-2 rounded-lg hover:bg-red-500/10"
        >
          <Unlink size={14} />
          Desvincular
        </button>
      </div>

      <div className="flex bg-neutral-900 rounded-xl p-1 mb-4 border border-neutral-800">
        <button
          onClick={() => setTab('nueva')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'nueva'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <UtensilsCrossed size={16} />
          Nueva Comanda
        </button>
        <button
          onClick={() => setTab('abiertas')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'abiertas'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <TableProperties size={16} />
          Mesas Abiertas
        </button>
      </div>

      {tab === 'nueva' ? (
        <NuevaComanda terminal={terminal} meseroNombre={meseroNombre} />
      ) : (
        <MesasAbiertas terminal={terminal} meseroNombre={meseroNombre} metodosPago={metodosPago} />
      )}
    </div>
  );
}
