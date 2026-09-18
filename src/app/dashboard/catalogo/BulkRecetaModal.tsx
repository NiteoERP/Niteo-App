'use client';

import React, { useState, useTransition } from 'react';
import { X, Loader2, Search, Trash2, Plus, Beaker, CheckSquare, Square } from 'lucide-react';
import { bulkAssignReceta } from '@/actions/catalogo-actions';

export default function BulkRecetaModal({ 
  productos, 
  insumos, 
  onClose 
}: { 
  productos: any[], 
  insumos: any[], 
  onClose: () => void 
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  
  const [recetaItems, setRecetaItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedCantidad, setSelectedCantidad] = useState('');
  
  const [assignMode, setAssignMode] = useState<'append' | 'replace'>('append');

  // Filter products for the selection list
  const filteredProducts = productos.filter(p => 
    (p.nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const toggleProduct = (id: string) => {
    const next = new Set(selectedProductIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedProductIds(next);
  };

  const toggleAll = () => {
    if (selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const addRecetaItem = () => {
    if (!selectedItem || !selectedCantidad) return;
    const [tipo, id] = selectedItem.split('||');
    const itemData = tipo === 'insumo' ? insumos.find(i => i.id === id) : productos.find(p => p.id === id);
    if (!itemData) return;

    const newItem = {
      id,
      tipo,
      cantidad: parseFloat(selectedCantidad),
      nombre: itemData.nombre,
      unidad_medida: itemData.unidad_medida || 'Unidades',
      costo_promedio: itemData.costo_promedio || 0
    };

    setRecetaItems(prev => [...prev, newItem]);
    setSelectedItem('');
    setSelectedCantidad('');
  };

  const removeRecetaItem = (idx: number) => {
    setRecetaItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if (selectedProductIds.size === 0) {
      setError('Debes seleccionar al menos un producto.');
      return;
    }
    if (recetaItems.length === 0) {
      setError('Debes agregar al menos un ingrediente a la receta base.');
      return;
    }

    setError('');
    setSuccessMsg('');
    startTransition(async () => {
      const res = await bulkAssignReceta({
        productIds: Array.from(selectedProductIds),
        recetaItems,
        mode: assignMode
      });
      if (res.success) {
        setSuccessMsg(`Receta asignada exitosamente a ${selectedProductIds.size} productos.`);
        setTimeout(() => onClose(), 2000);
      } else {
        setError(res.error || 'Ocurrió un error al asignar.');
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Beaker className="text-indigo-400" /> Asignación Masiva de Receta Base
            </h3>
            <p className="text-sm text-neutral-400 mt-1">Aplica los mismos ingredientes base a varios productos a la vez.</p>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors"><X size={24} /></button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Left panel: Products selection */}
          <div className="w-full md:w-1/2 border-r border-neutral-800 flex flex-col">
            <div className="p-4 border-b border-neutral-800 bg-neutral-950/30">
              <h4 className="text-sm font-bold text-white mb-3">1. Selecciona los productos</h4>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar productos (ej. Pizza)..."
                  className="w-full bg-black/50 border border-neutral-800 text-sm text-white rounded-lg pl-9 pr-4 py-2 focus:border-indigo-500 transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              <button 
                onClick={toggleAll}
                className="w-full flex items-center gap-3 p-3 hover:bg-neutral-800/50 rounded-lg transition-colors text-left border-b border-neutral-800/50"
              >
                {selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0 ? (
                  <CheckSquare className="text-indigo-500" size={18} />
                ) : (
                  <Square className="text-neutral-600" size={18} />
                )}
                <span className="text-sm font-medium text-neutral-300">Seleccionar Todos ({filteredProducts.length})</span>
              </button>

              {filteredProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => toggleProduct(p.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-neutral-800/50 rounded-lg transition-colors text-left"
                >
                  {selectedProductIds.has(p.id) ? (
                    <CheckSquare className="text-indigo-500" size={18} shrink-0 />
                  ) : (
                    <Square className="text-neutral-600" size={18} shrink-0 />
                  )}
                  <span className="text-sm text-neutral-300 truncate">{p.nombre}</span>
                  {p.es_compuesto && <span className="ml-auto text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20">ELABORADO</span>}
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <p className="text-sm text-neutral-500 text-center py-8">No se encontraron productos.</p>
              )}
            </div>
          </div>

          {/* Right panel: Recipe builder */}
          <div className="w-full md:w-1/2 flex flex-col bg-neutral-950/20">
            <div className="p-4 border-b border-neutral-800 bg-neutral-950/30">
              <h4 className="text-sm font-bold text-white mb-1">2. Define la receta base</h4>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {error && <div className="p-3 bg-rose-500/10 text-rose-400 text-sm rounded-lg border border-rose-500/20">{error}</div>}
              {successMsg && <div className="p-3 bg-emerald-500/10 text-emerald-400 text-sm rounded-lg border border-emerald-500/20">{successMsg}</div>}

              <div className="flex gap-2 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
                <button 
                  onClick={() => setAssignMode('append')}
                  className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${assignMode === 'append' ? 'bg-neutral-700 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
                >
                  Añadir a existentes
                </button>
                <button 
                  onClick={() => setAssignMode('replace')}
                  className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${assignMode === 'replace' ? 'bg-rose-500/20 text-rose-400 shadow' : 'text-neutral-400 hover:text-white'}`}
                >
                  Reemplazar actuales
                </button>
              </div>
              <p className="text-xs text-neutral-500">
                {assignMode === 'append' 
                  ? 'Si el producto ya tiene receta, estos ingredientes se sumarán a los que ya tiene.' 
                  : 'ADVERTENCIA: Esto borrará cualquier ingrediente que los productos seleccionados tengan actualmente y los reemplazará con estos.'}
              </p>

              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-4">
                {recetaItems.length > 0 ? (
                  <div className="border border-neutral-800 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-neutral-900 text-neutral-500">
                        <tr>
                          <th className="px-3 py-2">Ingrediente</th>
                          <th className="px-3 py-2 text-right">Cant.</th>
                          <th className="px-3 py-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/50 text-neutral-300">
                        {recetaItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 truncate max-w-[150px]">{item.nombre}</td>
                            <td className="px-3 py-2 text-indigo-400 text-right">{item.cantidad} <span className="text-xs">{item.unidad_medida}</span></td>
                            <td className="px-3 py-2 text-right">
                              <button onClick={() => removeRecetaItem(idx)} className="text-neutral-500 hover:text-rose-400"><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-neutral-800 rounded-lg">
                    <p className="text-xs text-neutral-500">No has agregado ingredientes a la base.</p>
                  </div>
                )}

                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Insumo / Producto</label>
                    <select 
                      className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-lg px-3 py-2 text-sm focus:border-indigo-500"
                      value={selectedItem}
                      onChange={e => setSelectedItem(e.target.value)}
                    >
                      <option value="">Selecciona...</option>
                      <optgroup label="Insumos (Almacén)">
                        {insumos.map(i => <option key={`i-${i.id}`} value={`insumo||${i.id}`}>{i.nombre} ({i.unidad_medida})</option>)}
                      </optgroup>
                      <optgroup label="Subproductos (Catálogo)">
                        {productos.map(p => (
                          <option key={`p-${p.id}`} value={`producto||${p.id}`}>{p.nombre}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  <div className="w-20">
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Cant.</label>
                    <input 
                      type="number" step="0.001" min="0" 
                      className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-lg px-3 py-2 text-sm focus:border-indigo-500"
                      value={selectedCantidad}
                      onChange={e => setSelectedCantidad(e.target.value)}
                    />
                  </div>
                  <button onClick={addRecetaItem} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-2 h-[38px]">
                    <Plus size={16} />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="p-4 border-t border-neutral-800 bg-neutral-950/50 shrink-0 flex justify-between items-center">
          <p className="text-sm text-neutral-400">
            Productos seleccionados: <span className="font-bold text-white">{selectedProductIds.size}</span>
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} disabled={isPending} className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors text-sm">
              Cancelar
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={isPending || selectedProductIds.size === 0 || recetaItems.length === 0} 
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors text-sm flex items-center gap-2"
            >
              {isPending ? <Loader2 size={16} className="animate-spin" /> : 'Aplicar Masivamente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
