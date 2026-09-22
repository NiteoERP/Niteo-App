'use client';

import React, { useState, useEffect } from 'react';
import VincularTerminal from './VincularTerminal';
import MesasDashboard from './MesasDashboard';

interface MesasHubProps {
  meseroNombre: string;
  meseroId: string;
  metodosPago: string[];
}

const STORAGE_KEY = 'niteo_terminal_vinculado';

export interface TerminalVinculado {
  terminalCode: string;
  sedeId: string;
  sedeNombre: string;
}

export default function MesasHub({ meseroNombre, meseroId, metodosPago }: MesasHubProps) {
  const [terminal, setTerminal] = useState<TerminalVinculado | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setTerminal(JSON.parse(saved));
    } catch {}
    setLoaded(true);
  }, []);

  const vincular = (t: TerminalVinculado) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
    setTerminal(t);
  };

  const desvincular = () => {
    localStorage.removeItem(STORAGE_KEY);
    setTerminal(null);
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!terminal) {
    return <VincularTerminal onVincular={vincular} meseroNombre={meseroNombre} />;
  }

  return (
    <MesasDashboard
      terminal={terminal}
      meseroNombre={meseroNombre}
      meseroId={meseroId}
      metodosPago={metodosPago}
      onDesvincular={desvincular}
    />
  );
}
