'use client';

import React, { useState, useTransition } from 'react';
import { Search, Info, Plus, Trash2, Loader2, Link2, Beaker, CheckCircle2 } from 'lucide-react';
import { updateProducto, addInsumoToReceta, removeInsumoFromReceta } from './actions';

export default function ProductosEnriquecidos({ productos, insumos, recetas, empresaId }: { productos: any[], insumos: any[], recetas: any[], empresaId: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState('');

  // Filtros
  const filteredProducts = productos.filter(p => 
    (p.nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (p.codigo_barras?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  // Recetas del producto seleccionado
  const productRecipes = selectedProduct ? recetas.filter(r => r.producto_id === selectedProduct.id) : [];
  
  const handleSaveProductInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    setFeedback('');
    startTransition(async () => {
      const res = await updateProducto(selectedProduct.id, selectedProduct.descripcion, selectedProduct.es_compuesto, selectedProduct.estado_activo);
      if (res.success) {
        setFeedback('Información guardada.');
        setTimeout(() => setFeedback(''), 2000);
      } else {
        setFeedback('Error: ' + res.error);
      }
    });
  };



  const handleRemoveIngredient = async (recetaId: string) => {
    startTransition(async () => {
      await removeInsumoFromReceta(recetaId);
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[700px]">
      
      {/* Lista de Productos (Catálogo) */}
      <div className="w-full lg:w-1/3 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col overflow-hidden shadow-xl">
        <div className="p-4 border-b border-neutral-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar producto POS..."
              className="w-full bg-neutral-950 border border-neutral-800 text-sm text-white rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <ul className="divide-y divide-neutral-800/50">
            {filteredProducts.map(prod => (
              <li 
                key={prod.id}
                onClick={() => setSelectedProduct(prod)}
                className={`p-4 cursor-pointer hover:bg-white/[0.02] transition-colors ${selectedProduct?.id === prod.id ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : 'border-l-2 border-transparent'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-white">{prod.nombre}</p>
                    <p className="text-xs text-neutral-500 mt-1 font-mono">{prod.codigo_barras || 'Sin código'}</p>
                  </div>
                  {prod.es_compuesto && (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Link2 size={10} /> Receta
                    </span>
                  )}
                </div>
              </li>
            ))}
            {filteredProducts.length === 0 && (
              <li className="p-8 text-center text-neutral-500 text-sm">
                No se encontraron productos.
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Editor de Producto y Receta */}
      <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col overflow-hidden relative shadow-xl">
        {selectedProduct ? (
          <div className="flex-1 overflow-auto p-6 space-y-8">
            
            {/* Header del Producto */}
            <div>
              <h2 className="text-2xl font-bold text-white">{selectedProduct.nombre}</h2>
              <p className="text-neutral-400 text-sm mt-1">Precio de venta en POS: <span className="text-emerald-400 font-medium">${Number(selectedProduct.precio_venta).toFixed(2)}</span></p>
            </div>

            {/* Formulario Enriquecimiento */}
            <form onSubmit={handleSaveProductInfo} className="bg-neutral-950/50 border border-neutral-800 p-5 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                  <Info size={16} className="text-indigo-400" /> Atributos Web
                </h3>
                {feedback && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 size={14}/> {feedback}</span>}
              </div>
              
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Descripción para E-commerce o Menú Web</label>
                <textarea 
                  rows={2}
                  className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                  value={selectedProduct.descripcion || ''}
                  onChange={(e) => setSelectedProduct({...selectedProduct, descripcion: e.target.value})}
                  placeholder="Ej. Deliciosa hamburguesa con doble carne..."
                />
              </div>

              <div className="flex items-center gap-3 bg-indigo-500/5 p-3 rounded-lg border border-indigo-500/10">
                <input 
                  type="checkbox" 
                  id="compuesto"
                  checked={selectedProduct.es_compuesto}
                  onChange={(e) => setSelectedProduct({...selectedProduct, es_compuesto: e.target.checked})}
                  className="w-4 h-4 rounded border-neutral-700 text-indigo-600 focus:ring-indigo-600 bg-neutral-900"
                />
                <label htmlFor="compuesto" className="text-sm text-indigo-300 font-medium">
                  Es un producto compuesto (Usa receta para descontar insumos del almacén)
                </label>
              </div>

              <div className="flex items-center gap-3 bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                <input 
                  type="checkbox" 
                  id="activo"
                  checked={selectedProduct.estado_activo !== false}
                  onChange={(e) => setSelectedProduct({...selectedProduct, estado_activo: e.target.checked})}
                  className="w-4 h-4 rounded border-neutral-700 text-emerald-600 focus:ring-emerald-600 bg-neutral-900"
                />
                <label htmlFor="activo" className="text-sm text-neutral-300 font-medium">
                  Producto Activo (Visible en catálogos y ventas)
                </label>
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={isPending} className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                  {isPending ? <Loader2 size={14} className="animate-spin" /> : null} Guardar Atributos
                </button>
              </div>
            </form>

            {/* Creador de Recetas (BOM) */}
            {selectedProduct.es_compuesto && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-white flex items-center gap-2 border-b border-neutral-800 pb-2">
                  <Beaker size={16} className="text-indigo-400" /> Escandallo (Receta)
                </h3>
                
                {/* Lista de Insumos Vinculados */}
                <div className="bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-900/80 text-neutral-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Insumo</th>
                        <th className="px-4 py-3 font-medium">Porción a Descontar</th>
                        <th className="px-4 py-3 font-medium text-right">Costo Calculado</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/50">
                      {productRecipes.map(r => {
                        const isSubproduct = !!r.subproducto_id;
                        const itemNombre = isSubproduct 
                          ? (productos.find(p => p.id === r.subproducto_id)?.nombre || 'Subproducto Desconocido')
                          : (insumos.find(i => i.id === r.insumo_id)?.nombre || 'Insumo Desconocido');
                          
                        const itemUnidad = isSubproduct 
                          ? 'Unidades' 
                          : (insumos.find(i => i.id === r.insumo_id)?.unidad_medida || '');
                          
                        const costoReceta = isSubproduct 
                          ? 0 // Cálculo recursivo complejo para frontend, dejamos en 0 por ahora
                          : (r.cantidad_necesaria * (insumos.find(i => i.id === r.insumo_id)?.costo_unitario || 0));

                        return (
                          <tr key={r.id}>
                            <td className="px-4 py-3 text-neutral-300">
                              {isSubproduct ? <span className="text-emerald-400 text-xs border border-emerald-400/20 bg-emerald-400/10 px-1 rounded mr-2">SUB</span> : null}
                              {itemNombre}
                            </td>
                            <td className="px-4 py-3 text-indigo-400 font-mono text-xs">{r.cantidad_necesaria} {itemUnidad}</td>
                            <td className="px-4 py-3 text-right text-neutral-400">{costoReceta > 0 ? `$${costoReceta.toFixed(2)}` : '-'}</td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => handleRemoveIngredient(r.id)} className="text-neutral-500 hover:text-rose-400" disabled={isPending}>
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {productRecipes.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-neutral-500">No hay insumos ni subproductos asignados.</td></tr>
                      )}
                    </tbody>
                    {productRecipes.length > 0 && (
                      <tfoot className="bg-neutral-900/50 border-t border-neutral-800">
                        <tr>
                          <td colSpan={2} className="px-4 py-3 text-right font-medium text-neutral-300">Costo Base Directo:</td>
                          <td className="px-4 py-3 text-right font-medium text-rose-400">
                            ${productRecipes.reduce((acc, r) => acc + (r.insumo_id ? (r.cantidad_necesaria * (insumos.find(i => i.id === r.insumo_id)?.costo_unitario || 0)) : 0), 0).toFixed(2)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Agregar Insumo o Subproducto */}
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const itemValue = (form.elements.namedItem('item_id') as HTMLSelectElement).value;
                  const cantidad = parseFloat((form.elements.namedItem('cantidad') as HTMLInputElement).value);
                  
                  if (!itemValue || !cantidad || !selectedProduct) return;
                  
                  const [tipo, id] = itemValue.split('||'); // 'insumo||123' o 'producto||456'
                  
                  startTransition(async () => {
                    await addInsumoToReceta(empresaId, selectedProduct.id, id, tipo as 'insumo'|'producto', cantidad);
                    form.reset();
                  });
                }} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Insumo o Subproducto (Combo)</label>
                    <select name="item_id" className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none" required>
                      <option value="">Selecciona...</option>
                      <optgroup label="Materia Prima (Insumos)">
                        {insumos.map(i => <option key={`i-${i.id}`} value={`insumo||${i.id}`}>{i.nombre} ({i.unidad_medida})</option>)}
                      </optgroup>
                      <optgroup label="Subproductos (Para Combos)">
                        {productos.filter(p => p.id !== selectedProduct.id).map(p => (
                           <option key={`p-${p.id}`} value={`producto||${p.id}`}>{p.nombre}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  <div className="w-32">
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Gasto / Cantidad</label>
                    <input type="number" step="0.0001" name="cantidad" placeholder="Ej. 1" className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none" required />
                  </div>
                  <button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center h-[38px]">
                    <Plus size={16} />
                  </button>
                </form>

              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 p-8 text-center bg-neutral-900/50">
            <Beaker size={48} className="mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-neutral-300 mb-1">Selecciona un producto</h3>
            <p className="text-sm max-w-sm">Haz clic en cualquier producto del catálogo de la izquierda para configurar su receta y atributos.</p>
          </div>
        )}
      </div>
    </div>
  );
}
