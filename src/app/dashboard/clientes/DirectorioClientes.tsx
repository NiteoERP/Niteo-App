'use client';

import React, { useState, useMemo } from 'react';
import { Search, Mail, Phone, MapPin, ChevronDown, ChevronUp, ShoppingBag, DollarSign, Building, Calendar, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function DirectorioClientes({ clientes }: { clientes: any[] }) {
  const [busqueda, setBusqueda] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const filteredClientes = useMemo(() => {
    return clientes.filter(c => 
      c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.rif_cedula?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.telefono?.includes(busqueda)
    );
  }, [clientes, busqueda]);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-neutral-800 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, cédula o teléfono..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full h-14 bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <span className="text-sm font-medium text-neutral-400">
          {filteredClientes.length} Registros
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-950/50 text-neutral-500 font-medium border-b border-neutral-800">
            <tr>
              <th className="px-6 py-4">Cliente / ID</th>
              <th className="px-6 py-4">Contacto</th>
              <th className="px-6 py-4">Sede Frecuente</th>
              <th className="px-6 py-4 text-right">Pedidos</th>
              <th className="px-6 py-4 text-right">Ticket Prom.</th>
              <th className="px-6 py-4 text-right">Total Gastado</th>
              <th className="px-4 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {filteredClientes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                  <p>No se encontraron clientes.</p>
                </td>
              </tr>
            )}
            {filteredClientes.map((cliente) => (
              <React.Fragment key={cliente.id}>
                <tr 
                  className={`hover:bg-white/[0.02] transition-colors cursor-pointer ${expandedId === cliente.id ? 'bg-white/[0.02]' : ''}`}
                  onClick={() => setExpandedId(expandedId === cliente.id ? null : cliente.id)}
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-white text-base">{cliente.nombre}</div>
                    <div className="text-xs text-neutral-500 mt-1 font-mono">CI/RIF: {cliente.rif_cedula || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-neutral-400 text-xs">
                      <Phone size={14} className="text-indigo-400" /> {cliente.telefono || 'Sin teléfono'}
                    </div>
                    {cliente.email && (
                      <div className="flex items-center gap-2 text-neutral-400 text-xs">
                        <Mail size={14} className="text-indigo-400" /> {cliente.email}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-neutral-400 text-sm">
                      <Building size={16} className="text-neutral-500" />
                      {cliente.sedeFrecuente}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1.5 bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded-lg font-medium">
                      <ShoppingBag size={14} className="text-indigo-400" />
                      {cliente.numPedidos}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-neutral-300">
                    {formatCurrency(cliente.ticketPromedio)}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-400">
                    {formatCurrency(cliente.totalGastado)}
                  </td>
                  <td className="px-4 py-4 text-neutral-500">
                    {expandedId === cliente.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </td>
                </tr>
                
                {/* Expandable History */}
                {expandedId === cliente.id && (
                  <tr>
                    <td colSpan={7} className="p-0 border-b border-neutral-800 bg-neutral-950/30">
                      <div className="p-6">
                        <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Receipt size={16} /> Historial de Pedidos ({cliente.numPedidos})
                        </h4>
                        
                        {cliente.historial.length === 0 ? (
                          <p className="text-sm text-neutral-500 italic">No hay pedidos registrados para este cliente.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {cliente.historial.map((pedido: any) => (
                              <div key={pedido.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                  <span className="text-xs font-bold text-neutral-400">{pedido.numero_documento || 'Pedido'}</span>
                                  <span className="text-sm font-bold text-emerald-400">{formatCurrency(pedido.total)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-neutral-500">
                                  <Calendar size={12} />
                                  {pedido.fecha_venta ? format(new Date(pedido.fecha_venta), 'dd MMM yyyy, hh:mm a', { locale: es }) : 'Fecha desconocida'}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-neutral-500">
                                  <Building size={12} />
                                  <span className="truncate">{pedido.sedes?.nombre_sede || 'Sede N/A'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
