'use client';

import React, { useState, useTransition, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, PackageSearch, Box, Share2, Copy, Check, ExternalLink, ToggleLeft, ToggleRight, Link } from 'lucide-react';
import ProductoForm from './ProductoForm';
import BulkRecetaModal from './BulkRecetaModal';
import DuplicarModal from './DuplicarModal';
import { deleteProducto } from '@/actions/catalogo-actions';
import { updateCatalogoConfig } from '@/app/dashboard/configuracion/actions';

export default function CatalogoClient({ 
  productos, 
  sedes, 
  categorias = [], 
  insumos, 
  recetas,
  empresa,
}: { 
  productos: any[], 
  sedes: any[], 
  categorias?: any[], 
  insumos: any[], 
  recetas: any[],
  empresa: {
    nombre_comercial: string;
    slug_catalogo: string | null;
    catalogo_activo: boolean;
    whatsapp_catalogo: string | null;
  } | null,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [selectedSede, setSelectedSede] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isDuplicarOpen, setIsDuplicarOpen] = useState(false);
  const [editingProd, setEditingProd] = useState<any>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [catalogoActivo, setCatalogoActivo] = useState(empresa?.catalogo_activo ?? false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const stateTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const typeTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const [optimisticStates, setOptimisticStates] = useState<Record<string, boolean>>({});
  const [optimisticTypes, setOptimisticTypes] = useState<Record<string, 'ELABORADO' | 'REVENTA' | 'SERVICIO'>>({});

  const filtered = productos.filter(p => {
    const matchesSearch = (p.nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (p.codigo_barras?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (p.descripcion?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesCat = !selectedCategoria || p.categoria_id === selectedCategoria;
        const matchesSede = !selectedSede || 
      (selectedSede === 'GLOBAL' 
        ? (!p.sede_id && (!p.sedes_ids || p.sedes_ids.length === 0)) 
        : (p.sede_id === selectedSede || (p.sedes_ids && p.sedes_ids.includes(selectedSede)))
      );
    return matchesSearch && matchesCat && matchesSede;
  });

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(p => p.id));
    }
  };

  const handleToggleEstado = (id: string, currentState: boolean) => {
    const newState = !currentState;
    setOptimisticStates(prev => ({ ...prev, [id]: newState }));
    
    if (stateTimeouts.current[id]) clearTimeout(stateTimeouts.current[id]);
    
    stateTimeouts.current[id] = setTimeout(() => {
      startTransition(async () => {
        const { toggleProductoEstado } = await import('@/actions/catalogo-actions');
        const res = await toggleProductoEstado(id, newState);
        if (!res.success) alert(res.error);
      });
    }, 2000);
  };

  const handleUpdateTipo = (id: string, newType: 'ELABORADO' | 'REVENTA' | 'SERVICIO') => {
    setOptimisticTypes(prev => ({ ...prev, [id]: newType }));
    
    if (typeTimeouts.current[id]) clearTimeout(typeTimeouts.current[id]);
    
    typeTimeouts.current[id] = setTimeout(() => {
      startTransition(async () => {
        const { quickUpdateProductoType } = await import('@/actions/catalogo-actions');
        const res = await quickUpdateProductoType(id, newType);
        if (!res.success) alert(res.error);
      });
    }, 2000);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`¿Eliminar ${selectedIds.length} productos seleccionados?`)) return;
    startTransition(async () => {
      const { bulkDeleteProductos } = await import('@/actions/catalogo-actions');
      const res = await bulkDeleteProductos(selectedIds);
      if (res.error) alert(res.error);
      else setSelectedIds([]);
    });
  };

    const handleBulkAssignSede = async (sId: string) => {
    startTransition(async () => {
      const { bulkUpdateProductos } = await import('@/actions/catalogo-actions');
      const res = await bulkUpdateProductos(selectedIds, { sede_id: sId === 'GLOBAL' ? null : sId });
      if (res.error) alert(res.error);
      else setSelectedIds([]);
    });
  };

  const handleBulkAssignCat = async (cId: string) => {
    startTransition(async () => {
      const { bulkUpdateProductos } = await import('@/actions/catalogo-actions');
      const res = await bulkUpdateProductos(selectedIds, { categoria_id: cId === 'NULL' ? null : cId });
      if (res.error) alert(res.error);
      else setSelectedIds([]);
    });
  };


  const handleEdit = (p: any) => {
    setEditingProd(p);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este producto?')) return;
    startTransition(async () => {
      await deleteProducto(id);
    });
  };

  const catalogUrl = empresa?.slug_catalogo
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/catalogo/${empresa.slug_catalogo}`
    : null;

  const handleCopyLink = () => {
    if (!catalogUrl) return;
    navigator.clipboard.writeText(catalogUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">

      {/* ── Panel de Catálogo Compartido ── */}
      {empresa && (
        <div className={`rounded-xl border p-4 transition-all ${
          catalogoActivo
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-neutral-900 border-neutral-800'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                catalogoActivo ? 'bg-emerald-500/15 text-emerald-400' : 'bg-neutral-800 text-neutral-500'
              }`}>
                <Share2 size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  Catálogo Público
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                    catalogoActivo
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                  }`}>
                    {catalogoActivo ? 'Activo' : 'Inactivo'}
                  </span>
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {catalogoActivo
                    ? 'Tu catálogo es visible públicamente. Los clientes pueden ver y pedir productos.'
                    : 'Activa el catálogo desde Ajustes para compartirlo con tus clientes.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {empresa.slug_catalogo && (
                <>
                  {/* Link con slug */}
                  <div className="hidden sm:flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-400 font-mono max-w-[200px] overflow-hidden">
                    <Link size={11} className="shrink-0 text-neutral-600" />
                    <span className="truncate">catalogo/<span className="text-emerald-400">{empresa.slug_catalogo}</span></span>
                  </div>

                  {/* Copiar */}
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white text-xs rounded-lg transition-all"
                  >
                    {copied
                      ? <><Check size={13} className="text-emerald-400" /> Copiado</>
                      : <><Copy size={13} /> Copiar link</>}
                  </button>

                  {/* Abrir */}
                  {catalogoActivo && catalogUrl && (
                    <a
                      href={catalogUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 text-xs rounded-lg transition-all"
                    >
                      <ExternalLink size={13} /> Ver catálogo
                    </a>
                  )}
                </>
              )}

              {/* Ir a Ajustes si no hay slug */}
              {!empresa.slug_catalogo && (
                <a
                  href="/dashboard/configuracion"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-600/30 text-indigo-400 text-xs rounded-lg transition-all"
                >
                  Configurar en Ajustes â†’
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Barra de búsqueda + botones ── */}
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
        <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:max-w-sm shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar producto o código..."
              className="w-full bg-neutral-900 border border-neutral-800 text-sm text-white rounded-lg pl-9 pr-4 py-2 focus:border-indigo-500 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <select
              value={selectedSede}
              onChange={(e) => setSelectedSede(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 text-sm text-indigo-300 rounded-lg px-3 py-2 focus:border-indigo-500 outline-none transition-colors flex-1 sm:flex-none sm:w-[140px] truncate"
            >
              <option value="">Cualquier Sede</option>
              <option value="GLOBAL">Global / Todas (Sin sede)</option>
              {sedes.map(s => (
                <option key={s.id} value={s.id}>{s.nombre_sede}</option>
              ))}
            </select>
            <select
              value={selectedCategoria}
              onChange={(e) => setSelectedCategoria(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 text-sm text-neutral-300 rounded-lg px-3 py-2 focus:border-indigo-500 outline-none transition-colors flex-1 sm:flex-none sm:w-[140px] truncate"
            >
              <option value="">Todas las categorías</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <button 
            onClick={() => setIsBulkOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-white rounded-lg font-medium transition-colors text-sm"
          >
            <Box size={16} /> Receta Masiva
          </button>
          <button 
            onClick={() => setIsDuplicarOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-indigo-300 rounded-lg font-medium transition-colors text-sm border border-neutral-700/50"
            title="Duplicar Catálogo entre sedes"
          >
            <Copy size={16} /> <span className="hidden sm:inline">Duplicar Catálogo</span>
          </button>
          <button 
            onClick={() => { setEditingProd(null); setIsFormOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors text-sm"
          >
            <Plus size={16} /> Crear Producto
          </button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/20 text-indigo-400 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">
              {selectedIds.length}
            </div>
            <span className="text-sm text-indigo-200 font-medium">Productos seleccionados</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={handleSelectAll}
              className="px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
            >
              Seleccionar Todos
            </button>
                        <select 
              className="px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors cursor-pointer outline-none"
              onChange={(e) => {
                if (!e.target.value) return;
                handleBulkAssignCat(e.target.value);
                e.target.value = "";
              }}
              disabled={isPending}
            >
              <option value="">Asignar Categoría...</option>
              <option value="NULL">Sin Categoría</option>
              {categorias.map(c => <option key={`bulk-cat-${c.id}`} value={c.id}>{c.nombre}</option>)}
            </select>
            <select 
              className="px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors cursor-pointer outline-none"
              onChange={(e) => {
                if (!e.target.value) return;
                handleBulkAssignSede(e.target.value);
                e.target.value = "";
              }}
              disabled={isPending}
            >
              <option value="">Asignar Sede...</option>
              <option value="GLOBAL">Global / Todas</option>
              {sedes.map(s => <option key={`bulk-sede-${s.id}`} value={s.id}>{s.nombre_sede}</option>)}
            </select>
            <button 
              onClick={handleBulkDelete}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={14} /> Eliminar
            </button>
          </div>
        </div>
      )}

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        
        {/* Mobile view (Cards) */}
        <div className="md:hidden divide-y divide-neutral-800/50">
          {filtered.map(p => {
              const isActivo = optimisticStates[p.id] !== undefined ? optimisticStates[p.id] : (p.estado_activo !== false);
              const currentType = optimisticTypes[p.id] || (p.es_servicio ? 'SERVICIO' : (p.es_compuesto ? 'ELABORADO' : 'REVENTA'));
              return (
              <div key={p.id} className="p-4 hover:bg-neutral-800/40 transition-colors flex flex-col gap-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleEdit(p); }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div onClick={e => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-indigo-500 cursor-pointer"
                      checked={selectedIds.includes(p.id)}
                      onChange={() => handleToggleSelect(p.id)}
                    />
                  </div>
                  {p.es_compuesto ? <PackageSearch className="text-emerald-400 w-5 h-5 shrink-0" /> : <Box className="text-blue-400 w-5 h-5 shrink-0" />}
                  <div>
                    <p className="font-medium text-white">{p.nombre}</p>
                    {p.descripcion && <p className="text-xs text-neutral-400 line-clamp-1">{p.descripcion}</p>}
                    <p className="text-[11px] text-neutral-500 mt-0.5">{p.codigo_barras || 'Sin código'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); handleEdit(p); }} className="p-2 text-neutral-400 hover:text-indigo-400 bg-neutral-800/50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} disabled={isPending} className="p-2 text-neutral-400 hover:text-rose-400 bg-neutral-800/50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-medium truncate max-w-[100px]">
                  {p.sedes_ids?.length > 1 ? p.sedes_ids.length + ' sedes' : sedes.find(s => s.id === (p.sede_id || p.sedes_ids?.[0]))?.nombre_sede || 'Global / Todas'}
                </span>
                {p.categorias?.nombre ? (
                  <span className="px-2 py-0.5 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-300 text-[10px] font-medium">
                    {p.categorias.nombre}
                  </span>
                ) : (
                  <span className="text-[10px] text-neutral-600 italic">Sin categoría</span>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); handleToggleEstado(p.id, isActivo); }}
                  disabled={isPending}
                  className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                    isActivo
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                  }`}
                >
                  {isActivo ? 'Activo' : 'Inactivo'}
                </button>
                <select
                  value={currentType}
                  onClick={e => e.stopPropagation()}
                  onChange={(e) => handleUpdateTipo(p.id, e.target.value as any)}
                  disabled={isPending}
                  className={`text-[10px] font-medium rounded-md px-1.5 py-0.5 outline-none cursor-pointer border ${
                    currentType === 'SERVICIO' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    currentType === 'ELABORADO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}
                >
                  <option value="REVENTA" className="bg-neutral-900 text-white">Reventa</option>
                  <option value="ELABORADO" className="bg-neutral-900 text-white">Elaborado</option>
                  <option value="SERVICIO" className="bg-neutral-900 text-white">Servicio</option>
                </select>
              </div>

              <div className="flex justify-between items-center bg-neutral-950/50 p-2 rounded-lg border border-neutral-800/50 mt-1">
                <div className="flex flex-col">
                  <span className="text-[10px] text-neutral-500 uppercase font-semibold">Costo</span>
                  <span className="font-mono text-neutral-300 text-sm">${(Number(p.costo) || 0).toFixed(2)}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-neutral-500 uppercase font-semibold">Precio Venta</span>
                  <span className="font-mono text-emerald-400 text-sm font-bold">${(Number(p.precio_venta) || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
            })}
            {filtered.length === 0 && (
            <div className="p-8 text-center text-neutral-500 text-sm">No se encontraron productos.</div>
          )}
        </div>

        {/* Desktop view (Table) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-neutral-950/50 text-neutral-400">
              <tr>
                <th className="px-6 py-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-indigo-500 cursor-pointer"
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-6 py-4 font-medium">Producto</th>
                <th className="px-6 py-4 font-medium">Sucursal</th>
                <th className="px-6 py-4 font-medium">Categoría</th>
                <th className="px-6 py-4 font-medium text-center">Estado</th>
                <th className="px-6 py-4 font-medium">Tipo</th>
                <th className="px-6 py-4 font-medium">Costo</th>
                <th className="px-6 py-4 font-medium">P. Venta</th>
                <th className="px-6 py-4 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50 text-neutral-300">
              {filtered.map(p => {
                const isActivo = optimisticStates[p.id] !== undefined ? optimisticStates[p.id] : (p.estado_activo !== false);
                const currentType = optimisticTypes[p.id] || (p.es_servicio ? 'SERVICIO' : (p.es_compuesto ? 'ELABORADO' : 'REVENTA'));
                return (
                <tr key={p.id} className="hover:bg-neutral-800/40 transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); handleEdit(p); }}>
                  <td className="px-6 py-4 w-12 text-center" onClick={e => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-indigo-500 cursor-pointer"
                      checked={selectedIds.includes(p.id)}
                      onChange={() => handleToggleSelect(p.id)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {p.es_compuesto ? <PackageSearch className="text-emerald-400 w-5 h-5" /> : <Box className="text-blue-400 w-5 h-5" />}
                      <div>
                        <p className="font-medium text-white">{p.nombre}</p>
                        {p.descripcion && (
                          <p className="text-xs text-neutral-400 max-w-xs line-clamp-1">{p.descripcion}</p>
                        )}
                        <p className="text-[11px] text-neutral-500">{p.codigo_barras || 'Sin código'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
                      {p.sedes_ids?.length > 1 ? p.sedes_ids.length + ' sedes' : sedes.find(s => s.id === (p.sede_id || p.sedes_ids?.[0]))?.nombre_sede || 'Global / Todas'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {p.categorias?.nombre ? (
                      <span className="px-2.5 py-0.5 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-medium">
                        {p.categorias.nombre}
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-600 italic">Sin categoría</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleToggleEstado(p.id, isActivo); }}
                      disabled={isPending}
                      className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                        isActivo
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700'
                      }`}
                    >
                      {isActivo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={currentType}
                      onClick={e => e.stopPropagation()}
                      onChange={(e) => handleUpdateTipo(p.id, e.target.value as any)}
                      disabled={isPending}
                      className={`text-[11px] font-medium rounded-md px-2 py-1 outline-none cursor-pointer border ${
                        currentType === 'SERVICIO' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        currentType === 'ELABORADO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}
                    >
                      <option value="REVENTA" className="bg-neutral-900 text-white">Reventa</option>
                      <option value="ELABORADO" className="bg-neutral-900 text-white">Elaborado</option>
                      <option value="SERVICIO" className="bg-neutral-900 text-white">Servicio</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 font-mono text-neutral-400">
                    ${(Number(p.costo) || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 font-mono font-medium text-white">
                    ${(Number(p.precio_venta) || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(p); }} className="text-neutral-500 hover:text-indigo-400 transition-colors"><Edit2 size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} disabled={isPending} className="text-neutral-500 hover:text-rose-400 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">No se encontraron productos.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <ProductoForm 
          initialData={editingProd} 
          sedes={sedes}
          categorias={categorias}
          insumos={insumos}
          productos={productos}
          recetas={recetas}
          onClose={() => setIsFormOpen(false)} 
        />
      )}

      {isBulkOpen && (
        <BulkRecetaModal
          productos={productos}
          insumos={insumos}
          onClose={() => setIsBulkOpen(false)}
        />
      )}
    </div>
  );
}








