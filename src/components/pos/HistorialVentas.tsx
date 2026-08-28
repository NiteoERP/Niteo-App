'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { HistorialVentaPOS, getHistorialVentasCompleto, toggleVentaVerificada } from '@/actions/pos-actions';
import { Search, Calendar, ChevronDown, ChevronUp, Receipt, DollarSign, Clock, Users, CheckCircle2, Circle, Hash, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, addMonths, subMonths, isSameDay, parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';

export default function HistorialVentas({ sedeId }: { sedeId: string }) {
  const [ventas, setVentas] = useState<HistorialVentaPOS[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Filtros
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  
  // Estado del calendario
  const [calMonth, setCalMonth] = useState<Date>(startOfMonth(new Date()));
  const [allMonthVentas, setAllMonthVentas] = useState<HistorialVentaPOS[]>([]);

  const cargarVentas = async () => {
    setLoading(true);
    const data = await getHistorialVentasCompleto(sedeId, fechaFiltro || undefined);
    setVentas(data);
    setLoading(false);
  };

  useEffect(() => {
    cargarVentas();
    
    // Realtime changes for new sales
    const supabase = createClient();
    const channel = supabase.channel('realtime_ventas_historial')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas_facturas', filter: `sede_id=eq.${sedeId}` }, () => {
        cargarVentas();
        getHistorialVentasCompleto(sedeId).then(setAllMonthVentas);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sedeId, fechaFiltro]);

  useEffect(() => {
    getHistorialVentasCompleto(sedeId).then(setAllMonthVentas);
  }, [sedeId, calMonth]);

  const dayStatusMap = useMemo(() => {
    const map = new Map<string, 'verified' | 'partial' | 'empty'>();
    const daysInMonth = eachDayOfInterval({ start: startOfMonth(calMonth), end: endOfMonth(calMonth) });

    daysInMonth.forEach(day => {
      const key = format(day, 'yyyy-MM-dd');
      const dayVentas = allMonthVentas.filter(v => {
        const ventaDate = format(parseISO(v.fecha_venta), 'yyyy-MM-dd');
        return ventaDate === key;
      });
      if (dayVentas.length === 0) {
        map.set(key, 'empty');
      } else if (dayVentas.every(v => v.verificado)) {
        map.set(key, 'verified');
      } else {
        map.set(key, 'partial');
      }
    });
    return map;
  }, [allMonthVentas, calMonth]);

  const calDays = eachDayOfInterval({ start: startOfMonth(calMonth), end: endOfMonth(calMonth) });
  const firstDayOffset = getDay(startOfMonth(calMonth));
  const today = new Date();

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' USD';
  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    const dateOpts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    return `${d.toLocaleDateString('es-ES', dateOpts)} - ${d.toLocaleTimeString('en-US', timeOpts)}`;
  };
  
  const handleToggleVerificado = async (e: React.MouseEvent, id: string, estadoActual: boolean) => {
    e.stopPropagation();
    const nuevoEstado = !estadoActual;
    setVentas(prev => prev.map(v => v.id_factura.toString() === id ? { ...v, verificado: nuevoEstado } : v));
    await toggleVentaVerificada(id, nuevoEstado);
    const updated = await getHistorialVentasCompleto(sedeId);
    setAllMonthVentas(updated);
  };

  const filtradas = ventas.filter(v => {
    if (busqueda) {
      const b = busqueda.toLowerCase();
      return v.numero_documento.toLowerCase().includes(b) || 
             (v.cliente_nombre && v.cliente_nombre.toLowerCase().includes(b));
    }
    return true;
  });

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 md:p-6 animate-in fade-in space-y-6">
      
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCalMonth(subMonths(calMonth, 1))} className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-white capitalize">{format(calMonth, 'MMMM yyyy', { locale: es })}</p>
            <div className="flex items-center justify-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-xs text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Verificado</span>
              <span className="flex items-center gap-1 text-xs text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Parcial</span>
              <span className="flex items-center gap-1 text-xs text-neutral-500"><span className="w-2 h-2 rounded-full bg-neutral-700 inline-block" /> Sin ventas</span>
            </div>
          </div>
          <button onClick={() => setCalMonth(addMonths(calMonth, 1))} className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-neutral-600 uppercase py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOffset }).map((_, i) => <div key={`pad-${i}`} />)}
          {calDays.map(day => {
            const key = format(day, 'yyyy-MM-dd');
            const status = dayStatusMap.get(key) ?? 'empty';
            const isToday = isSameDay(day, today);
            const isSelected = fechaFiltro === key;

            let bgClass = 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400';
            if (status === 'verified') bgClass = 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30';
            else if (status === 'partial') bgClass = 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30';

            return (
              <button
                key={key}
                onClick={() => setFechaFiltro(isSelected ? '' : key)}
                className={`relative text-center text-xs font-medium py-1.5 rounded-lg transition-all ${bgClass} ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-neutral-950' : ''} ${isToday ? 'font-bold' : ''}`}
              >
                {format(day, 'd')}
                {isToday && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Receipt className="text-indigo-400" />
          Historial Detallado
        </h2>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
            <input 
              type="text" 
              placeholder="Buscar documento o cliente..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-black/40 border border-neutral-800 text-white text-sm rounded-lg pl-9 pr-3 py-2 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="relative">
            <input 
              type="date" 
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              title="Seleccionar fecha"
              className="relative bg-neutral-900 border border-neutral-800 text-white text-sm rounded-lg pl-3 pr-10 py-2.5 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer hover:bg-neutral-800 [color-scheme:dark] w-[150px] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer transition-colors"
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12 text-indigo-400 animate-pulse">Cargando historial...</div>
      ) : filtradas.length === 0 ? (
        <div className="text-center p-12 text-neutral-500 border border-neutral-800 border-dashed rounded-xl">
          No hay ventas registradas {fechaFiltro ? 'en esta fecha' : 'recientemente'}.
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(venta => (
            <div key={venta.id_factura} className="bg-black/20 border border-neutral-800 rounded-lg overflow-hidden transition-all hover:border-neutral-700">
              {/* Resumen Fila */}
              <div 
                className="p-4 cursor-pointer flex flex-wrap md:flex-nowrap items-center justify-between gap-4"
                onClick={() => setExpandedId(expandedId === venta.id_factura.toString() ? null : venta.id_factura.toString())}
              >
                <div className="flex items-center gap-4 min-w-[200px]">
                    <button 
                      onClick={(e) => handleToggleVerificado(e, venta.id_factura.toString(), !!venta.verificado)}
                      className={`p-1 rounded-full transition-colors ${venta.verificado ? 'text-emerald-400 hover:text-emerald-300' : 'text-neutral-600 hover:text-neutral-400'}`}
                      title={venta.verificado ? "Desmarcar" : "Marcar como verificado"}
                    >
                      {venta.verificado ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                    </button>
                    <div className="bg-neutral-800 p-2 rounded-lg">
                      <Receipt size={20} className="text-indigo-400" />
                    </div>
                  <div>
                    <p className="text-white font-bold">{formatDocNumber(venta.numero_documento)}</p>
                    <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1">
                      <Clock size={12} /> {formatDateTime(venta.fecha_venta)}
                    </div>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-w-[300px]">
                      <div className="flex flex-col items-start justify-center">
                        <p className="text-xs text-neutral-500 mb-1 w-full text-left">Cliente</p>
                        <div className="flex items-center justify-start gap-1.5 text-neutral-300 text-sm font-medium w-full text-left">
                          <Users size={14} className="text-neutral-500 shrink-0" />
                          <span className="truncate">{venta.cliente_nombre && venta.cliente_nombre !== 'Unknown' ? venta.cliente_nombre : 'Consumidor Final'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-start justify-center">
                        <p className="text-xs text-neutral-500 mb-1 w-full text-left">Núm. Orden / Mesa</p>
                        <div className="flex items-center justify-start gap-1.5 text-neutral-300 text-sm font-medium w-full text-left">
                          <Hash size={14} className="text-neutral-500 shrink-0" />
                          <span className="truncate">{venta.numero_orden || '-'}</span>
                        </div>
                      </div>
                    </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400">{formatCurrency(venta.total)}</p>
                    <p className="text-xs text-neutral-500">{venta.pagos?.length > 0 ? venta.pagos.map(p => p.tipo_pago).join(', ') : (venta.esta_pagado ? 'No registrado' : 'A Crédito / Por pagar')}</p>
                  </div>
                  {expandedId === venta.id_factura.toString() ? <ChevronUp size={20} className="text-neutral-500" /> : <ChevronDown size={20} className="text-neutral-500" />}
                </div>
              </div>

              {/* Detalle Expandido */}
              {expandedId === venta.id_factura.toString() && (
                <div className="bg-neutral-900/50 p-4 border-t border-neutral-800">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Detalle de la Orden</h4>
                  <div className="space-y-2">
                    {venta.detalles.map(d => (
                      <div key={d.id_detalle} className="flex justify-between items-center text-sm py-1.5 border-b border-neutral-800/50 last:border-0">
                        <div className="flex items-center gap-2 text-neutral-300">
                          <span className="bg-neutral-800 text-indigo-400 text-xs px-2 py-0.5 rounded-full font-medium">{d.cantidad}x</span>
                          <span>{d.producto_nombre || 'Producto'}</span>
                        </div>
                        <span className="text-neutral-400 font-medium">{formatCurrency(d.total)}</span>
                      </div>
                    ))}
                  </div>

                  {venta.pagos && venta.pagos.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-neutral-800/50">
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Mtodos de Pago</h4>
                      <div className="flex gap-2 flex-wrap">
                        {venta.pagos.map((p, idx) => (
                          <span key={idx} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-1 rounded-md font-medium flex items-center gap-1">
                            <DollarSign size={12} />
                            {p.tipo_pago}: {formatCurrency(p.monto)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDocNumber(doc: string) {
  if (!doc) return "";
  const parts = doc.split("-");
  if (parts.length === 3) {
    const num = parseInt(parts[2], 10);
    return `#${num}`;
  }
  return `#${doc}`;
}
