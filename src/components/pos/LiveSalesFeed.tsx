'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { VentaPOS } from '@/actions/pos-actions';
import { Eye, EyeOff, Receipt, Clock, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface LiveSalesFeedProps {
  initialSales: VentaPOS[];
  sedeId: string;
}

export default function LiveSalesFeed({ initialSales, sedeId }: LiveSalesFeedProps) {
  const [sales, setSales] = useState<VentaPOS[]>(initialSales);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    // Restaurar preferencia de privacidad
    const savedPrivacy = localStorage.getItem('niteo_privacy_mode');
    if (savedPrivacy === 'true') setPrivacyMode(true);
  }, []);

  const togglePrivacy = () => {
    const newVal = !privacyMode;
    setPrivacyMode(newVal);
    localStorage.setItem('niteo_privacy_mode', newVal.toString());
  };

  useEffect(() => {
    const channel = supabase
      .channel('realtime-ventas')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ventas_facturas', filter: `sede_id=eq.${sedeId}` },
        async (payload) => {
          const newVentaRaw = payload.new;
          
          // Como Realtime de INSERT solo trae la fila insertada y no las relaciones (ventas_detalles),
          // podríamos hacer un fetch rápido del detalle o agregarlo de forma optimista.
          // Para esta demostración, hacemos un pequeño fetch del detalle:
          const { data: detalles } = await supabase
            .from('ventas_detalles')
            .select('id_detalle:id, id_producto, cantidad, precio_unitario, total, productos(nombre, codigo_barras)')
            .eq('factura_id', newVentaRaw.id);

          const mappedDetalles = (detalles || []).map((d: any) => ({
            id_detalle: d.id_detalle,
            id_producto: d.id_producto,
            cantidad: d.cantidad,
            precio_unitario: d.precio_unitario,
            total: d.total,
            producto_nombre: d.productos?.nombre,
            producto_codigo: d.productos?.codigo_barras,
          }));

          const newVenta: VentaPOS = {
            id_factura: newVentaRaw.id,
            id_pos: newVentaRaw.id_pos,
            numero_documento: newVentaRaw.numero_documento,
            fecha_venta: newVentaRaw.fecha_venta,
            total: newVentaRaw.total,
            descuento: newVentaRaw.descuento,
            tipo_documento: newVentaRaw.tipo_documento,
            esta_pagado: newVentaRaw.esta_pagado,
            detalles: mappedDetalles,
          };

          // Añadir la nueva venta al principio de la lista y dar efecto visual
          setSales((current) => [newVenta, ...current]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sedeId, supabase]);

  const toggleRow = (id: number) => {
    if (expandedRow === id) setExpandedRow(null);
    else setExpandedRow(id);
  };

  const formatCurrency = (amount: number) => {
    if (privacyMode) return '****';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      
      {/* Controles Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <h3 className="text-sm font-medium text-emerald-400 uppercase tracking-widest">Live Sync Activo</h3>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={togglePrivacy}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${privacyMode ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
          >
            {privacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
            <span className="hidden sm:inline">{privacyMode ? 'Modo Oculto' : 'Ocultar Valores'}</span>
          </button>
        </div>
      </div>

      {/* Tabla de Ventas en Vivo */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        {sales.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            <Receipt className="mx-auto h-12 w-12 opacity-20 mb-4" />
            <p>Esperando por nuevas ventas...</p>
            <p className="text-xs mt-1">Las transacciones del POS aparecerán aquí automáticamente.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {sales.map((sale) => (
              <div key={sale.id_factura} className="group flex flex-col hover:bg-neutral-800/30 transition-colors duration-200">
                {/* Row Header */}
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => toggleRow(sale.id_factura)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                      <Receipt size={20} />
                    </div>
                    <div>
                      <p className="text-neutral-200 font-medium flex items-center gap-2">
                        #{sale.numero_documento}
                        {sale.esta_pagado && <CheckCircle2 size={14} className="text-emerald-500" />}
                      </p>
                      <p className="text-neutral-500 text-sm flex items-center gap-1 mt-0.5">
                        <Clock size={12} /> {formatTime(sale.fecha_venta)} • {sale.tipo_documento}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-neutral-200 font-bold text-lg">{formatCurrency(sale.total)}</p>
                      {sale.descuento > 0 && !privacyMode && (
                        <p className="text-amber-500 text-xs">- {formatCurrency(sale.descuento)} desc.</p>
                      )}
                    </div>
                    <div className="text-neutral-600 group-hover:text-neutral-400 transition-colors">
                      {expandedRow === sale.id_factura ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedRow === sale.id_factura && (
                  <div className="px-4 pb-4 pt-2 bg-neutral-950/50 border-t border-neutral-800/50">
                    <div className="pl-14">
                      <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">Items del Ticket</h4>
                      <div className="space-y-2">
                        {sale.detalles.length === 0 ? (
                          <p className="text-sm text-neutral-600 italic">No hay detalles registrados para esta factura.</p>
                        ) : (
                          sale.detalles.map((detalle, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-neutral-500 w-6">{detalle.cantidad}x</span>
                                <span className="text-neutral-300">{detalle.producto_nombre || 'Producto Desconocido'}</span>
                              </div>
                              <span className="text-neutral-400">{formatCurrency(detalle.total)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
