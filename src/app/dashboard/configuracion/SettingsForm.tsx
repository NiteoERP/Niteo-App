'use client';

import React, { useOptimistic, useState, useTransition } from 'react';
import { updateCompanyName } from './actions';
import { Building2, Save, Loader2, AlertCircle } from 'lucide-react';

export default function SettingsForm({ initialName, empresaId }: { initialName: string, empresaId: string }) {
  const [name, setName] = useState(initialName);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // useOptimistic hook: toma el estado real, y define cómo actualizar el estado optimista (0ms)
  const [optimisticName, addOptimisticName] = useOptimistic(
    name,
    (state, newName: string) => newName
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name === optimisticName && name === initialName) return;
    
    setError('');
    setSuccess(false);

    // Guardamos el nuevo valor que intentaremos subir al servidor
    const newName = name;

    startTransition(async () => {
      // 1. UI Optimista se actualiza al instante sin importar si el internet está lento
      addOptimisticName(newName);
      
      // 2. Operación de red real de fondo
      const res = await updateCompanyName(empresaId, newName);
      
      if (!res.success) {
        setError('Error al guardar: ' + res.error);
        // El rollback es automático porque optimisticName vuelve al state 'name' si la action termina
        // Para forzar el revert local del input visual si falla:
        setName(initialName);
      } else {
        setSuccess(true);
        setName(newName);
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1.5">Nombre Comercial</label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
          <input
            type="text"
            // Mostramos el estado optimista. Si está pendiente la red, ya vemos el nuevo nombre.
            value={isPending ? optimisticName : name} 
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>
      
      {error && (
        <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
      
      {success && (
        <p className="text-emerald-400 text-sm font-medium">¡Cambios guardados en la base de datos!</p>
      )}

      <div className="flex items-center justify-between pt-2">
        <button 
          type="submit"
          disabled={isPending || name === initialName}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Guardar Cambios
        </button>

        {isPending && (
          <span className="text-xs text-indigo-400 flex items-center gap-1.5 animate-pulse">
            Sincronizando de fondo...
          </span>
        )}
      </div>
      
      <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
        <p className="text-xs text-indigo-300 leading-relaxed">
          <strong>Demostración Fase 4:</strong> Al presionar guardar, nota cómo la interfaz reacciona instantáneamente. No se congela la pantalla mientras espera la respuesta del servidor.
        </p>
      </div>
    </form>
  );
}
