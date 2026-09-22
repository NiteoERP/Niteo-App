'use client';

import React, { useState } from 'react';
import { Wifi, WifiOff, Loader2, Link2 } from 'lucide-react';
import { buscarTerminalPorCodigo } from '@/actions/mesas-actions';
import type { TerminalVinculado } from './MesasHub';

interface Props {
  onVincular: (t: TerminalVinculado) => void;
  meseroNombre: string;
}

export default function VincularTerminal({ onVincular, meseroNombre }: Props) {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVincular = async () => {
    if (!codigo.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await buscarTerminalPorCodigo(codigo.trim());
      if (!result) {
        setError('Código de terminal no encontrado. Verifica el código en la pantalla de configuración del Niteo POS.');
        return;
      }
      onVincular({
        terminalCode: result.terminalCode,
        sedeId: result.sedeId,
        sedeNombre: result.sedeNombre,
      });
    } catch {
      setError('Error de conexión. Verifica tu internet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-8 px-4">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
          <Link2 size={32} className="text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Módulo Mesero</h1>
        <p className="text-neutral-400 mt-1 text-sm">Hola, <span className="text-white font-medium">{meseroNombre}</span></p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-white mb-1">Vincular Terminal POS</h2>
          <p className="text-neutral-500 text-sm">Ingresa el código que aparece en Niteo POS → Configuración → Módulo Mesero.</p>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={codigo}
            onChange={e => setCodigo(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleVincular()}
            placeholder="MESA-XXXX"
            maxLength={9}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3.5 text-white text-center text-xl font-mono tracking-widest placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <WifiOff size={16} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleVincular}
            disabled={loading || !codigo.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Buscando...</>
            ) : (
              <><Wifi size={18} /> Vincular Terminal</>
            )}
          </button>
        </div>

        <p className="text-neutral-600 text-xs text-center">
          El código aparece en Niteo POS → Configuración → Módulo Mesero
        </p>
      </div>
    </div>
  );
}
