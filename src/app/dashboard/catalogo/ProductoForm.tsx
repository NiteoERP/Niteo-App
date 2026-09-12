'use client';

import React, { useState, useTransition } from 'react';
import { X, Loader2, PackageSearch, Box } from 'lucide-react';
import { createProducto, updateProducto } from '@/actions/catalogo-actions';

export default function ProductoForm({ initialData, sedes, onClose }: { initialData: any, sedes: any[], onClose: () => void }) {
  const isEditing = !!initialData;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    nombre: initialData?.nombre || '',
    codigo_barras: initialData?.codigo_barras || '',
    precio_venta: initialData?.precio_venta || 0,
    costo: initialData?.costo || 0,
    precio_modificable: initialData?.precio_modificable || false,
    tipo: initialData?.es_compuesto ? 'ELABORADO' : 'REVENTA', // ELABORADO = necesita receta, REVENTA = es insumo directo
    sede_id: sedes[0]?.id || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    startTransition(async () => {
      const action = isEditing ? updateProducto(initialData.id, formData) : createProducto(formData);
      const res = await action;
      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'Error al guardar');
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50">
          <h3 className="text-xl font-bold text-white">{isEditing ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="p-3 bg-rose-500/10 text-rose-400 text-sm rounded-lg border border-rose-500/20">{error}</div>}

          {!isEditing && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-neutral-400 block">Tipo de Producto</label>
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => setFormData({...formData, tipo: 'ELABORADO'})}
                  className={`p-4 rounded-xl border cursor-pointer flex flex-col items-center text-center gap-2 transition-all ${formData.tipo === 'ELABORADO' ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-neutral-800 text-neutral-400 hover:border-neutral-700'}`}
                >
                  <PackageSearch size={24} />
                  <div>
                    <p className="font-bold text-sm">Elaborado</p>
                    <p className="text-[10px] mt-1 opacity-80">Hamburguesas, Platos. Usa ingredientes.</p>
                  </div>
                </div>

                <div 
                  onClick={() => setFormData({...formData, tipo: 'REVENTA'})}
                  className={`p-4 rounded-xl border cursor-pointer flex flex-col items-center text-center gap-2 transition-all ${formData.tipo === 'REVENTA' ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-neutral-800 text-neutral-400 hover:border-neutral-700'}`}
                >
                  <Box size={24} />
                  <div>
                    <p className="font-bold text-sm">Reventa</p>
                    <p className="text-[10px] mt-1 opacity-80">Refrescos, Cervezas. Se compra y vende tal cual.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-neutral-400 block mb-1.5">Nombre</label>
            <input 
              required
              type="text" 
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:border-indigo-500 transition-colors"
              value={formData.nombre}
              onChange={e => setFormData({...formData, nombre: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-neutral-400 block mb-1.5">Costo ($)</label>
              <input 
                type="number" step="0.01" min="0"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white font-mono focus:border-indigo-500"
                value={formData.costo}
                onChange={e => setFormData({...formData, costo: parseFloat(e.target.value)})}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-400 block mb-1.5">Precio Venta ($)</label>
              <input 
                type="number" step="0.01" min="0"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white font-mono focus:border-indigo-500"
                value={formData.precio_venta}
                onChange={e => setFormData({...formData, precio_venta: parseFloat(e.target.value)})}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-400 block mb-1.5">Código de Barras</label>
            <input 
              type="text" 
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white font-mono focus:border-indigo-500"
              value={formData.codigo_barras}
              onChange={e => setFormData({...formData, codigo_barras: e.target.value})}
            />
          </div>

          <label className="flex items-center gap-3 p-4 bg-neutral-950 border border-neutral-800 rounded-lg cursor-pointer">
            <input 
              type="checkbox" 
              className="w-5 h-5 rounded border-neutral-700 bg-neutral-900 text-indigo-500 focus:ring-0 focus:ring-offset-0"
              checked={formData.precio_modificable}
              onChange={e => setFormData({...formData, precio_modificable: e.target.checked})}
            />
            <div>
              <p className="font-medium text-white text-sm">Precio Abierto (Modificable)</p>
              <p className="text-xs text-neutral-500">El cajero podrá cambiar el precio al vender.</p>
            </div>
          </label>

          <div className="flex gap-3 pt-4 border-t border-neutral-800">
            <button type="button" onClick={onClose} disabled={isPending} className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors flex justify-center items-center gap-2">
              {isPending ? <Loader2 size={18} className="animate-spin" /> : 'Guardar Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
