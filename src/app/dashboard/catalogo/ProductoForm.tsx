'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { X, Loader2, PackageSearch, Box, Trash2, Plus, Beaker, Lock, ToggleLeft, ToggleRight } from 'lucide-react';
import { createProducto, updateProducto } from '@/actions/catalogo-actions';
import { getListasPrecios, getPreciosPorProducto } from '@/actions/listas-precios-actions';
import { useEmpresa } from '@/components/providers/EmpresaProvider';
import Link from 'next/link';

export default function ProductoForm({ 
  initialData, 
  sedes, 
  categorias = [],
  insumos = [], 
  productos = [], 
  recetas = [], 
  onClose 
}: { 
  initialData: any, 
  sedes: any[], 
  categorias?: any[],
  insumos?: any[], 
  productos?: any[], 
  recetas?: any[], 
  onClose: () => void 
}) {
  const { hasModulo } = useEmpresa();
  const canUseRecetas = hasModulo('recetas');

  const isEditing = !!initialData;
  const [isPending, startTransition] = useTransition();
  const [listasPrecios, setListasPrecios] = useState<any[]>([]);
  const [preciosDinamicos, setPreciosDinamicos] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      const res = await getListasPrecios();
      if (res.success && res.data) {
        setListasPrecios(res.data.filter((l: any) => l.estado_activo));
      }
      if (isEditing && initialData?.id) {
        const pricesRes = await getPreciosPorProducto(initialData.id);
        if (pricesRes.success && pricesRes.data) {
          const map: Record<string, number> = {};
          pricesRes.data.forEach((p: any) => {
            map[p.lista_precio_id] = p.precio;
          });
          setPreciosDinamicos(map);
        }
      }
    };
    fetchData();
  }, [isEditing, initialData]);

  const [error, setError] = useState('');
  const [catsList, setCatsList] = useState<any[]>(categorias);
  const [creatingCat, setCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [loadingNewCat, setLoadingNewCat] = useState(false);

  // Extract existing recipes for this product if editing
  const existingRecipes = isEditing 
    ? recetas.filter(r => r.producto_id === initialData.id).map(r => ({
        id: r.insumo_id || r.subproducto_id,
        tipo: r.insumo_id ? 'insumo' : 'producto',
        cantidad: r.cantidad_necesaria,
        nombre: r.insumo_id 
          ? insumos.find(i => i.id === r.insumo_id)?.nombre 
          : productos.find(p => p.id === r.subproducto_id)?.nombre,
        unidad_medida: r.insumo_id 
          ? insumos.find(i => i.id === r.insumo_id)?.unidad_medida 
          : 'Unidades',
        costo_promedio: r.insumo_id 
          ? insumos.find(i => i.id === r.insumo_id)?.costo_promedio 
          : 0,
      }))
    : [];

  const [formData, setFormData] = useState({
    nombre: initialData?.nombre || '',
    categoria_id: initialData?.categoria_id || '',
    descripcion: initialData?.descripcion || '',
    notas_preparacion_str: initialData?.notas_preparacion ? initialData.notas_preparacion.join(', ') : '',
    codigo_barras: initialData?.codigo_barras || '',
    precio_venta: initialData?.precio_venta || 0,
    costo: initialData?.costo || 0,
    porcentaje_ganancia: initialData?.porcentaje_ganancia || 0,
    precio_modificable: initialData?.precio_modificable || false,
      aplica_listas_precios: initialData?.aplica_listas_precios !== undefined ? initialData.aplica_listas_precios : true,
    tipo: initialData?.es_servicio ? 'SERVICIO' : initialData?.es_compuesto ? 'ELABORADO' : 'REVENTA',
    sede_id: null,
      sedes_ids: initialData?.sedes_ids || (initialData?.sede_id ? [initialData.sede_id] : []),
      sede_dropdown_open: false,
    receta_items: existingRecipes
  });

  const handleSaveNewCategory = async () => {
    if (!newCatName.trim()) return;
    setLoadingNewCat(true);
    const { createCategoria } = await import('@/actions/catalogo-actions');
    const res = await createCategoria(newCatName.trim());
    if (res.success && res.data) {
      setCatsList(prev => {
        const filtered = prev.filter(c => c.id !== res.data.id);
        return [...filtered, res.data];
      });
      setFormData(prev => ({ ...prev, categoria_id: res.data.id }));
      setCreatingCat(false);
      setNewCatName('');
    } else {
      alert(res.error || 'Error al crear la categoría.');
    }
    setLoadingNewCat(false);
  };

  const [selectedItem, setSelectedItem] = useState('');
  const [selectedCantidad, setSelectedCantidad] = useState('');
  const [selectedUnidadReceta, setSelectedUnidadReceta] = useState('Base');

  // Two way binding
  const handleCostoChange = (val: number) => {
    const newPrice = val * (1 + formData.porcentaje_ganancia / 100);
    setFormData(prev => ({ ...prev, costo: val, precio_venta: parseFloat(newPrice.toFixed(2)) }));
  };

  const handlePrecioChange = (val: number) => {
    const newMargin = formData.costo > 0 ? ((val - formData.costo) / formData.costo) * 100 : 0;
    setFormData(prev => ({ ...prev, precio_venta: val, porcentaje_ganancia: parseFloat(newMargin.toFixed(2)) }));
  };

  const handleGananciaChange = (val: number) => {
    const newPrice = formData.costo * (1 + val / 100);
    setFormData(prev => ({ ...prev, porcentaje_ganancia: val, precio_venta: parseFloat(newPrice.toFixed(2)) }));
  };

  // Auto-calculate base cost from recipes
  useEffect(() => {
    if (formData.tipo === 'ELABORADO') {
      const computedCost = formData.receta_items.reduce((acc, item) => {
        return acc + (item.cantidad * (item.costo_promedio || 0));
      }, 0);
      if (computedCost !== formData.costo) {
        handleCostoChange(computedCost);
      }
    }
  }, [formData.receta_items, formData.tipo]);

  const addRecetaItem = () => {
    if (!selectedItem || !selectedCantidad) return;
    const [tipo, id] = selectedItem.split('||');
    const itemData = tipo === 'insumo' ? insumos.find(i => i.id === id) : productos.find(p => p.id === id);
    if (!itemData) return;

    let rawQty = parseFloat(selectedCantidad);
    const baseU = itemData.unidad_medida || 'Unidades';
    let finalQty = rawQty;

    if (selectedUnidadReceta === 'Oz' && (baseU === 'Ml' || baseU === 'Lt')) {
       finalQty = baseU === 'Lt' ? (rawQty * 29.5735) / 1000 : (rawQty * 29.5735);
    } else if (selectedUnidadReceta === 'Lb' && (baseU === 'Kg' || baseU === 'Gr')) {
       finalQty = baseU === 'Kg' ? (rawQty * 453.592) / 1000 : (rawQty * 453.592);
    }

    const displayName = selectedUnidadReceta !== 'Base' 
      ? `${itemData.nombre} (${rawQty} ${selectedUnidadReceta})`
      : itemData.nombre;

    const newItem = {
      id,
      tipo,
      cantidad: parseFloat(finalQty.toFixed(4)),
      nombre: displayName,
      unidad_medida: baseU,
      costo_promedio: itemData.costo_promedio || 0
    };

    setFormData(prev => ({
      ...prev,
      receta_items: [...prev.receta_items, newItem]
    }));
    setSelectedItem('');
    setSelectedCantidad('');
    setSelectedUnidadReceta('Base');
  };

  const removeRecetaItem = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      receta_items: prev.receta_items.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    startTransition(async () => {
              const payload = {
          ...formData,
          sede_id: formData.sedes_ids.length === 1 ? formData.sedes_ids[0] : null,
          sedes_ids: formData.sedes_ids.length > 0 ? formData.sedes_ids : null,
          codigo_barras: formData.codigo_barras ? formData.codigo_barras.trim() : null,
          descripcion: formData.descripcion ? formData.descripcion.trim() : null,
          categoria_id: formData.categoria_id ? formData.categoria_id : null,
          notas_preparacion: formData.notas_preparacion_str ? formData.notas_preparacion_str.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '') : [],
        };
        // Remove UI-only fields
        delete (payload as any).notas_preparacion_str;
        delete (payload as any).sede_dropdown_open;
      const action = isEditing ? updateProducto(initialData.id, payload) : createProducto(payload);
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
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50 shrink-0">
          <h3 className="text-xl font-bold text-white">{isEditing ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <form id="prod-form" onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="p-3 bg-rose-500/10 text-rose-400 text-sm rounded-lg border border-rose-500/20">{error}</div>}

            <div className="space-y-3">
              <label className="text-sm font-medium text-neutral-400 block">Tipo de Producto</label>
              <div className="grid grid-cols-3 gap-3">
                <div 
                  onClick={() => {
                    if (!canUseRecetas) return;
                    setFormData({...formData, tipo: 'ELABORADO'});
                  }}
                  className={`relative p-4 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${!canUseRecetas ? 'opacity-50 cursor-not-allowed border-neutral-800 text-neutral-500' : formData.tipo === 'ELABORADO' ? 'border-indigo-500 bg-indigo-500/10 text-white cursor-pointer' : 'border-neutral-800 text-neutral-400 hover:border-neutral-700 cursor-pointer'}`}
                >
                  {!canUseRecetas && (
                    <div className="absolute top-2 right-2 text-rose-400" title="Requiere módulo de recetas">
                      <Lock size={14} />
                    </div>
                  )}
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
                    <p className="text-[10px] mt-1 opacity-80">Se compra a proveedores y se vende tal cual.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-sm font-medium text-neutral-400">Categoría</label>
                  {!creatingCat && (
                    <button
                      type="button"
                      onClick={() => setCreatingCat(true)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                    >
                      <Plus size={12} /> Nueva
                    </button>
                  )}
                </div>

                {creatingCat ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ej. Bebidas, Snacks..."
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      className="flex-1 bg-neutral-950 border border-indigo-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={loadingNewCat}
                      onClick={handleSaveNewCategory}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {loadingNewCat ? '...' : 'Crear'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCreatingCat(false); setNewCatName(''); }}
                      className="p-2 text-neutral-400 hover:text-white rounded-lg"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <select
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:border-indigo-500 transition-colors"
                    value={formData.categoria_id}
                    onChange={e => setFormData({...formData, categoria_id: e.target.value})}
                  >
                    <option value="">Sin categoría</option>
                    {catsList.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div className="relative">
                <label className="text-sm font-medium text-neutral-400 block mb-1.5">Sucursal Asociada</label>
                <div 
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-indigo-300 font-medium cursor-pointer flex justify-between items-center"
                  onClick={() => setFormData({...formData, sede_dropdown_open: !formData.sede_dropdown_open})}
                >
                  <span className="truncate text-sm">
                    {formData.sedes_ids.length === 0 ? 'Global / Todas las Sedes' : formData.sedes_ids.length === 1 ? sedes.find(s => s.id === formData.sedes_ids[0])?.nombre_sede : formData.sedes_ids.length === sedes.length ? 'Todas (Espec�ficas)' : `${formData.sedes_ids.length} sedes seleccionadas`}
                  </span>
                  <span className="text-xs text-neutral-500">?</span>
                </div>
                {formData.sede_dropdown_open && (
                  <>
                  <div className="fixed inset-0 z-40" onClick={() => setFormData({...formData, sede_dropdown_open: false})}></div>
                  <div className="absolute top-full mt-1 w-full bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 p-2 flex flex-col gap-1 max-h-60 overflow-auto">
                    <label className="flex items-center gap-2 p-2 hover:bg-neutral-800 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-indigo-500"
                        checked={formData.sedes_ids.length === 0}
                        onChange={() => setFormData({...formData, sedes_ids: []})}
                      />
                      <span className="text-sm text-white font-medium">Global / Todas las Sedes</span>
                    </label>
                    <div className="h-px bg-neutral-800 my-1"></div>
                    <label className="flex items-center gap-2 p-2 hover:bg-neutral-800 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-indigo-500"
                        checked={formData.sedes_ids.length === sedes.length && sedes.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setFormData({...formData, sedes_ids: sedes.map(s => s.id)});
                          else setFormData({...formData, sedes_ids: []});
                        }}
                      />
                      <span className="text-sm text-indigo-300 font-medium">Seleccionar todas espec�ficas</span>
                    </label>
                    {sedes.map(s => (
                      <label key={s.id} className="flex items-center gap-2 p-2 hover:bg-neutral-800 rounded cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-indigo-500"
                          checked={formData.sedes_ids.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({...formData, sedes_ids: [...formData.sedes_ids, s.id]});
                            } else {
                              setFormData({...formData, sedes_ids: formData.sedes_ids.filter((id: string) => id !== s.id)});
                            }
                          }}
                        />
                        <span className="text-sm text-neutral-300">{s.nombre_sede}</span>
                      </label>
                    ))}
                  </div>
                  </>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-neutral-400 block mb-1.5">Código de Barras (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Escanea o escribe el código"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white font-mono text-sm focus:border-indigo-500 transition-colors"
                  value={formData.codigo_barras}
                  onChange={e => setFormData({...formData, codigo_barras: e.target.value})}
                />
              </div>
            </div>
            
            <label className="text-sm font-medium text-neutral-400 block mb-1.5">Descripción (Opcional)</label>
              <textarea 
                rows={2}
                placeholder="Detalles del producto, ingredientes principales, notas para el cajero..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:border-indigo-500 transition-colors resize-none text-sm placeholder:text-neutral-600"
                value={formData.descripcion}
                onChange={e => setFormData({...formData, descripcion: e.target.value})}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-400 block mb-1.5">Notas rápidas de preparación (separadas por coma)</label>
              <textarea 
                rows={2}
                placeholder="Ej: Sin cebolla, Para llevar, Bien cocido, Sin salsas..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:border-indigo-500 transition-colors resize-none text-sm placeholder:text-neutral-600"
                value={formData.notas_preparacion_str}
                onChange={e => setFormData({...formData, notas_preparacion_str: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-neutral-400 block mb-1.5">Costo ($)</label>
                <input 
                  type="number" step="0.01" min="0"
                  readOnly={formData.tipo === 'ELABORADO'}
                  className={`w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white font-mono focus:border-indigo-500 ${formData.tipo === 'ELABORADO' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  value={formData.costo}
                  onChange={e => handleCostoChange(parseFloat(e.target.value))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-400 block mb-1.5">Ganancia (%)</label>
                <input 
                  type="number" step="0.1" min="0"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-emerald-400 font-mono focus:border-emerald-500"
                  value={formData.porcentaje_ganancia}
                  onChange={e => handleGananciaChange(parseFloat(e.target.value))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-400 block mb-1.5">Precio Venta ($)</label>
                <input 
                  type="number" step="0.01" min="0"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white font-mono focus:border-indigo-500"
                  value={formData.precio_venta}
                  onChange={e => handlePrecioChange(parseFloat(e.target.value))}
                />
              </div>
            </div>

            

            {formData.tipo === 'ELABORADO' && (
              <>
                <div className="flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3">
                  <div>
                    <label className="text-sm font-medium text-white">Aplicar Precios Dinámicos</label>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Permitir que las listas de porcentaje afecten este producto</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, aplica_listas_precios: !prev.aplica_listas_precios }))}
                    className="text-neutral-400 hover:text-white transition-colors"
                  >
                    {formData.aplica_listas_precios ? <ToggleRight size={32} className="text-emerald-500" /> : <ToggleLeft size={32} />}
                  </button>
                </div>
  
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-4">
                <h4 className="text-sm font-medium text-white flex items-center gap-2">
                  <Beaker size={16} className="text-indigo-400" /> Receta / Escandallo
                </h4>
                
                {formData.receta_items.length > 0 ? (
                  <div className="border border-neutral-800 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-neutral-900 text-neutral-500">
                        <tr>
                          <th className="px-3 py-2">Ingrediente</th>
                          <th className="px-3 py-2">Cant.</th>
                          <th className="px-3 py-2 text-right">Costo</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/50 text-neutral-300">
                        {formData.receta_items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2">{item.nombre}</td>
                            <td className="px-3 py-2 text-indigo-400">{item.cantidad} {item.unidad_medida}</td>
                            <td className="px-3 py-2 text-right">${(item.cantidad * (item.costo_promedio || 0)).toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">
                              <button type="button" onClick={() => removeRecetaItem(idx)} className="text-neutral-500 hover:text-rose-400"><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 text-center py-2">No hay ingredientes asignados.</p>
                )}

                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Insumo o Subproducto</label>
                    <select 
                      className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-lg px-3 py-2 text-sm focus:border-indigo-500"
                      value={selectedItem}
                      onChange={e => {
                        setSelectedItem(e.target.value);
                        setSelectedUnidadReceta('Base');
                      }}
                    >
                      <option value="">Selecciona...</option>
                      <optgroup label="Insumos (Almacén)">
                        {insumos.map(i => <option key={`i-${i.id}`} value={`insumo||${i.id}`}>{i.nombre} ({i.unidad_medida})</option>)}
                      </optgroup>
                      <optgroup label="Subproductos (Catálogo)">
                        {productos.filter(p => p.id !== initialData?.id).map(p => (
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
                  {selectedItem?.startsWith('insumo||') && (
                    <div className="w-24">
                      <label className="block text-xs font-medium text-neutral-400 mb-1">Unidad</label>
                      <select 
                        className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-lg px-2 py-2 text-sm focus:border-indigo-500"
                        value={selectedUnidadReceta}
                        onChange={e => setSelectedUnidadReceta(e.target.value)}
                      >
                        <option value="Base">Base</option>
                        <option value="Oz">Onza (Oz)</option>
                        <option value="Lb">Libra (Lb)</option>
                      </select>
                    </div>
                  )}
                  <button type="button" onClick={addRecetaItem} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-2 h-[38px]">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </>
            )}

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
          </form>
        </div>

        <div className="p-6 border-t border-neutral-800 bg-neutral-950/50 shrink-0 flex gap-3">
          <button type="button" onClick={onClose} disabled={isPending} className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors">
            Cancelar
          </button>
          <button type="submit" form="prod-form" disabled={isPending} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors flex justify-center items-center gap-2">
            {isPending ? <Loader2 size={18} className="animate-spin" /> : 'Guardar Producto'}
          </button>
        </div>
      </div>
    </div>
  );
}




