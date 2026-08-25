'use client';

import React, { useOptimistic, useTransition, useState } from 'react';
import { createInsumo, deleteInsumo } from './actions';
import { PackageOpen, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';

export default function InsumosManager({ initialInsumos, empresaId }: { initialInsumos: any[], empresaId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  
  // Form state
  const [nombre, setNombre] = useState('');
  const [unidad, setUnidad] = useState('Kg');
  const [costo, setCosto] = useState('');
  const [stock, setStock] = useState('');

  // Optimistic UI state
  const [optimisticInsumos, addOptimisticInsumo] = useOptimistic(
    initialInsumos,
    (state, newAction: { type: 'add' | 'delete', payload: any }) => {
      if (newAction.type === 'add') {
        return [{ ...newAction.payload, id: Math.random().toString(), isOptimistic: true }, ...state];
      } else if (newAction.type === 'delete') {
        return state.filter(i => i.id !== newAction.payload);
      }
      return state;
    }
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !costo || !stock) return;
    
    setError('');
    
    const newInsumo = {
      empresa_id: empresaId,
      nombre,
      unidad_medida: unidad,
      costo_promedio: parseFloat(costo),
      cantidad_actual: parseFloat(stock)
    };

    // Reset form immediately
    setNombre(''); setCosto(''); setStock('');

    startTransition(async () => {
      // 1. UI Optimista (Agregamos inmediatamente)
      addOptimisticInsumo({ type: 'add', payload: newInsumo });
      
      // 2. Operación Real
      const res = await createInsumo(empresaId, newInsumo.nombre, newInsumo.unidad_medida, newInsumo.costo_promedio, newInsumo.cantidad_actual);
      
      if (!res.success) {
        setError('Error al crear insumo: ' + res.error);
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      // 1. UI Optimista (Borramos inmediatamente)
      addOptimisticInsumo({ type: 'delete', payload: id });
      
      // 2. Operación Real
      const res = await deleteInsumo(id);
      if (!res.success) {
        setError('Error al eliminar insumo: ' + res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Formulario de Creación */}
      <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl">
        <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
          <Plus size={16} className="text-emerald-400" /> Nuevo Insumo
        </h3>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Nombre (Ej. Harina)</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg px-4 h-14 text-sm focus:border-indigo-500 outline-none" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Unidad</label>
            <select value={unidad} onChange={e => setUnidad(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg px-4 h-14 text-sm focus:border-indigo-500 outline-none">
              <option value="Kg">Kg</option>
              <option value="Gramos">Gramos</option>
              <option value="Litros">Litros</option>
              <option value="Unidades">Unidades</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Costo Unitario ($)</label>
            <input type="number" step="0.01" value={costo} onChange={e => setCosto(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg px-4 h-14 text-sm focus:border-indigo-500 outline-none" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Stock Inicial</label>
            <input type="number" step="0.01" value={stock} onChange={e => setStock(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg px-4 h-14 text-sm focus:border-indigo-500 outline-none" required />
          </div>
          <div className="md:col-span-5 flex justify-end mt-2">
            <button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 h-14 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50">
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Agregar Insumo
            </button>
          </div>
        </form>
        {error && <div className="mt-4 text-xs text-rose-400 flex items-center gap-1"><AlertCircle size={14}/> {error}</div>}
      </div>

      {/* Lista de Insumos */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/30">
          <h3 className="font-medium text-white flex items-center gap-2">
            <PackageOpen size={18} className="text-indigo-400" /> Almacén Virtual
          </h3>
          <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-full font-medium">
            {optimisticInsumos.length} Insumos
          </span>
        </div>
        <table className="hidden md:table w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-neutral-950/80 text-neutral-500 font-medium">
            <tr>
              <th className="px-6 py-3">Insumo</th>
              <th className="px-6 py-3">Costo ($)</th>
              <th className="px-6 py-3">Cantidad Actual</th>
              <th className="px-6 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/50">
            {optimisticInsumos.map(insumo => (
              <tr key={insumo.id} className={`hover:bg-white/[0.02] transition-colors ${insumo.isOptimistic ? 'opacity-50 animate-pulse' : ''}`}>
                <td className="px-6 py-3 font-medium text-neutral-200">{insumo.nombre}</td>
                <td className="px-6 py-3 text-neutral-400">${Number(insumo.costo_promedio).toFixed(2)} / {insumo.unidad_medida}</td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${insumo.cantidad_actual <= 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {Number(insumo.cantidad_actual).toFixed(2)} {insumo.unidad_medida}
                  </span>
                </td>
                <td className="px-6 py-3 text-right">
                  <button onClick={() => handleDelete(insumo.id)} className="p-3 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Eliminar">
                    <Trash2 size={20} />
                  </button>
                </td>
              </tr>
            ))}
            {optimisticInsumos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-neutral-500">
                  No hay insumos registrados. Agrega tu primer material arriba.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* MOBILE CARDS */}
        <div className="md:hidden flex flex-col p-4 gap-4">
          {optimisticInsumos.map(insumo => (
            <div key={insumo.id} className={`bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3 ${insumo.isOptimistic ? 'opacity-50 animate-pulse' : ''}`}>
              <div className="flex justify-between items-start">
                <span className="font-medium text-neutral-200">{insumo.nombre}</span>
                <button onClick={() => handleDelete(insumo.id)} className="p-3 text-neutral-500 hover:text-rose-400 bg-neutral-900 rounded-lg transition-colors" title="Eliminar">
                  <Trash2 size={20} />
                </button>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-400">Costo:</span>
                <span className="text-white">${Number(insumo.costo_promedio).toFixed(2)} / {insumo.unidad_medida}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-400">Stock:</span>
                <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${insumo.cantidad_actual <= 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {Number(insumo.cantidad_actual).toFixed(2)} {insumo.unidad_medida}
                </span>
              </div>
            </div>
          ))}
          {optimisticInsumos.length === 0 && (
            <div className="text-center text-neutral-500 py-8">
              No hay insumos registrados. Agrega tu primer material arriba.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
