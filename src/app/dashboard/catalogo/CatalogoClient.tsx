'use client';

import React, { useState, useTransition } from 'react';
import { Plus, Search, Edit2, Trash2, PackageSearch, Box } from 'lucide-react';
import ProductoForm from './ProductoForm';
import BulkRecetaModal from './BulkRecetaModal';
import { deleteProducto } from '@/actions/catalogo-actions';

export default function CatalogoClient({ 
  productos, 
  sedes, 
  categorias = [], 
  insumos, 
  recetas 
}: { 
  productos: any[], 
  sedes: any[], 
  categorias?: any[], 
  insumos: any[], 
  recetas: any[] 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [editingProd, setEditingProd] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = productos.filter(p => {
    const matchesSearch = (p.nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (p.codigo_barras?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (p.descripcion?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesCat = !selectedCategoria || p.categoria_id === selectedCategoria;
    return matchesSearch && matchesCat;
  });

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar producto o código..."
              className="w-full bg-neutral-900 border border-neutral-800 text-sm text-white rounded-lg pl-9 pr-4 py-2 focus:border-indigo-500 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            value={selectedCategoria}
            onChange={(e) => setSelectedCategoria(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 text-sm text-neutral-300 rounded-lg px-3 py-2 focus:border-indigo-500 outline-none transition-colors shrink-0"
          >
            <option value="">Todas las categorías</option>
            {categorias.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 shrink-0">
          <button 
            onClick={() => setIsBulkOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-white rounded-lg font-medium transition-colors text-sm"
          >
            <Box size={16} /> Receta Masiva
          </button>
          <button 
            onClick={() => { setEditingProd(null); setIsFormOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors text-sm"
          >
            <Plus size={16} /> Crear Producto
          </button>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        
        {/* Mobile view (Cards) */}
        <div className="md:hidden divide-y divide-neutral-800/50">
          {filtered.map(p => (
            <div key={p.id} className="p-4 hover:bg-neutral-800/20 transition-colors flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {p.es_compuesto ? <PackageSearch className="text-emerald-400 w-5 h-5 shrink-0" /> : <Box className="text-blue-400 w-5 h-5 shrink-0" />}
                  <div>
                    <p className="font-medium text-white">{p.nombre}</p>
                    {p.descripcion && <p className="text-xs text-neutral-400 line-clamp-1">{p.descripcion}</p>}
                    <p className="text-[11px] text-neutral-500 mt-0.5">{p.codigo_barras || 'Sin código'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(p)} className="p-2 text-neutral-400 hover:text-indigo-400 bg-neutral-800/50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(p.id)} disabled={isPending} className="p-2 text-neutral-400 hover:text-rose-400 bg-neutral-800/50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-1">
                {p.categorias?.nombre ? (
                  <span className="px-2 py-0.5 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-300 text-[10px] font-medium">
                    {p.categorias.nombre}
                  </span>
                ) : (
                  <span className="text-[10px] text-neutral-600 italic">Sin categoría</span>
                )}
                {p.es_compuesto ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium border border-emerald-500/20">
                    Elaborado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-medium border border-blue-500/20">
                    Reventa
                  </span>
                )}
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
          ))}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-neutral-500 text-sm">No se encontraron productos.</div>
          )}
        </div>

        {/* Desktop view (Table) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-950/50 text-neutral-400">
              <tr>
                <th className="px-6 py-4 font-medium">Producto</th>
                <th className="px-6 py-4 font-medium">Categoría</th>
                <th className="px-6 py-4 font-medium">Tipo</th>
                <th className="px-6 py-4 font-medium">Costo</th>
                <th className="px-6 py-4 font-medium">P. Venta</th>
                <th className="px-6 py-4 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50 text-neutral-300">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-neutral-800/20 transition-colors">
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
                    {p.categorias?.nombre ? (
                      <span className="px-2.5 py-0.5 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-medium">
                        {p.categorias.nombre}
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-600 italic">Sin categoría</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {p.es_compuesto ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                        Elaborado
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20">
                        Reventa / Simple
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-neutral-400">
                    ${(Number(p.costo) || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 font-mono font-medium text-white">
                    ${(Number(p.precio_venta) || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button onClick={() => handleEdit(p)} className="text-neutral-500 hover:text-indigo-400 transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(p.id)} disabled={isPending} className="text-neutral-500 hover:text-rose-400 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
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
