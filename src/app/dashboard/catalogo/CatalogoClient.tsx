'use client';

import React, { useState, useTransition } from 'react';
import { Plus, Search, Edit2, Trash2, PackageSearch, Box } from 'lucide-react';
import ProductoForm from './ProductoForm';
import { deleteProducto } from '@/actions/catalogo-actions';

export default function CatalogoClient({ productos, sedes }: { productos: any[], sedes: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProd, setEditingProd] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = productos.filter(p => 
    (p.nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (p.codigo_barras?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

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
      <div className="flex justify-between items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar producto..."
            className="w-full bg-neutral-900 border border-neutral-800 text-sm text-white rounded-lg pl-9 pr-4 py-2 focus:border-indigo-500 transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => { setEditingProd(null); setIsFormOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors text-sm"
        >
          <Plus size={16} /> Crear Producto
        </button>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-950/50 text-neutral-400">
              <tr>
                <th className="px-6 py-4 font-medium">Producto</th>
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
                        <p className="text-xs text-neutral-500">{p.codigo_barras || 'Sin código'}</p>
                      </div>
                    </div>
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
                  <td className="px-6 py-4 font-mono text-neutral-400"></td>
                  <td className="px-6 py-4 font-mono font-medium text-white"></td>
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
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">No se encontraron productos.</td>
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
          onClose={() => setIsFormOpen(false)} 
        />
      )}
    </div>
  );
}
