'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';

export default function CatalogView({ catalog }: { catalog: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCatalog = catalog.filter((prod) =>
    (prod.nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (prod.codigo_barras?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col h-[600px]">
      <div className="p-4 border-b border-neutral-800 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-white">Catálogo Sincronizado</h3>
          <span className="text-xs px-2 py-1 bg-neutral-800 text-neutral-400 rounded-full">{filteredCatalog.length} productos</span>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
            className="w-full bg-neutral-950 border border-neutral-800 text-sm text-white rounded-md pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm text-neutral-400">
          <thead className="bg-neutral-950/50 text-xs uppercase text-neutral-500 sticky top-0 backdrop-blur-md">
            <tr>
              <th className="px-6 py-4 font-medium">Código</th>
              <th className="px-6 py-4 font-medium">Producto</th>
              <th className="px-6 py-4 font-medium text-right">Costo</th>
              <th className="px-6 py-4 font-medium text-right">Precio Venta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {filteredCatalog.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-neutral-500">
                  {catalog.length === 0 ? "No hay productos sincronizados." : "No se encontraron resultados para tu búsqueda."}
                </td>
              </tr>
            ) : (
              filteredCatalog.map((prod) => (
                <tr key={prod.id_producto} className="hover:bg-neutral-800/30 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs">{prod.codigo_barras || '-'}</td>
                  <td className="px-6 py-4 font-medium text-neutral-200">{prod.nombre}</td>
                  <td className="px-6 py-4 text-right">${Number(prod.costo).toFixed(2)}</td>
                  <td className="px-6 py-4 text-right text-emerald-400 font-medium">${Number(prod.precio_venta).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
