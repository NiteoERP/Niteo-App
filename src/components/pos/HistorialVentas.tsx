'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { HistorialVentaPOS, getHistorialVentasCompleto, toggleVentaVerificada, getResumenVerificacionMes, procesarReembolsoPOS } from '@/actions/pos-actions';
import ReembolsoModal from './ReembolsoModal';
import EditarVentaModal from './EditarVentaModal';
import { Search, Calendar, ChevronDown, ChevronUp, Receipt, DollarSign, Clock, Users, CheckCircle2, Circle, Hash, ChevronLeft, ChevronRight, Printer, Ban, Sparkles, Filter, X, Contact, ConciergeBell, RotateCcw, Undo2, Edit3, FileText } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useEmpresa } from '@/components/providers/EmpresaProvider';
import { normalizePaymentKey, getCanonicalPaymentMethodName, unifyPaymentMethods } from '@/utils/payment-methods';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, addMonths, subMonths, isSameDay, parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';

export default function HistorialVentas({
  sedeId,
  initialUserRole,
  initialPermisos,
}: {
  sedeId: string;
  initialUserRole?: string;
  initialPermisos?: string[];
}) {
  const { timeZone, empresa, userRole, permisos } = useEmpresa();
  const activeTz = timeZone || empresa?.zona_horaria || 'America/Caracas';
  const [clientRole, setClientRole] = useState<string | null>(null);
  const [clientPermisos, setClientPermisos] = useState<string[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }: any) => {
      if (!data?.user) return;
      const metaRole = data.user.app_metadata?.user_role;
      const { data: prof } = await supabase
        .from('perfiles')
        .select('rol, permisos')
        .eq('id', data.user.id)
        .maybeSingle();
      if (prof?.rol || metaRole) {
        setClientRole(prof?.rol || metaRole || null);
      }
      if (Array.isArray(prof?.permisos)) {
        setClientPermisos(prof.permisos);
      }
    }).catch(() => {});
  }, []);

  const canEditOrder = useMemo(() => {
    const rolesToCheck = [userRole, initialUserRole, clientRole]
      .filter(Boolean)
      .map(r => (r || '').toUpperCase());
    const validRoles = ['MASTER', 'PROPIETARIO', 'DUENO', 'GERENTE', 'ADMIN', 'SUPERADMIN'];
    const esRolValido = rolesToCheck.some(r => validRoles.includes(r));

    const permisosActivos = [
      ...(Array.isArray(permisos) ? permisos : []),
      ...(Array.isArray(initialPermisos) ? initialPermisos : []),
      ...(Array.isArray(clientPermisos) ? clientPermisos : []),
    ];
    const tieneModuloHabilitado = permisosActivos.includes('modificar_ventas') || 
                                  permisosActivos.includes('modificacion_ventas') || 
                                  permisosActivos.includes('modificar_pedidos');
    return esRolValido || tieneModuloHabilitado;
  }, [userRole, initialUserRole, clientRole, permisos, initialPermisos, clientPermisos]);

  const [ventas, setVentas] = useState<HistorialVentaPOS[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reembolsoVenta, setReembolsoVenta] = useState<HistorialVentaPOS | null>(null);
  const [modificarVenta, setModificarVenta] = useState<HistorialVentaPOS | null>(null);
  const [filtroSoloModificadas, setFiltroSoloModificadas] = useState(false);
  
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
    const data = await getHistorialVentasCompleto(sedeId, fechaFiltro || undefined, page, 100, activeTz, busqueda || undefined);
    setVentas(prev => page === 1 ? data : [...prev, ...data]);
    setLoading(false);
  };

  useEffect(() => {
    cargarVentas();
    
    // Realtime changes for new sales
    const supabase = createClient();
    const filterConfig: any = { event: '*', schema: 'public', table: 'ventas_facturas' };
    if (sedeId && sedeId !== 'ALL') {
      filterConfig.filter = `sede_id=eq.${sedeId}`;
    }

    const channel = supabase.channel(`realtime_ventas_historial_${sedeId || 'all'}`)
      .on('postgres_changes', filterConfig, () => {
        getHistorialVentasCompleto(sedeId, fechaFiltro || undefined, page, 100, activeTz, busqueda || undefined).then(data => setVentas(data));
        getResumenVerificacionMes(sedeId, format(calMonth, 'yyyy-MM'), activeTz).then(setMonthSummary);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sedeId, fechaFiltro, page, activeTz, busqueda]);

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

  const handleRestaurar = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("¿Estás seguro de restaurar esta venta? Volverá a sumar en los informes.")) return;
    
    const { restaurarVentaPOS } = await import('@/actions/pos-actions');
    const res = await restaurarVentaPOS(id);
    if (res.success) {
      setVentas(prev => prev.map(v => v.id_factura.toString() === id ? { ...v, estado_activo: true } : v));
      alert("Venta restaurada correctamente.");
    } else {
      alert("Error al restaurar: " + res.error);
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
      
      if (venta.id_pos === 'DOC_FORMAL' || venta.id_pos?.startsWith('DOC_FORMAL')) {
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
      } else if (filtroMetodo === 'PROPINA') {
        if (Number(v.propina || 0) <= 0) return false;
      } else if (filtroMetodo === 'CREDITO') {
        const hasCredito = v.pagos?.some(p => normalizePaymentKey(p.tipo_pago).includes('credit') || normalizePaymentKey(p.tipo_pago).includes('fiado'));
        if (!hasCredito) return false;
      } else if (filtroMetodo === 'SIN_ESPECIFICAR') {
        if (v.pagos && v.pagos.length > 0) return false;
      } else if (filtroMetodo !== 'TODOS') {
        const targetKey = normalizePaymentKey(filtroMetodo);
        const hasPago = v.pagos?.some(p => normalizePaymentKey(p.tipo_pago) === targetKey);
        if (!hasPago) return false;
      }

      // 3. Filtro de sólo modificadas por gerencia
      if (filtroSoloModificadas) {
        if (!v.modificaciones || v.modificaciones.length === 0) return false;
      }

      return true;
    });
  }, [ventas, busqueda, filtroMetodo, filtroSoloModificadas]);

  const totalModificadasCount = useMemo(() => {
    return ventas.filter(v => v.modificaciones && v.modificaciones.length > 0).length;
  }, [ventas]);

  const { totalMontoFiltrado, totalValorRegalado, totalCortesias, totalPropinasFiltrado, totalPropinasCount } = useMemo(() => {
    let sumPercibido = 0;
    let sumRegalado = 0;
    let cortesiasCount = 0;
    let sumPropinas = 0;
    let propinasCount = 0;

    ventas.forEach(v => {
      if (isCortesiaVenta(v)) cortesiasCount++;
      if (Number(v.propina || 0) > 0) propinasCount++;
    });

    filtradas.forEach(v => {
      if (v.estado_activo !== false) {
        sumPropinas += Number(v.propina || 0);
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
      totalCortesias: cortesiasCount,
      totalPropinasFiltrado: sumPropinas,
      totalPropinasCount: propinasCount
    };
  }, [ventas, filtradas, filtroMetodo]);

  
  return (
    <div className="bg-transparent sm:bg-neutral-900 sm:border sm:border-neutral-800 rounded-xl p-0 sm:p-4 md:p-6 animate-in fade-in space-y-4 sm:space-y-6">
      {reembolsoVenta && (
        <ReembolsoModal 
          venta={reembolsoVenta}
          metodosDisponibles={metodosDisponibles.length > 0 ? metodosDisponibles : ['Punto de Venta', 'Efectivo USD', 'Zelle', 'Pago Móvil']}
          onClose={() => setReembolsoVenta(null)}
          onConfirm={async (detalles, metodo) => {
            const res = await procesarReembolsoPOS(reembolsoVenta.id_factura.toString(), detalles, metodo);
            if (res.success) {
              alert('Reembolso procesado exitosamente.');
              setReembolsoVenta(null);
              cargarVentas();
            } else {
              alert(res.error);
            }
          }}
        />
      )}
      
      <div className={`relative z-30 transition-all ${isCalendarOpen ? 'min-h-[420px] sm:min-h-[440px]' : ''}`}>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-neutral-900 sm:bg-black/40 border border-neutral-800 rounded-2xl p-3.5 sm:p-5">
          <div>
            <h3 className="text-white font-bold text-sm sm:text-base">Estado de Verificación</h3>
            <p className="text-xs text-neutral-400 mt-0.5">Las ventas verdes han sido verificadas en el Cierre de Caja.</p>
          </div>
          
          <div className="relative w-full sm:w-auto">
            <button 
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="w-full sm:w-auto flex items-center justify-between sm:justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2.5 sm:py-2 rounded-xl transition-colors text-xs sm:text-sm font-medium border border-neutral-700"
            >
              <span className="flex items-center gap-2">
                <Calendar size={16} className="text-indigo-400 shrink-0" />
                <span>{fechaFiltro ? format(parseISO(fechaFiltro), 'dd MMM yyyy', { locale: es }) : 'Seleccionar Fecha'}</span>
              </span>
              <ChevronDown size={14} className={`transition-transform shrink-0 ${isCalendarOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCalendarOpen && (
              <div className="absolute top-full mt-2 left-0 right-0 sm:left-auto sm:right-0 mx-auto sm:mx-0 bg-neutral-900 border border-neutral-800 p-4 sm:p-5 rounded-2xl shadow-2xl z-50 w-full max-w-[330px] sm:w-[330px] animate-in fade-in zoom-in-95 duration-150">
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
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 sm:gap-3 bg-neutral-900 sm:bg-neutral-950/80 border border-neutral-800 p-3 sm:p-3.5 rounded-2xl">
        {/* Buscador */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por # pedido, cliente, mesero o mesa..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-neutral-950 sm:bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-8 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
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
              className="w-full bg-neutral-950 sm:bg-neutral-900 border border-neutral-800 rounded-xl pl-3 pr-8 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer appearance-none"
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
                : 'bg-neutral-950 sm:bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800 hover:text-white'
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

          {/* Botón Acceso Rápido Solo Modificadas */}
          <button
            type="button"
            onClick={() => setFiltroSoloModificadas(prev => !prev)}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap border shrink-0 ${
              filtroSoloModificadas
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-sm shadow-blue-500/10'
                : 'bg-neutral-950 sm:bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800 hover:text-white'
            }`}
            title="Ver órdenes modificadas por gerencia"
          >
            <span>✏️</span>
            <span>Modificadas</span>
            {totalModificadasCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] bg-blue-500/30 text-blue-200 rounded-full font-bold">
                {totalModificadasCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Resumen de Resultados Filtrados (KPI Bar) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-4 sm:py-3.5 bg-neutral-900 sm:bg-black/30 border border-neutral-800 rounded-2xl text-xs">
        <div className="flex items-center justify-between sm:justify-start gap-2 text-neutral-400 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm">
              Mostrando <strong className="text-white font-bold">{filtradas.length}</strong> {filtradas.length === 1 ? 'venta' : 'ventas'}
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
            {fechaFiltro && (
              <span className="flex items-center gap-1 text-neutral-300 bg-neutral-800 px-2 py-0.5 rounded-md border border-neutral-700">
                📅 {format(parseISO(fechaFiltro), 'dd MMM yyyy', { locale: es })}
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

          {(busqueda || filtroMetodo !== 'TODOS' || fechaFiltro) && (
            <button
              onClick={() => {
                setBusqueda('');
                setFiltroMetodo('TODOS');
                setFechaFiltro('');
              }}
              className="hidden sm:inline-block text-xs text-neutral-400 hover:text-white underline ml-1 transition-colors cursor-pointer whitespace-nowrap"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12 text-indigo-400 animate-pulse">Cargando historial...</div>
      ) : filtradas.length === 0 ? (
        <div className="text-center p-8 sm:p-12 text-neutral-500 border border-neutral-800 border-dashed rounded-2xl text-sm">
          No hay ventas registradas {fechaFiltro ? 'en esta fecha' : 'con los filtros seleccionados'}.
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-3.5">
          {filtradas.map((venta) => {
            const isExpanded = expandedId === venta.id_factura.toString();
            const isCortesia = isCortesiaVenta(venta);
            const clienteLabel = venta.cliente_nombre && venta.cliente_nombre !== 'Unknown' ? venta.cliente_nombre : 'Consumidor Final';
            const totalItemsCount = venta.detalles?.reduce((acc, item) => acc + Number(item.cantidad || 1), 0) || 0;

            const accentBorderClass =
              venta.estado_activo === false
                ? 'border-l-4 border-l-red-500 border-red-900/50 opacity-80'
                : venta.tipo_documento === 'REEMBOLSO'
                ? 'border-l-4 border-l-rose-500 border-neutral-700/80'
                : isCortesia
                ? 'border-l-4 border-l-amber-500 border-neutral-700/80'
                : venta.verificado
                ? 'border-l-4 border-l-emerald-500 border-neutral-700/80'
                : 'border-l-4 border-l-indigo-500 border-neutral-700/80';

            return (
              <div
                key={venta.id_factura}
                className={`bg-neutral-900 border ${accentBorderClass} rounded-2xl overflow-hidden shadow-lg shadow-black/40 transition-all hover:border-neutral-600`}
              >
                {/* Resumen Fila / Tarjeta */}
                <div
                  className="cursor-pointer select-none"
                  onClick={() => setExpandedId(isExpanded ? null : venta.id_factura.toString())}
                >
                  {/* VISTA MÓVIL (< md): Tarjeta con Cabecera y Cuerpo bien diferenciados */}
                  <div className="flex flex-col md:hidden">
                    {/* Cabecera de la Tarjeta Móvil */}
                    <div className="bg-neutral-800/60 border-b border-neutral-800 px-3.5 py-3 space-y-2">
                      {/* Fila 1: Check + #Pedido (Izquierda) | Total USD + Botón Desplegar (Derecha) */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <button
                            onClick={(e) => handleToggleVerificado(e, venta.id_factura.toString(), !!venta.verificado)}
                            className={`p-1 -ml-1 rounded-full transition-colors shrink-0 ${
                              venta.verificado ? 'text-emerald-400 hover:text-emerald-300' : 'text-neutral-500 hover:text-neutral-300'
                            }`}
                            title={venta.verificado ? 'Desmarcar' : 'Marcar como verificado'}
                          >
                            {venta.verificado ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                          </button>

                          <span className={`font-mono text-sm font-extrabold tracking-tight truncate ${
                            venta.estado_activo === false ? 'text-red-400 line-through' : 'text-white'
                          }`}>
                            {formatDocNumber(venta.numero_documento)}
                          </span>

                          {venta.estado_activo === false && (
                            <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                              Anulada
                            </span>
                          )}
                          {isCortesia && (
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0">
                              ⭐ Cortesía
                            </span>
                          )}
                          {venta.modificaciones && venta.modificaciones.length > 0 && (
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
                                <span className="text-[10px] text-amber-400/80 font-medium whitespace-nowrap">({formatCurrency(venta.total)})</span>
                              </div>
                            ) : (
                              <div>
                                <span className={`text-sm font-extrabold whitespace-nowrap px-2 py-0.5 rounded-md ${
                                  venta.estado_activo === false
                                    ? 'text-red-400 bg-red-500/10'
                                    : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                                }`}>
                                  {formatCurrency(venta.total)}
                                </span>
                                {Number(venta.propina) > 0 && (
                                  <p className="text-[10px] font-bold text-amber-400 mt-0.5 text-right whitespace-nowrap">
                                    +{formatCurrency(Number(venta.propina))} propina
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

                      {/* Fila 2: Fecha y Hora (Izquierda) | Método de Pago (Derecha) */}
                      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-neutral-700/40">
                        <div className="flex items-center gap-1.5 text-xs text-neutral-400 whitespace-nowrap shrink-0">
                          <Clock size={12} className="text-indigo-400/80 shrink-0" />
                          <span>{formatDateTime(venta.fecha_venta)}</span>
                        </div>

                        <div className="flex items-center justify-end gap-1 flex-wrap min-w-0">
                          {isCortesia ? (
                            <span className="text-[11px] text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md font-semibold truncate">
                              ⭐ Cortesía
                            </span>
                          ) : venta.pagos?.length > 0 ? (
                            venta.pagos.map((p, idx) => (
                              <span key={idx} className="text-[11px] text-indigo-200 bg-indigo-500/15 px-2 py-0.5 rounded-md border border-indigo-500/30 font-semibold truncate max-w-[150px]">
                                {getCanonicalPaymentMethodName(p.tipo_pago)}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-md border border-neutral-700">
                              Sin especificar
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cuerpo de la Tarjeta Móvil: Datos claros y separados */}
                    <div className="p-3.5 space-y-2.5 bg-neutral-900">
                      {/* Fila Cliente y Orden/Mesa */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-0.5">Cliente</p>
                          <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
                            <Users size={14} className="text-indigo-400 shrink-0" />
                            <span className="break-words leading-snug">{clienteLabel}</span>
                          </div>
                        </div>

                        {venta.numero_orden && venta.numero_orden !== '-' && (
                          <div className="text-right shrink-0 bg-neutral-800/80 border border-neutral-700/70 px-2.5 py-1 rounded-lg">
                            <p className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold">Orden / Mesa</p>
                            <p className="text-xs font-bold text-indigo-300">{venta.numero_orden}</p>
                          </div>
                        )}
                      </div>

                      {/* Fila Cajero y Mesero */}
                      <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-neutral-800/80 text-xs">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-0.5">Cajero</p>
                          <div className="flex items-center gap-1.5 text-neutral-300 font-medium">
                            <Contact size={13} className="text-emerald-400/80 shrink-0" />
                            <span className="truncate">{venta.cajero_nombre || 'Principal'}</span>
                          </div>
                        </div>
                        <div className="min-w-0 border-l border-neutral-800/80 pl-3">
                          <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-0.5">Mesero</p>
                          <div className="flex items-center gap-1.5 text-neutral-300 font-medium">
                            <ConciergeBell size={13} className="text-amber-400/80 shrink-0" />
                            <span className="truncate">{venta.mesero_nombre || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Pie de Tarjeta Móvil: Indicador de Productos */}
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

                  {/* VISTA ESCRITORIO (md+): Fila horizontal estructurada */}
                  <div className="hidden md:flex items-center justify-between gap-4 p-4">
                    <div className="flex items-center gap-3.5 min-w-[220px]">
                      <button 
                        onClick={(e) => handleToggleVerificado(e, venta.id_factura.toString(), !!venta.verificado)}
                        className={`p-1 rounded-full transition-colors ${venta.verificado ? 'text-emerald-400 hover:text-emerald-300' : 'text-neutral-600 hover:text-neutral-400'}`}
                        title={venta.verificado ? "Desmarcar" : "Marcar como verificado"}
                      >
                        {venta.verificado ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                      </button>
                      <div className="bg-neutral-800 p-2.5 rounded-xl border border-neutral-700/60">
                        <Receipt size={20} className="text-indigo-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`font-mono font-bold text-base ${venta.estado_activo === false ? 'text-red-400 line-through' : 'text-white'}`}>
                            {formatDocNumber(venta.numero_documento)}
                          </p>
                          {venta.estado_activo === false && (
                            <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">
                              Anulada
                            </span>
                          )}
                          {isCortesia && (
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1 shadow-sm">
                              <span>⭐</span> Cortesía
                            </span>
                          )}
                          {venta.modificaciones && venta.modificaciones.length > 0 && (
                            <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1 shadow-sm">
                              <span>✏️</span> Modificada
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-1">
                          <Clock size={12} className="text-indigo-400/70" /> {formatDateTime(venta.fecha_venta)}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4 min-w-[280px] border-x border-neutral-800/80 px-4">
                      <div className="flex flex-col items-start justify-center min-w-0">
                        <p className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold mb-1 w-full text-left">Cliente</p>
                        <div className="flex items-center justify-start gap-1.5 text-white text-sm font-semibold w-full text-left">
                          <Users size={14} className="text-indigo-400 shrink-0" />
                          <span className="truncate" title={clienteLabel}>{clienteLabel}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-start justify-center min-w-0">
                        <p className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold mb-1 w-full text-left">Orden / Mesa</p>
                        <div className="flex items-center justify-start gap-1.5 text-neutral-300 text-sm font-medium w-full text-left">
                          <Hash size={14} className="text-neutral-500 shrink-0" />
                          <span className="truncate">{venta.numero_orden || '-'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-start justify-center min-w-0">
                        <p className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold mb-1 w-full text-left">Cajero</p>
                        <div className="flex items-center justify-start gap-1.5 text-neutral-300 text-sm font-medium w-full text-left">
                          <Contact size={14} className="text-emerald-400/80 shrink-0" />
                          <span className="truncate">{venta.cajero_nombre || 'Principal'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-start justify-center min-w-0">
                        <p className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold mb-1 w-full text-left">Mesero</p>
                        <div className="flex items-center justify-start gap-1.5 text-neutral-300 text-sm font-medium w-full text-left">
                          <ConciergeBell size={14} className="text-amber-400/80 shrink-0" />
                          <span className="truncate">{venta.mesero_nombre || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        {isCortesia ? (
                          <div>
                            <p className="text-base font-extrabold text-amber-400">$0.00</p>
                            <p className="text-[11px] text-amber-400/80 font-medium">Cortesía ({formatCurrency(venta.total)})</p>
                          </div>
                        ) : (
                          <div>
                            <p className={`text-base font-extrabold ${venta.estado_activo === false ? 'text-red-400' : 'text-emerald-400'}`}>
                              {formatCurrency(venta.total)}
                            </p>
                            {Number(venta.propina) > 0 && (
                              <p className="text-xs font-bold text-amber-400 mt-0.5 text-right whitespace-nowrap">
                                +{formatCurrency(Number(venta.propina))} propina
                              </p>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-1 flex-wrap mt-1">
                          {Number(venta.propina) > 0 && (
                            <span className="text-[11px] text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30 font-semibold flex items-center gap-1">
                              🪙 Propina: {formatCurrency(Number(venta.propina))}
                            </span>
                          )}
                          {isCortesia ? (
                            <span className="text-[11px] text-amber-400/90 font-medium">⭐ Cortesía</span>
                          ) : venta.pagos?.length > 0 ? (
                            venta.pagos.map((p, idx) => (
                              <span key={idx} className="text-[11px] text-indigo-200 bg-indigo-500/15 px-2 py-0.5 rounded-md border border-indigo-500/30 font-medium">
                                {getCanonicalPaymentMethodName(p.tipo_pago)}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-neutral-500">
                              Sin especificar
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-400">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detalle Expandido */}
                {isExpanded && (
                  <div className="bg-neutral-950/90 p-3.5 sm:p-4 border-t border-neutral-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Receipt size={14} className="text-indigo-400" />
                        Detalle de la Orden
                      </h4>
                      <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2">
                        <button
                          onClick={(e) => handleReimprimir(e, venta)}
                          className="justify-center text-xs flex items-center gap-1.5 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/30 px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-xl transition-colors font-semibold"
                        >
                          <Printer size={13} className="shrink-0" /> <span>Reimprimir</span>
                        </button>
                        {venta.estado_activo !== false ? (
                          <button
                            onClick={(e) => handleAnular(e, venta.id_factura.toString())}
                            className="justify-center text-xs flex items-center gap-1.5 bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-xl transition-colors font-semibold"
                          >
                            <Ban size={13} className="shrink-0" /> <span>Anular</span>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleRestaurar(e, venta.id_factura.toString())}
                            className="col-span-2 sm:col-span-1 justify-center text-xs flex items-center gap-1.5 bg-green-500/15 text-green-400 hover:bg-green-500/25 border border-green-500/30 px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-xl transition-colors font-semibold"
                          >
                            <RotateCcw size={13} className="shrink-0" /> <span>Restaurar</span>
                          </button>
                        )}
                        {venta.estado_activo !== false && venta.tipo_documento !== 'REEMBOLSO' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setReembolsoVenta(venta);
                            }}
                            className="justify-center text-xs flex items-center gap-1.5 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-xl transition-colors font-semibold"
                          >
                            <Undo2 size={13} className="shrink-0" /> <span>Reembolso</span>
                          </button>
                        )}
                        {canEditOrder && venta.estado_activo !== false && venta.tipo_documento !== 'REEMBOLSO' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setModificarVenta(venta);
                            }}
                            className="justify-center text-xs flex items-center gap-1.5 bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 border border-blue-500/30 px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-xl transition-colors font-semibold"
                            title="Modificar productos y formas de pago con registro de auditoría"
                          >
                            <Edit3 size={13} className="shrink-0" /> <span>Modificar</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Lista de productos tipo ticket */}
                    <div className="bg-neutral-900/90 border border-neutral-800/90 rounded-xl p-3 divide-y divide-neutral-800/70">
                      {venta.detalles.map(d => (
                        <div key={d.id_detalle} className="py-2 first:pt-0 last:pb-0 space-y-1">
                          <div className="flex justify-between items-start gap-3 text-xs sm:text-sm">
                            <div className="flex items-start gap-2 text-neutral-200 min-w-0 flex-1">
                              <span className="bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs px-2 py-0.5 rounded-md font-bold shrink-0">
                                {d.cantidad}x
                              </span>
                              <div className="min-w-0 flex items-center gap-1.5 flex-wrap pt-0.5">
                                <span className="font-semibold text-white break-words leading-snug">{d.producto_nombre || 'Item'}</span>
                                {d.combo_items && d.combo_items.length > 0 && (
                                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-bold uppercase">
                                    Promo
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-emerald-400 font-bold font-mono shrink-0 pt-0.5 whitespace-nowrap">
                              {formatCurrency(d.total)}
                            </span>
                          </div>

                          {/* Desglose de cócteles / sub-productos en la orden */}
                          {d.combo_items && d.combo_items.length > 0 && (
                            <div className="ml-8 pl-2.5 border-l-2 border-indigo-500/40 space-y-0.5 text-xs text-neutral-400 mt-1">
                              {d.combo_items.map((sub: any, sIdx: number) => (
                                <div key={sIdx} className="flex items-center justify-between text-[11px] gap-2">
                                  <span className="truncate">↳ {sub.cantidad > 1 ? `${sub.cantidad}x ` : ''}{sub.nombre}</span>
                                  <span className="text-neutral-500 font-mono text-[10px] shrink-0">(${Number(sub.precio_original || 0).toFixed(2)})</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {Number(venta.propina) > 0 && (
                        <div className="flex justify-between items-center text-xs sm:text-sm pt-2.5 mt-1">
                          <div className="flex items-center gap-2 text-amber-300">
                            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Propina</span>
                            <span className="font-semibold">{venta.mesero_nombre || 'Mesero'}</span>
                          </div>
                          <span className="text-amber-400 font-bold whitespace-nowrap">+ {formatCurrency(Number(venta.propina))}</span>
                        </div>
                      )}
                    </div>

                    {((venta.pagos && venta.pagos.length > 0) || isCortesia) ? (
                      <div className="pt-1">
                        <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Desglose de Pago</h4>
                        <div className="flex gap-2 flex-wrap">
                          {isCortesia && (!venta.pagos || venta.pagos.length === 0 || !venta.pagos.some(p => p.tipo_pago?.toLowerCase().includes('cortes'))) && (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1">
                              ⭐ Cortesía (100% Bonificado / $0.00)
                            </span>
                          )}
                          {venta.pagos?.map((p, idx) => (
                            <span 
                              key={idx} 
                              className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 border ${
                                p.tipo_pago?.toLowerCase().includes('cortes')
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                              }`}
                            >
                              <DollarSign size={13} />
                              {getCanonicalPaymentMethodName(p.tipo_pago)}: {formatCurrency(p.monto)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="pt-1">
                        <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Método de Pago</h4>
                        <span className="text-xs text-neutral-400 bg-neutral-800/60 px-2.5 py-1 rounded-lg border border-neutral-700/60 font-medium">
                          Sin especificar (No registrado)
                        </span>
                      </div>
                    )}
                    {venta.modificaciones && venta.modificaciones.length > 0 && (
                      <div className="pt-3 border-t border-neutral-800 space-y-2.5">
                        <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText size={13} />
                          Registro de Auditoría ({venta.modificaciones.length} {venta.modificaciones.length === 1 ? 'modificación' : 'modificaciones'})
                        </h4>
                        <div className="space-y-2">
                          {venta.modificaciones.map((m, mIdx) => (
                            <div key={m.id_log || mIdx} className="bg-neutral-900/90 border border-amber-500/20 rounded-xl p-3 text-xs space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-neutral-400 gap-1 border-b border-neutral-800/80 pb-2">
                                <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                                  <span>👤</span> {m.gerente_nombre} <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono font-bold uppercase">{m.gerente_rol}</span>
                                </span>
                                <span className="font-mono text-[11px] text-neutral-400">
                                  {formatDateTime(m.fecha)}
                                </span>
                              </div>
                              <div className="text-neutral-200">
                                <span className="text-amber-400/90 font-bold">Motivo:</span> {m.motivo}
                              </div>
                              {m.resumen_cambios && m.resumen_cambios.length > 0 && (
                                <div className="pt-1.5 border-t border-neutral-800/60 space-y-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Cambios aplicados:</span>
                                  <div className="space-y-0.5">
                                    {m.resumen_cambios.map((c, cIdx) => (
                                      <div key={cIdx} className="flex items-center gap-1.5 text-neutral-300 text-[11px]">
                                        <span className="text-amber-400 font-bold">•</span>
                                        <span>{c}</span>
                                      </div>
                                    ))}
                                  </div>
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
          
          <div className="flex justify-between items-center pt-4 border-t border-neutral-800">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-4 py-2.5 sm:py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs sm:text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
            >
              Anterior
            </button>
            <span className="text-neutral-400 text-xs sm:text-sm font-medium">Página {page}</span>
            <button 
              onClick={() => setPage(p => p + 1)}
              disabled={ventas.length < page * 100 || loading}
              className="px-4 py-2.5 sm:py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs sm:text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {modificarVenta && (
        <EditarVentaModal
          venta={modificarVenta}
          isOpen={!!modificarVenta}
          onClose={() => setModificarVenta(null)}
          onSuccess={() => {
            cargarVentas();
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





