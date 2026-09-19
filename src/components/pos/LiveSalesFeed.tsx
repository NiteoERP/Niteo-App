'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { VentaPOS } from '@/actions/pos-actions';
import { Eye, EyeOff, Receipt, Clock, CheckCircle2, ChevronDown, ChevronUp, Users, CreditCard, Search } from 'lucide-react';

interface LiveSalesFeedProps {
  initialSales: VentaPOS[];
  sedeId: string;
}

export default function LiveSalesFeed({ initialSales, sedeId }: LiveSalesFeedProps) {
  const [sales, setSales] = useState<VentaPOS[]>(initialSales);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroMetodo, setFiltroMetodo] = useState('TODOS');
  
  const supabase = createClient();

  useEffect(() => {
    const savedPrivacy = localStorage.getItem('niteo_privacy_mode');
    if (savedPrivacy === 'true') setPrivacyMode(true);
  }, []);

  const togglePrivacy = () => {
    const newVal = !privacyMode;
    setPrivacyMode(newVal);
    localStorage.setItem('niteo_privacy_mode', newVal.toString());
  };

  const isCortesiaVenta = (v: VentaPOS) => {
    const hasCortesiaPago = v.pagos?.some(p => p.tipo_pago?.toLowerCase().includes('cortes'));
    const isZeroTotalWithItems = Number(v.total) === 0 && (Number(v.descuento) > 0 || (v.detalles && v.detalles.length > 0));
    const isDocCortesia = v.tipo_documento?.toLowerCase().includes('cortes') || v.numero_orden?.toLowerCase().includes('cortes');
    return Boolean(hasCortesiaPago || isZeroTotalWithItems || isDocCortesia);
  };

  const metodosDisponibles = useMemo(() => {
    const set = new Set<string>();
    sales.forEach(s => {
      s.pagos?.forEach(p => {
        if (p.tipo_pago && !p.tipo_pago.toLowerCase().includes('cortes')) {
          set.add(p.tipo_pago);
        }
      });
    });
    ['Efectivo USD', 'Pago Móvil', 'Zelle', 'Punto de Venta', 'Efectivo BS'].forEach(m => set.add(m));
    return Array.from(set).sort();
  }, [sales]);

  const filtradas = useMemo(() => {
    return sales.filter(v => {
      if (busqueda.trim()) {
        const b = busqueda.toLowerCase().trim();
        const docFormatted = formatDocNumber(v.numero_documento).toLowerCase();
        const docRaw = (v.numero_documento || '').toLowerCase();
        const cliente = (v.cliente_nombre || '').toLowerCase();
        const orden = (v.numero_orden || '').toLowerCase();
        const matches = docFormatted.includes(b) || docRaw.includes(b) || cliente.includes(b) || orden.includes(b);
        if (!matches) return false;
      }

      if (filtroMetodo === 'CORTESIA') {
        if (!isCortesiaVenta(v)) return false;
      } else if (filtroMetodo === 'CREDITO') {
        const hasCredito = v.pagos?.some(p => p.tipo_pago?.toLowerCase().includes('credito'));
        if (v.esta_pagado && !hasCredito) return false;
      } else if (filtroMetodo !== 'TODOS') {
        const hasPago = v.pagos?.some(p => p.tipo_pago?.toLowerCase() === filtroMetodo.toLowerCase());
        if (!hasPago) return false;
      }

      return true;
    });
  }, [sales, busqueda, filtroMetodo]);

  const { totalMontoFiltrado, totalCortesias } = useMemo(() => {
    let sum = 0;
    let cortesiasCount = 0;
    sales.forEach(s => {
      if (isCortesiaVenta(s)) cortesiasCount++;
    });
    filtradas.forEach(s => {
      sum += Number(s.total || 0);
    });
    return { totalMontoFiltrado: sum, totalCortesias: cortesiasCount };
  }, [sales, filtradas]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-ventas')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ventas_facturas', filter: `sede_id=eq.${sedeId}` },
        async (payload) => {
          const newVentaRaw = payload.new;
          
          // Fetch detalles, cliente y pagos para la nueva venta
          const [detallesRes, clienteRes, pagosRes] = await Promise.all([
            supabase
              .from('ventas_detalles')
              .select('id_detalle:id, producto_id, cantidad, precio_unitario, total, productos(nombre, codigo_barras)')
              .eq('factura_id', newVentaRaw.id),
            newVentaRaw.cliente_id
              ? supabase.from('clientes').select('nombre').eq('id', newVentaRaw.cliente_id).single()
              : Promise.resolve({ data: null }),
            supabase.from('ventas_pagos').select('tipo_pago, monto').eq('factura_id', newVentaRaw.id),
          ]);

          const mappedDetalles = (detallesRes.data || []).map((d: any) => ({
            id_detalle: d.id_detalle,
            producto_id: d.producto_id,
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
            numero_orden: newVentaRaw.numero_orden,
            fecha_venta: newVentaRaw.fecha_venta,
            total: newVentaRaw.total,
            descuento: newVentaRaw.descuento,
            tipo_documento: newVentaRaw.tipo_documento,
            esta_pagado: newVentaRaw.esta_pagado,
            cliente_nombre: (clienteRes as any).data?.nombre,
            pagos: (pagosRes.data || []).map(p => ({ tipo_pago: p.tipo_pago, monto: p.monto })),
            detalles: mappedDetalles,
          };

          setSales((current) => [newVenta, ...current]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sedeId, supabase]);


  const toggleRow = (id: string) => {
    if (expandedRow === id) setExpandedRow(null);
    else setExpandedRow(id);
  };

  const formatCurrency = (amount: number) => {
    if (privacyMode) return '****';
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ' USD';
  };

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    const dateOpts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', timeZone: 'UTC' };
    const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' };
    return `${d.toLocaleDateString('es-ES', dateOpts)} - ${d.toLocaleTimeString('en-US', timeOpts)}`;
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

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={togglePrivacy}
            className={`flex flex-1 sm:flex-none justify-center items-center gap-2 px-6 h-14 rounded-xl text-sm font-medium transition-colors ${privacyMode ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
          >
            {privacyMode ? <EyeOff size={18} /> : <Eye size={18} />}
            <span>{privacyMode ? 'Modo Oculto' : 'Ocultar Valores'}</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-neutral-900 border border-neutral-800 p-3.5 rounded-xl">
        {/* Buscador */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por # documento, cliente o mesa..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
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
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer appearance-none"
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
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700 hover:text-white'
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
            Mostrando <strong className="text-white">{filtradas.length}</strong> de {sales.length} en vivo
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
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <div className="text-right">
            <span className="text-neutral-400 mr-1.5">Total Filtrado:</span>
            <span className="text-emerald-400 font-bold text-sm">{formatCurrency(totalMontoFiltrado)}</span>
          </div>
          {(busqueda || filtroMetodo !== 'TODOS') && (
            <button
              onClick={() => {
                setBusqueda('');
                setFiltroMetodo('TODOS');
              }}
              className="text-[11px] text-neutral-400 hover:text-white underline ml-2 transition-colors cursor-pointer"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Ventas en Vivo */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        {filtradas.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            <Receipt className="mx-auto h-12 w-12 opacity-20 mb-4" />
            <p>No hay ventas coincidentes {sales.length > 0 ? 'con los filtros seleccionados' : 'hoy'}.</p>
            <p className="text-xs mt-1">Las transacciones del POS aparecerán aquí automáticamente.</p>
          </div>
        ) : (
          <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-visible snap-x snap-mandatory gap-4 md:gap-0 p-4 md:p-0 md:divide-y md:divide-neutral-800 custom-scrollbar">
            {filtradas.map((sale) => {
              const isExpanded = expandedRow === sale.id_factura;
              return (
              <div key={sale.id_factura} className="min-w-[280px] md:min-w-0 shrink-0 snap-center group flex flex-col bg-neutral-950 md:bg-transparent border border-neutral-800 md:border-none rounded-xl md:rounded-none md:hover:bg-neutral-800/30 transition-colors duration-200">
                
                {/* Header (Resumen) */}
                <div 
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 cursor-pointer gap-4 md:gap-0"
                  onClick={() => setExpandedRow(isExpanded ? null : sale.id_factura)}
                >
                  {/* Izquierda: Info Cliente y Hora */}
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400 shrink-0">
                      <Receipt size={18} />
                    </div>
                    <div>
                      <div className="text-neutral-200 font-medium flex items-center gap-2 text-base flex-wrap">
                        <span className="font-bold text-white uppercase">{sale.numero_orden || (sale.tipo_documento === 'Sales' || sale.tipo_documento === 'VENTA' ? 'Venta de Caja' : sale.tipo_documento)}</span>
                        {sale.esta_pagado && <CheckCircle2 size={14} className="text-emerald-500" />}
                        {isCortesiaVenta(sale) && (
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1 shadow-sm">
                            <span>⭐</span> Cortesía
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-500 text-sm flex items-center gap-1 mt-0.5">
                        <Clock size={12} /> {formatDateTime(sale.fecha_venta)}
                        <span className="mx-1">•</span>
                        {formatDocNumber(sale.numero_documento)}
                      </p>
                      {/* FIX 5: Cliente y Método de Pago */}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        {sale.cliente_nombre && (
                          <span className="text-xs text-neutral-400 flex items-center gap-1">
                            <Users size={11} className="text-indigo-400" />
                            {privacyMode ? '****' : sale.cliente_nombre}
                          </span>
                        )}
                        {sale.pagos && sale.pagos.length > 0 ? (
                          sale.pagos.map((p, idx) => (
                            <span key={idx} className="text-[11px] font-medium text-emerald-400 flex items-center gap-1 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              <CreditCard size={11} />
                              {p.tipo_pago}: {formatCurrency(p.monto)}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] font-medium text-neutral-500 flex items-center gap-1 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                            <CreditCard size={11} />
                            {sale.esta_pagado ? 'No registrado' : 'A Crédito'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Derecha: Total y Flecha */}
                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-neutral-800 pt-3 md:pt-0 mt-3 md:mt-0">
                    <div className="text-right">
                      <p className="text-neutral-200 font-bold text-lg">{formatCurrency(sale.total)}</p>
                      {sale.descuento > 0 && (
                        <p className="text-amber-500 text-xs">- {formatCurrency(sale.descuento)} desc.</p>
                      )}
                    </div>
                    <div className="text-neutral-600 group-hover:text-neutral-400 transition-colors">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* Body (Detalles Expandidos) */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 bg-neutral-900/50 md:bg-neutral-950/50 border-t border-neutral-800/50">
                    <div className="md:pl-14">
                      <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">Items del Ticket</h4>
                      <div className="space-y-2">
                        {sale.detalles.map((d: any) => (
                          <div key={d.id_detalle} className="flex justify-between items-center bg-black/20 p-2 rounded text-sm">
                            <span className="text-neutral-300">
                              <span className="text-neutral-500 mr-2">{d.cantidad}x</span> 
                              {privacyMode ? 'Producto Oculto' : (d.producto_nombre || 'Producto S/N')}
                            </span>
                            <span className="text-neutral-400 font-medium">{formatCurrency(d.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )})}
          </div>
        )}
      </div>

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
