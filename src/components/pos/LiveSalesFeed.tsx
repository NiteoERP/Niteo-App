'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useEmpresa } from '@/components/providers/EmpresaProvider';
import { VentaPOS, getVentasRecientes } from '@/actions/pos-actions';
import EditarVentaModal from './EditarVentaModal';
import { Eye, EyeOff, Receipt, Clock, CheckCircle2, ChevronDown, ChevronUp, Users, CreditCard, Search, Contact, ConciergeBell, FileText, Edit3 } from 'lucide-react';
import { normalizePaymentKey, getCanonicalPaymentMethodName, unifyPaymentMethods } from '@/utils/payment-methods';

interface LiveSalesFeedProps {
  initialSales: VentaPOS[];
  sedeId: string;
}

export default function LiveSalesFeed({ initialSales, sedeId }: LiveSalesFeedProps) {
  const { timeZone, empresa, userRole, permisos } = useEmpresa();
  const activeTz = timeZone || empresa?.zona_horaria || 'America/Caracas';

  const canEditOrder = useMemo(() => {
    const rolNorm = (userRole || '').toUpperCase();
    const esRolValido = ['MASTER', 'PROPIETARIO', 'DUENO', 'GERENTE', 'ADMIN', 'SUPERADMIN'].includes(rolNorm);
    const permisosActivos = Array.isArray(permisos) ? permisos : [];
    const tieneModuloHabilitado = permisosActivos.includes('modificar_ventas') || 
                                  permisosActivos.includes('modificacion_ventas') || 
                                  permisosActivos.includes('modificar_pedidos');
    return esRolValido || tieneModuloHabilitado;
  }, [userRole, permisos]);

  const [sales, setSales] = useState<VentaPOS[]>(initialSales);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroMetodo, setFiltroMetodo] = useState('TODOS');
  const [modificarVenta, setModificarVenta] = useState<VentaPOS | null>(null);
  
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
    const hasCortesiaPago = v.pagos?.some((p: any) => p.tipo_pago?.toLowerCase().includes('cortes'));
    const isZeroTotalWithItems = Number(v.total) === 0 && (Number(v.descuento) > 0 || (v.detalles && v.detalles.length > 0));
    const isDocCortesia = v.tipo_documento?.toLowerCase().includes('cortes') || v.numero_orden?.toLowerCase().includes('cortes');
    return Boolean(hasCortesiaPago || isZeroTotalWithItems || isDocCortesia);
  };

  const metodosDisponibles = useMemo(() => {
    const rawMethods: string[] = [];
    sales.forEach(s => {
      s.pagos?.forEach((p: any) => {
        if (p.tipo_pago) rawMethods.push(p.tipo_pago);
      });
    });
    return unifyPaymentMethods(rawMethods);
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
      } else if (filtroMetodo === 'PROPINA') {
        if (Number(v.propina || 0) <= 0) return false;
      } else if (filtroMetodo === 'CREDITO') {
        const hasCredito = v.pagos?.some((p: any) => normalizePaymentKey(p.tipo_pago).includes('credit') || normalizePaymentKey(p.tipo_pago).includes('fiado'));
        if (!hasCredito) return false;
      } else if (filtroMetodo === 'SIN_ESPECIFICAR') {
        if (v.pagos && v.pagos.length > 0) return false;
      } else if (filtroMetodo !== 'TODOS') {
        const targetKey = normalizePaymentKey(filtroMetodo);
        const hasPago = v.pagos?.some((p: any) => normalizePaymentKey(p.tipo_pago) === targetKey);
        if (!hasPago) return false;
      }

      return true;
    });
  }, [sales, busqueda, filtroMetodo]);

  const { totalMontoFiltrado, totalValorRegalado, totalCortesias, totalPropinasFiltrado, totalPropinasCount } = useMemo(() => {
    let sumPercibido = 0;
    let sumRegalado = 0;
    let cortesiasCount = 0;
    let sumPropinas = 0;
    let propinasCount = 0;

    sales.forEach(s => {
      if (isCortesiaVenta(s)) cortesiasCount++;
      if (Number(s.propina || 0) > 0) propinasCount++;
    });

    filtradas.forEach(s => {
      if (Number(s.propina || 0) > 0) sumPropinas += Number(s.propina || 0);
      if (isCortesiaVenta(s)) {
        sumRegalado += Number(s.total || 0);
      } else {
        sumPercibido += Number(s.total || 0);
      }
    });

    return { 
      totalMontoFiltrado: filtroMetodo === 'CORTESIA' ? sumRegalado : sumPercibido, 
      totalValorRegalado: sumRegalado,
      totalCortesias: cortesiasCount,
      totalPropinasFiltrado: sumPropinas,
      totalPropinasCount: propinasCount
    };
  }, [sales, filtradas, filtroMetodo]);

  useEffect(() => {
    setSales(initialSales);
  }, [initialSales]);

  useEffect(() => {
    const filterConfig: any = { event: 'INSERT', schema: 'public', table: 'ventas_facturas' };
    if (sedeId && sedeId !== 'ALL') {
      filterConfig.filter = `sede_id=eq.${sedeId}`;
    }

    const channel = supabase
      .channel(`realtime-ventas-${sedeId || 'all'}`)
      .on(
        'postgres_changes',
        filterConfig,
        async (payload: any) => {
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
            pagos: (pagosRes.data || []).map((p: any) => ({ tipo_pago: p.tipo_pago, monto: p.monto })),
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
    if (!isoString) return '-';
    const d = new Date(isoString);
    const dateOpts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', timeZone: activeTz };
    const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: activeTz };
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

        {/* Selector de Método de Pago y Cortesías */}
        <div className="flex flex-col xs:flex-row sm:flex-row items-stretch xs:items-center gap-2">
          <div className="relative flex-1 sm:min-w-[210px] sm:flex-initial min-w-0">
            <select
              value={filtroMetodo}
              onChange={(e) => setFiltroMetodo(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-3 pr-8 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer appearance-none"
            >
              <option value="TODOS">💳 Todos los métodos</option>
              <option value="PROPINA">🪙 Solo con Propina</option>
              <option value="CORTESIA">⭐ Solo Cortesías</option>
              <option value="CREDITO">⏳ Solo Créditos</option>
              <option value="SIN_ESPECIFICAR">❓ Sin especificar</option>
              <optgroup label="Métodos de Pago">
                {metodosDisponibles.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </optgroup>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          </div>

          {/* Botón Acceso Rápido Solo Propinas */}
          <button
            type="button"
            onClick={() => setFiltroMetodo(prev => prev === 'PROPINA' ? 'TODOS' : 'PROPINA')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap border shrink-0 ${
              filtroMetodo === 'PROPINA'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/10'
                : 'bg-neutral-950 sm:bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800 hover:text-white'
            }`}
            title="Ver rápidamente todas las ventas con propina"
          >
            <span>🪙</span>
            <span>Propinas</span>
            {totalPropinasCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] bg-amber-500/30 text-amber-200 rounded-full font-bold">
                {totalPropinasCount}
              </span>
            )}
          </button>

          {/* Botón Acceso Rápido Solo Cortesías */}
          <button
            type="button"
            onClick={() => setFiltroMetodo(prev => prev === 'CORTESIA' ? 'TODOS' : 'CORTESIA')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap border shrink-0 ${
              filtroMetodo === 'CORTESIA'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/10'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700 hover:text-white'
            }`}
            title="Ver rápidamente todas las ventas por cortesía"
          >
            <span>⭐</span>
            <span>Cortesías</span>
            {totalCortesias > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] bg-amber-500/30 text-amber-200 rounded-full font-bold">
                {totalCortesias}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Resumen de Resultados Filtrados */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-4 sm:py-3.5 bg-neutral-900 sm:bg-black/30 border border-neutral-800 rounded-2xl text-xs">
        <div className="flex items-center justify-between sm:justify-start gap-2 text-neutral-400 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm">
              Mostrando <strong className="text-white font-bold">{filtradas.length}</strong> de {sales.length} en vivo
            </span>
            {filtroMetodo === 'PROPINA' && (
              <span className="flex items-center gap-1 text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                🪙 Solo con Propina
              </span>
            )}
            {filtroMetodo === 'CORTESIA' && (
              <span className="flex items-center gap-1 text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                ⭐ Solo Cortesías
              </span>
            )}
            {filtroMetodo !== 'TODOS' && filtroMetodo !== 'CORTESIA' && (
              <span className="flex items-center gap-1 text-indigo-400 font-medium bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                {filtroMetodo}
              </span>
            )}
          </div>
          {(busqueda || filtroMetodo !== 'TODOS') && (
            <button
              onClick={() => {
                setBusqueda('');
                setFiltroMetodo('TODOS');
              }}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium underline transition-colors cursor-pointer sm:hidden"
            >
              Limpiar
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 pt-2.5 sm:pt-0 border-t border-neutral-800 sm:border-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
            <span className="text-[10px] sm:text-xs uppercase sm:normal-case tracking-wider sm:tracking-normal text-neutral-400 font-semibold sm:font-normal">
              {filtroMetodo === 'CORTESIA' ? 'Valor Regalado:' : 'Total Percibido:'}
            </span>
            <span className={`font-extrabold text-base sm:text-base whitespace-nowrap ${filtroMetodo === 'CORTESIA' ? 'text-amber-400' : 'text-emerald-400'}`}>
              {formatCurrency(totalMontoFiltrado)}
            </span>
          </div>

          {totalPropinasFiltrado > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center items-end gap-0.5 sm:gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-amber-500 font-semibold sm:hidden">Propinas</span>
              <span className="text-xs text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/30 font-semibold whitespace-nowrap" title="Total de propinas registradas en este período">
                🪙 Propinas: +{formatCurrency(totalPropinasFiltrado)}
              </span>
            </div>
          )}
          {filtroMetodo !== 'CORTESIA' && totalValorRegalado > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center items-end gap-0.5 sm:gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold sm:hidden">Cortesías</span>
              <span className="text-xs text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/30 font-semibold whitespace-nowrap" title="Valor en productos entregados por cortesía (excluidos del ingreso percibido)">
                🎁 {formatCurrency(totalValorRegalado)}
              </span>
            </div>
          )}

          {(busqueda || filtroMetodo !== 'TODOS') && (
            <button
              onClick={() => {
                setBusqueda('');
                setFiltroMetodo('TODOS');
              }}
              className="hidden sm:inline-block text-xs text-neutral-400 hover:text-white underline ml-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Lista de Ventas en Vivo (Tarjetas separadas) */}
      <div>
        {filtradas.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 bg-neutral-900 border border-neutral-800 rounded-2xl">
            <Receipt className="mx-auto h-12 w-12 opacity-20 mb-4" />
            <p>No hay ventas coincidentes {sales.length > 0 ? 'con los filtros seleccionados' : 'hoy'}.</p>
            <p className="text-xs mt-1">Las transacciones del POS aparecerán aquí automáticamente.</p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-3.5">
            {filtradas.map((sale) => {
              const isExpanded = expandedRow === sale.id_factura;
              const isCortesia = isCortesiaVenta(sale);
              const totalItemsCount = sale.detalles?.reduce((acc: number, item: any) => acc + Number(item.cantidad || 1), 0) || 0;
              const orderLabel = sale.numero_orden || (sale.tipo_documento === 'Sales' || sale.tipo_documento === 'VENTA' ? 'Venta de Caja' : sale.tipo_documento);

              const accentBorderClass = isCortesia
                ? 'border-l-4 border-l-amber-500 border-neutral-700/80'
                : 'border-l-4 border-l-emerald-500 border-neutral-700/80';

              return (
                <div
                  key={sale.id_factura}
                  className={`bg-neutral-900 border ${accentBorderClass} rounded-2xl overflow-hidden shadow-lg shadow-black/40 transition-all hover:border-neutral-600`}
                >
                  {/* Header (Resumen) */}
                  <div
                    className="cursor-pointer select-none"
                    onClick={() => setExpandedRow(isExpanded ? null : sale.id_factura)}
                  >
                    {/* VISTA MÓVIL (< md) */}
                    <div className="flex flex-col md:hidden">
                      <div className="bg-neutral-800/60 border-b border-neutral-800 px-3.5 py-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                              <Receipt size={15} />
                            </div>
                            <span className="font-mono text-sm font-extrabold text-white truncate">
                              {formatDocNumber(sale.numero_documento)}
                            </span>
                            {sale.esta_pagado && <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />}
                            {isCortesia && (
                              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0">
                                ⭐ Cortesía
                              </span>
                            )}
                            {sale.modificaciones && sale.modificaciones.length > 0 && (
                              <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0">
                                ✏️ Modificada
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              {isCortesia ? (
                                <div className="flex items-baseline gap-1">
                                  <span className="text-sm font-extrabold text-amber-400 whitespace-nowrap">$0.00</span>
                                  <span className="text-[10px] text-amber-400/80 font-medium whitespace-nowrap">({formatCurrency(sale.total)})</span>
                                </div>
                              ) : (
                                <div>
                                  <span className="text-sm font-extrabold whitespace-nowrap px-2 py-0.5 rounded-md text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                                    {formatCurrency(sale.total)}
                                  </span>
                                  {Number(sale.propina) > 0 && (
                                    <p className="text-[10px] font-bold text-amber-400 mt-0.5 text-right whitespace-nowrap">
                                      +{formatCurrency(Number(sale.propina))} propina
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="w-7 h-7 rounded-lg bg-neutral-800 border border-neutral-700/70 flex items-center justify-center text-neutral-300 shrink-0">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-neutral-700/40">
                          <div className="flex items-center gap-1.5 text-xs text-neutral-400 whitespace-nowrap shrink-0">
                            <Clock size={12} className="text-indigo-400/80 shrink-0" />
                            <span>{formatDateTime(sale.fecha_venta)}</span>
                          </div>
                          <span className="text-[11px] font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded-md truncate max-w-[150px]">
                            {orderLabel}
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 space-y-2.5 bg-neutral-900">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-0.5">Cliente</p>
                            <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
                              <Users size={14} className="text-indigo-400 shrink-0" />
                              <span className="break-words leading-snug">
                                {privacyMode ? '****' : (sale.cliente_nombre || 'Consumidor Final')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Método de Pago</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {sale.pagos && sale.pagos.length > 0 ? (
                              sale.pagos.map((p, idx) => (
                                <span key={idx} className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/25">
                                  <CreditCard size={11} className="shrink-0" />
                                  {getCanonicalPaymentMethodName(p.tipo_pago)}: {formatCurrency(p.monto)}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] font-medium text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-md border border-neutral-700">
                                Sin especificar
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-neutral-800/50 flex items-center justify-between text-[11px] text-neutral-400">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Receipt size={12} className="text-indigo-400" />
                            {totalItemsCount} {totalItemsCount === 1 ? 'producto' : 'productos'} en la orden
                          </span>
                          <span className="text-indigo-400 font-semibold">
                            {isExpanded ? 'Ocultar detalle ▲' : 'Ver detalle ▼'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* VISTA ESCRITORIO (md+) */}
                    <div className="hidden md:flex items-center justify-between p-4 gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400 shrink-0">
                          <Receipt size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-neutral-200 font-medium flex items-center gap-2 text-base flex-wrap">
                            <span className="font-mono font-bold text-white">{formatDocNumber(sale.numero_documento)}</span>
                            <span className="text-neutral-600">•</span>
                            <span className="font-bold text-indigo-300 uppercase truncate">{orderLabel}</span>
                            {sale.esta_pagado && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                            {isCortesia && (
                              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1 shadow-sm">
                                <span>⭐</span> Cortesía
                              </span>
                            )}
                            {sale.modificaciones && sale.modificaciones.length > 0 && (
                              <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1 shadow-sm">
                                <span>✏️</span> Modificada
                              </span>
                            )}
                          </div>
                          <p className="text-neutral-400 text-xs flex items-center gap-1.5 mt-1">
                            <Clock size={12} className="text-indigo-400/70 shrink-0" /> {formatDateTime(sale.fecha_venta)}
                          </p>
                          <div className="flex flex-wrap gap-x-2.5 gap-y-1 mt-2">
                            {sale.cliente_nombre && (
                              <span className="text-xs text-neutral-200 flex items-center gap-1 bg-neutral-800 px-2 py-0.5 rounded-md border border-neutral-700">
                                <Users size={11} className="text-indigo-400 shrink-0" />
                                <span className="truncate max-w-[200px]">{privacyMode ? '****' : sale.cliente_nombre}</span>
                              </span>
                            )}
                            {sale.pagos && sale.pagos.length > 0 ? (
                              sale.pagos.map((p, idx) => (
                                <span key={idx} className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                  <CreditCard size={11} className="shrink-0" />
                                  {getCanonicalPaymentMethodName(p.tipo_pago)}: {formatCurrency(p.monto)}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] font-medium text-neutral-500 flex items-center gap-1 bg-neutral-900 px-2 py-0.5 rounded-md border border-neutral-800">
                                <CreditCard size={11} className="shrink-0" />
                                Sin especificar
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-4 shrink-0">
                        <div className="text-right">
                          {isCortesia ? (
                            <div>
                              <p className="text-amber-400 font-extrabold text-lg">$0.00</p>
                              <p className="text-amber-400/80 text-[11px] font-medium">Cortesía ({formatCurrency(sale.total)})</p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-emerald-400 font-extrabold text-lg">{formatCurrency(sale.total)}</p>
                              {Number(sale.propina) > 0 && (
                                <p className="text-xs font-bold text-amber-400 mt-0.5 text-right whitespace-nowrap">
                                  +{formatCurrency(Number(sale.propina))} propina
                                </p>
                              )}
                            </div>
                          )}
                          {sale.descuento > 0 && !isCortesia && (
                            <p className="text-amber-500 text-xs">- {formatCurrency(sale.descuento)} desc.</p>
                          )}
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-400">
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Body (Detalles Expandidos) */}
                  {isExpanded && (
                    <div className="p-3.5 sm:p-4 bg-neutral-950/90 border-t border-neutral-800">
                      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Receipt size={14} className="text-indigo-400" />
                          Items del Ticket
                        </h4>
                        {canEditOrder && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setModificarVenta(sale);
                            }}
                            className="text-xs flex items-center gap-1.5 bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 border border-blue-500/30 px-3 py-1.5 rounded-xl transition-colors font-semibold"
                            title="Modificar productos y formas de pago con registro de auditoría"
                          >
                            <Edit3 size={13} className="shrink-0" /> <span>Modificar Pedido</span>
                          </button>
                        )}
                      </div>
                      <div className="bg-neutral-900/90 border border-neutral-800/90 rounded-xl p-3 divide-y divide-neutral-800/70">
                        {sale.detalles.map((d: any) => (
                          <div key={d.id_detalle} className="py-2 first:pt-0 last:pb-0 text-xs sm:text-sm space-y-1">
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex items-start gap-2 text-neutral-200 min-w-0 flex-1">
                                <span className="bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs px-2 py-0.5 rounded-md font-bold shrink-0">
                                  {d.cantidad}x
                                </span>
                                <span className="font-semibold text-white break-words leading-snug pt-0.5">
                                  {privacyMode ? 'Producto Oculto' : (d.producto_nombre || 'Producto S/N')}
                                </span>
                                {d.combo_items && d.combo_items.length > 0 && (
                                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-bold uppercase shrink-0">
                                    Promo
                                  </span>
                                )}
                              </div>
                              <span className="text-emerald-400 font-bold font-mono shrink-0 pt-0.5 whitespace-nowrap">
                                {formatCurrency(d.total)}
                              </span>
                            </div>
                            {d.combo_items && d.combo_items.length > 0 && !privacyMode && (
                              <div className="ml-8 pl-2.5 border-l-2 border-indigo-500/40 text-[11px] text-neutral-400 space-y-0.5 mt-1">
                                {d.combo_items.map((sub: any, sIdx: number) => (
                                  <div key={sIdx}>
                                    ↳ {sub.cantidad > 1 ? `${sub.cantidad}x ` : ''}{sub.nombre}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {Number(sale.propina) > 0 && (
                          <div className="flex justify-between items-center text-xs sm:text-sm pt-2.5 mt-2 border-t border-amber-500/20 bg-amber-500/5 px-3 py-2 rounded-xl">
                            <div className="flex items-center gap-2 text-amber-300">
                              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Propina</span>
                              <span className="font-semibold">{sale.mesero_nombre || 'Mesero'}</span>
                            </div>
                            <span className="text-amber-400 font-bold whitespace-nowrap">+ {formatCurrency(Number(sale.propina))}</span>
                          </div>
                        )}
                      </div>

                      {sale.modificaciones && sale.modificaciones.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-neutral-800 space-y-2">
                          <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                            <FileText size={13} />
                            Registro de Auditoría ({sale.modificaciones.length} {sale.modificaciones.length === 1 ? 'modificación' : 'modificaciones'})
                          </h4>
                          <div className="space-y-2">
                            {sale.modificaciones.map((m, mIdx) => (
                              <div key={m.id_log || mIdx} className="bg-neutral-900/90 border border-amber-500/20 rounded-xl p-3 text-xs space-y-1.5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-neutral-400 gap-1 border-b border-neutral-800/80 pb-1.5">
                                  <span className="font-semibold text-amber-300 flex items-center gap-1">
                                    <span>👤</span> {m.gerente_nombre} <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-mono font-bold uppercase">{m.gerente_rol}</span>
                                  </span>
                                  <span className="font-mono text-[11px] text-neutral-400">
                                    {formatDateTime(m.fecha)}
                                  </span>
                                </div>
                                <p className="text-neutral-200">
                                  <strong className="text-amber-400/90 font-medium">Motivo:</strong> {m.motivo}
                                </p>
                                {m.resumen_cambios && m.resumen_cambios.length > 0 && (
                                  <div className="pt-1 border-t border-neutral-800/60 space-y-0.5">
                                    {m.resumen_cambios.map((c, cIdx) => (
                                      <div key={cIdx} className="flex items-center gap-1.5 text-neutral-300 text-[11px]">
                                        <span className="text-amber-400">•</span>
                                        <span>{c}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modificarVenta && (
        <EditarVentaModal
          venta={modificarVenta}
          isOpen={!!modificarVenta}
          onClose={() => setModificarVenta(null)}
          onSuccess={() => {
            getVentasRecientes(sedeId).then(data => setSales(data));
          }}
        />
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
