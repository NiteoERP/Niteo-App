'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { HistorialVentaPOS, getHistorialVentasCompleto, toggleVentaVerificada, getResumenVerificacionMes } from '@/actions/pos-actions';
import { Search, Calendar, ChevronDown, ChevronUp, Receipt, DollarSign, Clock, Users, CheckCircle2, Circle, Hash, ChevronLeft, ChevronRight, Printer, Ban, Sparkles, Filter, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useEmpresa } from '@/components/providers/EmpresaProvider';
import { normalizePaymentKey, getCanonicalPaymentMethodName, unifyPaymentMethods } from '@/utils/payment-methods';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, addMonths, subMonths, isSameDay, parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';

export default function HistorialVentas({ sedeId }: { sedeId: string }) {
  const { timeZone, empresa } = useEmpresa();
  const activeTz = timeZone || empresa?.zona_horaria || 'America/Caracas';

  const [ventas, setVentas] = useState<HistorialVentaPOS[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Filtros
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroMetodo, setFiltroMetodo] = useState('TODOS');
  const [page, setPage] = useState(1);
  
  // Estado del calendario (resumen de verificación del mes exacto sin límites)
  const [calMonth, setCalMonth] = useState<Date>(startOfMonth(new Date()));
  const [monthSummary, setMonthSummary] = useState<Record<string, { total: number; verified: number }>>({});

  const cargarVentas = async () => {
    setLoading(true);
    const data = await getHistorialVentasCompleto(sedeId, fechaFiltro || undefined, page, 100, activeTz);
    setVentas(prev => page === 1 ? data : [...prev, ...data]);
    setLoading(false);
  };

  useEffect(() => {
    cargarVentas();
    
    // Realtime changes for new sales
    const supabase = createClient();
    const channel = supabase.channel('realtime_ventas_historial')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas_facturas', filter: `sede_id=eq.${sedeId}` }, () => {
        getHistorialVentasCompleto(sedeId, fechaFiltro || undefined, page, 100, activeTz).then(data => setVentas(data));
        getResumenVerificacionMes(sedeId, format(calMonth, 'yyyy-MM'), activeTz).then(setMonthSummary);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sedeId, fechaFiltro, page, activeTz]);

  useEffect(() => {
    getResumenVerificacionMes(sedeId, format(calMonth, 'yyyy-MM'), activeTz).then(setMonthSummary);
  }, [sedeId, calMonth, activeTz]);

  const dayStatusMap = useMemo(() => {
    const map = new Map<string, 'verified' | 'partial' | 'empty'>();
    const daysInMonth = eachDayOfInterval({ start: startOfMonth(calMonth), end: endOfMonth(calMonth) });

    daysInMonth.forEach(day => {
      const key = format(day, 'yyyy-MM-dd');
      const dayData = monthSummary[key];

      if (!dayData || dayData.total === 0 || dayData.verified === 0) {
        // Sin ventas o 0 ventas verificadas -> Vacío / Sin verificar
        map.set(key, 'empty');
      } else if (dayData.verified >= dayData.total) {
        // Todas las ventas del día verificadas -> OK (Verde)
        map.set(key, 'verified');
      } else {
        // Hay al menos 1 verificada pero faltan otras -> Parcial (Ámbar)
        map.set(key, 'partial');
      }
    });
    return map;
  }, [monthSummary, calMonth]);

  const calDays = eachDayOfInterval({ start: startOfMonth(calMonth), end: endOfMonth(calMonth) });
  const firstDayOffset = getDay(startOfMonth(calMonth));
  const today = new Date();

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' USD';
  const formatDateTime = (iso: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    const dateOpts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', timeZone: activeTz };
    const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: activeTz };
    return `${d.toLocaleDateString('es-ES', dateOpts)} - ${d.toLocaleTimeString('en-US', timeOpts)}`;
  };
  
  const handleToggleVerificado = async (e: React.MouseEvent, id: string, estadoActual: boolean) => {
    e.stopPropagation();
    const nuevoEstado = !estadoActual;
    setVentas(prev => prev.map(v => v.id_factura.toString() === id ? { ...v, verificado: nuevoEstado } : v));
    await toggleVentaVerificada(id, nuevoEstado);
    const updatedSummary = await getResumenVerificacionMes(sedeId, format(calMonth, 'yyyy-MM'));
    setMonthSummary(updatedSummary);
  };

  const handleAnular = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("¿Estás seguro de anular esta venta? Esta acción no se puede deshacer (se marcará inactiva).")) return;
    
    const { anularVentaPOS } = await import('@/actions/pos-actions');
    const res = await anularVentaPOS(id);
    if (res.success) {
      setVentas(prev => prev.map(v => v.id_factura.toString() === id ? { ...v, estado_activo: false } : v));
      alert("Venta anulada correctamente.");
    } else {
      alert("Error al anular: " + res.error);
    }
  };

  const handleReimprimir = async (e: React.MouseEvent, venta: HistorialVentaPOS) => {
    e.stopPropagation();
    try {
      const { generarTicketPOS, generarDocumentoA4 } = await import('@/utils/pdf-generator');
      
      // Fetch data on demand to avoid bloat
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('id', user?.id).single();
      const { data: empresa } = await supabase.from('empresas').select('nombre_comercial').eq('id', perfil?.empresa_id).single();
      const { getTasaBcvAction } = await import('@/actions/config-actions');
      const rateData = await getTasaBcvAction();
      
      if (venta.id_pos === 'DOC_FORMAL') {
        const cliente = venta.cliente_nombre ? { nombre_comercial: venta.cliente_nombre } : null;
        generarDocumentoA4(venta, empresa, venta.detalles, cliente);
      } else {
        generarTicketPOS(venta, empresa, venta.detalles, venta.pagos, rateData.tasa || 1);
      }
    } catch (err) {
      console.error(err);
      alert("Error al imprimir el recibo.");
    }
  };

  const isCortesiaVenta = (v: HistorialVentaPOS) => {
    const hasCortesiaPago = v.pagos?.some(p => p.tipo_pago?.toLowerCase().includes('cortes'));
    const isZeroTotalWithItems = Number(v.total) === 0 && (Number(v.descuento) > 0 || (v.detalles && v.detalles.length > 0));
    const isDocCortesia = v.tipo_documento?.toLowerCase().includes('cortes') || v.numero_orden?.toLowerCase().includes('cortes');
    return Boolean(hasCortesiaPago || isZeroTotalWithItems || isDocCortesia);
  };

  const metodosDisponibles = useMemo(() => {
    const rawMethods: string[] = [];
    ventas.forEach(v => {
      v.pagos?.forEach(p => {
        if (p.tipo_pago) rawMethods.push(p.tipo_pago);
      });
    });
    return unifyPaymentMethods(rawMethods);
  }, [ventas]);

  const filtradas = useMemo(() => {
    return ventas.filter(v => {
      // 1. Filtro de búsqueda por texto
      if (busqueda.trim()) {
        const b = busqueda.toLowerCase().trim();
        const docFormatted = formatDocNumber(v.numero_documento).toLowerCase();
        const docRaw = (v.numero_documento || '').toLowerCase();
        const cliente = (v.cliente_nombre || '').toLowerCase();
        const orden = (v.numero_orden || '').toLowerCase();
        
        const matches = docFormatted.includes(b) || 
                        docRaw.includes(b) || 
                        cliente.includes(b) || 
                        orden.includes(b);
        if (!matches) return false;
      }

      // 2. Filtro de método de pago
      if (filtroMetodo === 'CORTESIA') {
        if (!isCortesiaVenta(v)) return false;
      } else if (filtroMetodo === 'CREDITO') {
        const hasCredito = v.pagos?.some(p => normalizePaymentKey(p.tipo_pago).includes('credit'));
        if (v.esta_pagado && !hasCredito) return false;
      } else if (filtroMetodo !== 'TODOS') {
        const targetKey = normalizePaymentKey(filtroMetodo);
        const hasPago = v.pagos?.some(p => normalizePaymentKey(p.tipo_pago) === targetKey);
        if (!hasPago) return false;
      }

      return true;
    });
  }, [ventas, busqueda, filtroMetodo]);

  const { totalMontoFiltrado, totalValorRegalado, totalCortesias } = useMemo(() => {
    let sumPercibido = 0;
    let sumRegalado = 0;
    let cortesiasCount = 0;

    ventas.forEach(v => {
      if (isCortesiaVenta(v)) cortesiasCount++;
    });

    filtradas.forEach(v => {
      if (v.estado_activo !== false) {
        if (isCortesiaVenta(v)) {
          sumRegalado += Number(v.total || 0);
        } else {
          sumPercibido += Number(v.total || 0);
        }
      }
    });

    return { 
      totalMontoFiltrado: filtroMetodo === 'CORTESIA' ? sumRegalado : sumPercibido, 
      totalValorRegalado: sumRegalado,
      totalCortesias: cortesiasCount 
    };
  }, [ventas, filtradas, filtroMetodo]);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 md:p-6 animate-in fade-in space-y-6">
      
            <div className={`relative z-30 transition-all ${isCalendarOpen ? 'min-h-[440px]' : ''}`}>
        <div className="flex justify-between items-center bg-black/40 border border-neutral-800 rounded-2xl p-4 md:p-6 mb-4">
          <div>
            <h3 className="text-white font-bold">Estado de Verificación</h3>
            <p className="text-xs text-neutral-400">Las ventas verdes han sido verificadas en el Cierre de Caja.</p>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-xl transition-colors text-sm font-medium border border-neutral-700"
            >
              <Calendar size={16} className="text-indigo-400" />
              {fechaFiltro ? format(parseISO(fechaFiltro), 'dd MMM yyyy', { locale: es }) : 'Seleccionar Fecha'}
              <ChevronDown size={14} className={`transition-transform ${isCalendarOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCalendarOpen && (
              <div className="absolute top-full mt-2 right-0 bg-neutral-900 border border-neutral-800 p-5 rounded-2xl shadow-2xl z-50 w-[330px] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCalMonth(subMonths(calMonth, 1))} className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors">
                <ChevronLeft size={16} />
              </button>
              <div className="text-center">
                <p className="text-sm font-bold text-white capitalize">{format(calMonth, 'MMMM yyyy', { locale: es })}</p>
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

                let bgClass = 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400';
                if (status === 'verified') bgClass = 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30';
                else if (status === 'partial') bgClass = 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30';

                return (
                  <button
                    key={key}
                    onClick={() => {
                      setFechaFiltro(isSelected ? '' : key);
                      setPage(1);
                      setIsCalendarOpen(false);
                    }}
                    className={`relative text-center text-xs font-medium py-1.5 rounded-lg transition-all ${bgClass} ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-neutral-900' : ''} ${isToday ? 'font-bold' : ''}`}
                  >
                    {format(day, 'd')}
                    {isToday && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-4 pt-4 border-t border-neutral-800 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-[10px] text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> OK</span>
              <span className="flex items-center gap-1 text-[10px] text-amber-400"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> Parcial</span>
              <span className="flex items-center gap-1 text-[10px] text-neutral-500"><span className="w-1.5 h-1.5 rounded-full bg-neutral-700 inline-block" /> Vacío</span>
            </div>

            {fechaFiltro && (
              <div className="mt-3 pt-2 border-t border-neutral-800/60 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setFechaFiltro('');
                    setPage(1);
                    setIsCalendarOpen(false);
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors"
                >
                  ✕ Quitar filtro de fecha (Ver todas)
                </button>
              </div>
            )}
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-neutral-950/80 border border-neutral-800 p-3.5 rounded-xl">
        {/* Buscador */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por # documento, cliente o mesa..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {busqueda && (
            <button 
              onClick={() => setBusqueda('')} 
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs p-1 rounded-md"
              title="Borrar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        {/* Selector de Método de Pago */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative min-w-[190px] flex-1 sm:flex-initial">
            <select
              value={filtroMetodo}
              onChange={(e) => setFiltroMetodo(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer appearance-none"
            >
              <option value="TODOS">💳 Todos los métodos</option>
              <option value="CORTESIA">⭐ Solo Cortesías</option>
              <option value="CREDITO">⏳ Crédito / Por pagar</option>
              <optgroup label="Métodos de Pago">
                {metodosDisponibles.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </optgroup>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          </div>

          {/* Botón Acceso Rápido Solo Cortesías */}
          <button
            type="button"
            onClick={() => setFiltroMetodo(prev => prev === 'CORTESIA' ? 'TODOS' : 'CORTESIA')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap border ${
              filtroMetodo === 'CORTESIA'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/10'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800 hover:text-white'
            }`}
            title="Ver rápidamente todas las ventas por cortesía"
          >
            <span>⭐</span>
            <span>Cortesías</span>
            {totalCortesias > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 text-[10px] bg-amber-500/30 text-amber-200 rounded-full font-bold">
                {totalCortesias}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Resumen de Resultados Filtrados */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 bg-black/30 border border-neutral-800/80 rounded-lg text-xs">
        <div className="flex items-center gap-3 text-neutral-400 flex-wrap">
          <span>
            Mostrando <strong className="text-white">{filtradas.length}</strong> {filtradas.length === 1 ? 'venta' : 'ventas'}
          </span>
          {filtroMetodo === 'CORTESIA' && (
            <span className="flex items-center gap-1 text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              ⭐ Filtro: Solo Cortesías
            </span>
          )}
          {filtroMetodo !== 'TODOS' && filtroMetodo !== 'CORTESIA' && (
            <span className="flex items-center gap-1 text-indigo-400 font-medium bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              Filtro: {filtroMetodo}
            </span>
          )}
          {fechaFiltro && (
            <span className="flex items-center gap-1 text-neutral-300 bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
              📅 {format(parseISO(fechaFiltro), 'dd MMM yyyy', { locale: es })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <div className="text-right flex items-center gap-2">
            <div>
              <span className="text-neutral-400 mr-1.5">
                {filtroMetodo === 'CORTESIA' ? 'Valor Regalado:' : 'Total Percibido:'}
              </span>
              <span className={`font-bold text-sm ${filtroMetodo === 'CORTESIA' ? 'text-amber-400' : 'text-emerald-400'}`}>
                {formatCurrency(totalMontoFiltrado)}
              </span>
            </div>
            {filtroMetodo !== 'CORTESIA' && totalValorRegalado > 0 && (
              <span className="text-[11px] text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20" title="Valor en productos entregados por cortesía (excluidos del ingreso percibido)">
                🎁 {formatCurrency(totalValorRegalado)} en cortesías
              </span>
            )}
          </div>
          {(busqueda || filtroMetodo !== 'TODOS' || fechaFiltro) && (
            <button
              onClick={() => {
                setBusqueda('');
                setFiltroMetodo('TODOS');
                setFechaFiltro('');
              }}
              className="text-[11px] text-neutral-400 hover:text-white underline ml-2 transition-colors cursor-pointer"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12 text-indigo-400 animate-pulse">Cargando historial...</div>
      ) : filtradas.length === 0 ? (
        <div className="text-center p-12 text-neutral-500 border border-neutral-800 border-dashed rounded-xl">
          No hay ventas registradas {fechaFiltro ? 'en esta fecha' : 'con los filtros seleccionados'}.
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(venta => (
            <div key={venta.id_factura} className={`bg-black/20 border ${venta.estado_activo === false ? 'border-red-900/50 opacity-75' : 'border-neutral-800'} rounded-lg overflow-hidden transition-all hover:border-neutral-700`}>
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
                    <div className="flex items-center gap-2">
                      <p className={`font-bold ${venta.estado_activo === false ? 'text-red-400 line-through' : 'text-white'}`}>{formatDocNumber(venta.numero_documento)}</p>
                      {venta.estado_activo === false && <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Anulada</span>}
                      {isCortesiaVenta(venta) && (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1 shadow-sm">
                          <span>⭐</span> Cortesía
                        </span>
                      )}
                    </div>
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
                    {isCortesiaVenta(venta) ? (
                      <div>
                        <p className="text-sm font-bold text-amber-400">$0.00</p>
                        <p className="text-[10px] text-amber-400/80 font-medium">Cortesía ({formatCurrency(venta.total)})</p>
                      </div>
                    ) : (
                      <p className={`text-sm font-bold ${venta.estado_activo === false ? 'text-red-400' : 'text-emerald-400'}`}>
                        {formatCurrency(venta.total)}
                      </p>
                    )}
                    <div className="flex items-center justify-end gap-1 flex-wrap mt-0.5">
                      {isCortesiaVenta(venta) ? (
                        <span className="text-[11px] text-amber-400/90 font-medium">⭐ Cortesía</span>
                      ) : venta.pagos?.length > 0 ? (
                        venta.pagos.map((p, idx) => (
                          <span key={idx} className="text-[10px] text-neutral-300 bg-neutral-800/80 px-1.5 py-0.5 rounded border border-neutral-700/50">
                            {getCanonicalPaymentMethodName(p.tipo_pago)}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-neutral-500">
                          {venta.esta_pagado ? 'No registrado' : 'A Crédito / Por pagar'}
                        </span>
                      )}
                    </div>
                  </div>
                  {expandedId === venta.id_factura.toString() ? <ChevronUp size={20} className="text-neutral-500" /> : <ChevronDown size={20} className="text-neutral-500" />}
                </div>
              </div>

              {/* Detalle Expandido */}
              {expandedId === venta.id_factura.toString() && (
                <div className="bg-neutral-900/50 p-4 border-t border-neutral-800">
                  <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                    <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Detalle de la Orden</h4>
                    <div className="flex gap-2">
                       <button onClick={(e) => handleReimprimir(e, venta)} className="text-xs flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors font-semibold">
                          <Printer size={14} /> Reimprimir
                       </button>
                       {venta.estado_activo !== false && (
                         <button onClick={(e) => handleAnular(e, venta.id_factura.toString())} className="text-xs flex items-center gap-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors font-semibold">
                            <Ban size={14} /> Anular / Reembolso
                         </button>
                       )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {venta.detalles.map(d => (
                      <div key={d.id_detalle} className="flex justify-between items-center text-sm py-1.5 border-b border-neutral-800/50 last:border-0">
                        <div className="flex items-center gap-2 text-neutral-300">
                          <span className="bg-neutral-800 text-indigo-400 text-xs px-2 py-0.5 rounded-full font-medium">{d.cantidad}x</span>
                          <span>{d.producto_nombre || 'Item Desconocido'}</span>
                        </div>
                        <span className="text-neutral-400 font-medium">{formatCurrency(d.total)}</span>
                      </div>
                    ))}
                  </div>

                  {((venta.pagos && venta.pagos.length > 0) || isCortesiaVenta(venta)) && (
                    <div className="mt-4 pt-3 border-t border-neutral-800/50">
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Métodos de Pago</h4>
                      <div className="flex gap-2 flex-wrap">
                        {isCortesiaVenta(venta) && (!venta.pagos || venta.pagos.length === 0 || !venta.pagos.some(p => p.tipo_pago?.toLowerCase().includes('cortes'))) && (
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs px-2.5 py-1 rounded-md font-medium flex items-center gap-1">
                            ⭐ Cortesía (100% Bonificado / $0.00)
                          </span>
                        )}
                        {venta.pagos?.map((p, idx) => (
                          <span 
                            key={idx} 
                            className={`text-xs px-2.5 py-1 rounded-md font-medium flex items-center gap-1 border ${
                              p.tipo_pago?.toLowerCase().includes('cortes')
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            <DollarSign size={12} />
                            {getCanonicalPaymentMethodName(p.tipo_pago)}: {formatCurrency(p.monto)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          
          <div className="flex justify-between items-center pt-4 border-t border-neutral-800">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-4 py-2 bg-neutral-800 text-white rounded-lg disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-neutral-400">Página {page}</span>
            <button 
              onClick={() => setPage(p => p + 1)}
              disabled={ventas.length < page * 100 || loading}
              className="px-4 py-2 bg-neutral-800 text-white rounded-lg disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
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
