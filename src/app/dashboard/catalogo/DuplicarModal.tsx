import React, { useState } from 'react';
import { duplicarCatalogoSede } from '@/actions/catalogo-actions';
import { Copy, Loader2, X } from 'lucide-react';

interface DuplicarModalProps {
  sedes: { id: string; nombre_sede: string }[];
  isOpen: boolean;
  onClose: () => void;
}

export default function DuplicarModal({ sedes, isOpen, onClose }: DuplicarModalProps) {
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleDuplicar = async () => {
    setError('');
    setSuccess('');
    
    if (!origen || !destino) {
      setError('Selecciona la sede de origen y la sede destino');
      return;
    }
    if (origen === destino) {
      setError('El origen y destino no pueden ser la misma sede');
      return;
    }

    setLoading(true);
    const result = await duplicarCatalogoSede(origen, destino);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("¡Éxito! Se copiaron " + result.totalDuplicados + " productos a la sede destino.");
      setTimeout(() => {
        onClose();
        setSuccess('');
        setOrigen('');
        setDestino('');
      }, 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Copy size={20} className="text-indigo-400" /> Duplicar Catálogo
          </h3>
          <button onClick={onClose} disabled={loading} className="text-neutral-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-neutral-400">
            Copia todos los productos de una sede a otra automáticamente. Ideal si acabas de importar o crear productos en la sede principal y quieres compartirlos.
          </p>

          {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-lg">{error}</div>}
          {success && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-lg">{success}</div>}

          <div>
            <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 block">Origen (Desde dónde)</label>
            <select
              value={origen}
              onChange={(e) => setOrigen(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:border-indigo-500 transition-colors"
            >
              <option value="">Selecciona la sede con productos...</option>
              {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre_sede}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 block">Destino (Hacia dónde)</label>
            <select
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:border-indigo-500 transition-colors"
            >
              <option value="">Selecciona la sede que recibirá la copia...</option>
              {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre_sede}</option>)}
            </select>
          </div>
        </div>

        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex justify-end gap-3">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleDuplicar}
            disabled={loading || !origen || !destino}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
            Duplicar Productos
          </button>
        </div>
      </div>
    </div>
  );
}
