'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Store,
  Calendar,
  Truck,
  ShoppingCart,
  Plus,
  Minus,
  Equal,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Package,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  BadgePercent,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';
import { obtenerComprasNetasSede, ComprasNetasResponse, MovimientoCompraNeta } from '@/actions/informes-actions';
import NiteoDateRangePicker from '@/components/ui/NiteoDateRangePicker';
import * as XLSX from 'xlsx';

interface SedeOption {
  id: string;
  nombre: string;
}

interface InformeComprasNetasProps {
  sedes: SedeOption[];
  initialSedeId?: string;
  onSedeChange?: (sedeId: string) => void;
}

export default function InformeComprasNetas({
  sedes = [],
  initialSedeId = '',
  onSedeChange,
}: InformeComprasNetasProps) {
  // Filtros obligatorios
  const [selectedSedeId, setSelectedSedeId] = useState<string>(() => {
    if (initialSedeId && initialSedeId !== 'ALL') return initialSedeId;
    return sedes.length > 0 ? sedes[0].id : '';
  });

  const [fechaInicio, setFechaInicio] = useState<string>(() => {
    return format(startOfMonth(new Date()), 'yyyy-MM-dd');
  });

  const [fechaFin, setFechaFin] = useState<string>(() => {
    return format(new Date(), 'yyyy-MM-dd');
  });

  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<ComprasNetasResponse['data'] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterTipo, setFilterTipo] = useState<string>('TODOS');

  // Si cambia la lista de sedes y no hay seleccionada, asignar la primera
  useEffect(() => {
    if (!selectedSedeId && sedes.length > 0) {
      const firstValid = sedes.find(s => s.id !== 'ALL');
      if (firstValid) {
        setSelectedSedeId(firstValid.id);
      }
    }
  }, [sedes, selectedSedeId]);

  const cargarDatos = (sedeId = selectedSedeId, inicio = fechaInicio, fin = fechaFin) => {
    if (!sedeId || sedeId === 'ALL') {
      setErrorMsg('Debe seleccionar una sede específica para generar este informe.');
      setData(null);
      return;
    }

    setErrorMsg('');
    startTransition(async () => {
      const res = await obtenerComprasNetasSede(sedeId, inicio, fin);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setErrorMsg(res.error || 'Error al obtener la compra neta');
        setData(null);
      }
    });
  };

  useEffect(() => {
    if (selectedSedeId && selectedSedeId !== 'ALL') {
      cargarDatos(selectedSedeId, fechaInicio, fechaFin);
    }
  }, [selectedSedeId, fechaInicio, fechaFin]);

  const handleSedeSelect = (newSedeId: string) => {
    setSelectedSedeId(newSedeId);
    if (onSedeChange) onSedeChange(newSedeId);
  };

  // Filtrado de movimientos en la tabla
  const movimientosFiltrados = (data?.movimientos || []).filter(m => {
    const matchSearch =
      m.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.referencia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.origen_destino.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchSearch) return false;
    if (filterTipo === 'TODOS') return true;
    return m.tipo === filterTipo;
  });

  // Exportar a Excel
  const exportarExcel = () => {
    if (!data) return;

    const rowsExcel = data.movimientos.map(m => ({
      Fecha: m.fecha_formateada,
      Tipo: m.tipo_label,
      Impacto: m.signo === '+' ? 'SUMA (+)' : 'RESTA (-)',
      Concepto: m.descripcion,
      'Origen / Destino': m.origen_destino,
      Referencia: m.referencia,
      'Monto USD': Number(m.monto_usd.toFixed(2)),
      'Monto Bs': m.monto_bs > 0 ? Number(m.monto_bs.toFixed(2)) : 0,
    }));

    // Fila resumen
    rowsExcel.push({
      Fecha: 'TOTAL COMPRA NETA',
      Tipo: 'ECUACIÓN CONTABLE',
      Impacto: '=',
      Concepto: `Locales ($${data.compras_locales.total_usd.toFixed(2)}) + Recibidos ($${data.despachos_recibidos.total_usd.toFixed(2)}) - Entregados ($${data.despachos_entregados.total_usd.toFixed(2)}) - Ventas Costo ($${(data.ventas_costo?.total_usd || 0).toFixed(2)})`,
      'Origen / Destino': data.sede.nombre,
      Referencia: 'TOTAL',
      'Monto USD': Number(data.compra_neta_usd.toFixed(2)),
      'Monto Bs': Number(data.compras_locales.total_bs.toFixed(2)),
    });

    const worksheet = XLSX.utils.json_to_sheet(rowsExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Compras Netas');
    XLSX.writeFile(
      workbook,
      `Compras_Netas_${data.sede.nombre.replace(/\s+/g, '_')}_${fechaInicio}_al_${fechaFin}.xlsx`
    );
  };

  // Imprimir comprobante
  const imprimirReporte = () => {
    window.print();
  };

  const formatUSD = (val: number) => `$ ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatBs = (val: number) => `Bs.S ${val.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="w-full space-y-6 print:space-y-4">
      {/* ── BARRA DE FILTROS SUPERIOR (OBLIGATORIA) ────────────────────────── */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Informe Financiero
              </span>
              <span className="text-xs text-neutral-500 font-medium">Ecuación de Inventario</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">Compras Netas por Sede</h2>
            <p className="text-sm text-neutral-400">
              Valor de mercancía real que pertenece y consumió una sede (Compras directas + Despachos recibidos - Despachos entregados).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              onClick={() => cargarDatos()}
              disabled={isPending || !selectedSedeId}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-xl text-sm font-medium border border-neutral-700 transition-colors"
              title="Recargar datos"
            >
              <RefreshCw size={15} className={isPending ? 'animate-spin text-indigo-400' : ''} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            <button
              onClick={exportarExcel}
              disabled={!data || data.movimientos.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              <FileSpreadsheet size={15} />
              <span>Excel</span>
            </button>

            <button
              onClick={imprimirReporte}
              disabled={!data}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              <Printer size={15} />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>

        {/* Controles de Selección: Sede (OBLIGATORIO) y Fecha */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-neutral-800/80">
          {/* Selector de Sede OBLIGATORIO */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Store size={14} className="text-indigo-400" />
              <span>Sede de Análisis (Obligatoria)</span>
              <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedSedeId}
                onChange={e => handleSedeSelect(e.target.value)}
                className={`w-full h-12 bg-neutral-950 border rounded-xl px-4 text-white text-sm font-medium outline-none transition-all ${
                  !selectedSedeId || selectedSedeId === 'ALL'
                    ? 'border-rose-500/80 focus:border-rose-500 ring-2 ring-rose-500/20'
                    : 'border-neutral-800 focus:border-indigo-500'
                }`}
              >
                <option value="" disabled>-- Selecciona una Sede Obligatoria --</option>
                {sedes
                  .filter(s => s.id !== 'ALL')
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
              </select>
            </div>
            {(!selectedSedeId || selectedSedeId === 'ALL') && (
              <p className="text-xs text-rose-400 font-medium flex items-center gap-1 mt-1">
                <AlertCircle size={12} />
                Este informe no puede ser global. Por favor, selecciona una sede específica.
              </p>
            )}
          </div>

          {/* Rango de Fechas */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={14} className="text-emerald-400" />
              <span>Rango de Fechas</span>
            </label>
            <NiteoDateRangePicker
              startDate={fechaInicio}
              endDate={fechaFin}
              onChange={(start, end) => {
                if (start && end) {
                  setFechaInicio(start);
                  setFechaFin(end);
                }
              }}
              align="left"
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* ── ESTADO DE ERROR O ADVERTENCIA ──────────────────────────────────── */}
      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle size={20} className="text-rose-400 shrink-0" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {/* ── ENCABEZADO DE IMPRESIÓN (Visible sólo en PDF/Impresora) ─────────── */}
      <div className="hidden print:block border-b border-neutral-300 pb-4 mb-4">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black text-black uppercase">NITEO ERP - INFORME DE COMPRAS NETAS</h1>
            <p className="text-sm text-neutral-700">
              Sede Evaluada: <span className="font-bold text-black">{data?.sede.nombre}</span>
            </p>
            <p className="text-xs text-neutral-600">
              Período: {fechaInicio} al {fechaFin}
            </p>
          </div>
          <div className="text-right text-xs text-neutral-600">
            <p className="font-bold text-indigo-700">COMPRA NETA REAL</p>
            <p>Ecuación: (Compras Directas + Despachos Recibidos) - Despachos Entregados</p>
            <p>{new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* ── VISUALIZACIÓN PRINCIPAL: TARJETAS DE LA ECUACIÓN CONTABLE ───────── */}
      {data && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Layers size={16} className="text-indigo-400" />
              <span>Ecuación Contable del Período</span>
            </h3>
            <span className="text-xs text-neutral-500">
              Valores calculados para: <strong className="text-neutral-300">{data.sede.nombre}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* TARJETA 1: COMPRAS LOCALES DIRECTAS */}
            <div className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 relative overflow-hidden transition-all shadow-sm group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingCart size={14} className="text-emerald-400" />
                  Compras Locales
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  + Suma
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {formatUSD(data.compras_locales.total_usd)}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
                <span>{data.compras_locales.cantidad} compras registradas</span>
                {data.compras_locales.total_bs > 0 && (
                  <span className="font-mono text-neutral-500">{formatBs(data.compras_locales.total_bs)}</span>
                )}
              </div>
            </div>

            {/* TARJETA 2: DESPACHOS RECIBIDOS */}
            <div className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 relative overflow-hidden transition-all shadow-sm group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowDownLeft size={14} className="text-cyan-400" />
                  Despachos Recibidos
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  + Entra Mercancía
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {formatUSD(data.despachos_recibidos.total_usd)}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
                <span>{data.despachos_recibidos.cantidad} items recibidos</span>
                <span className="text-neutral-500">Valor a favor de la sede</span>
              </div>
            </div>

            {/* TARJETA 3: DESPACHOS ENTREGADOS / ENVIADOS */}
            <div className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 relative overflow-hidden transition-all shadow-sm group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowUpRight size={14} className="text-rose-400" />
                  Despachos Entregados
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  − Sale Mercancía
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {formatUSD(data.despachos_entregados.total_usd)}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
                <span>{data.despachos_entregados.cantidad} items enviados</span>
                <span className="text-neutral-500">Costo cedido a otra sede</span>
              </div>
            </div>

            {/* TARJETA 4: VENTAS AL COSTO (DEDUCCIÓN FAMILIAR) */}
            <div className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 relative overflow-hidden transition-all shadow-sm group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BadgePercent size={14} className="text-purple-400" />
                  Ventas al Costo
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  − Retiro al Costo
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {formatUSD(data.ventas_costo?.total_usd || 0)}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
                <span>{data.ventas_costo?.cantidad || 0} retiros procesados</span>
                <span className="text-neutral-500">Consumo interno / familiar</span>
              </div>
            </div>
          </div>

          {/* TARJETA PRINCIPAL DESTACADA: COMPRA NETA DEL PERÍODO */}
          <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900/40 via-neutral-900 to-indigo-950/50 border-2 border-indigo-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_40px_rgba(99,102,241,0.15)]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500 text-white uppercase tracking-wider shadow-sm">
                    Resultado Final
                  </span>
                  <span className="text-sm font-semibold text-indigo-300">
                    Ecuación: (Compras Directas + Despachos Recibidos) − Despachos Entregados − Ventas al Costo
                  </span>
                </div>
                <h4 className="text-lg font-bold text-white">COMPRA NETA DEL PERÍODO</h4>
                <p className="text-sm text-neutral-400 max-w-xl mt-1">
                  Representa el costo real de los insumos y mercancías consumidos y retenidos exclusivamente por la sucursal <strong className="text-white">{data.sede.nombre}</strong>.
                </p>
              </div>

              <div className="text-left md:text-right shrink-0 bg-neutral-950/60 border border-indigo-500/20 px-6 py-4 rounded-2xl">
                <p className="text-xs uppercase font-black tracking-widest text-indigo-400">Compra Neta Total</p>
                <p className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
                  {formatUSD(data.compra_neta_usd)}
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  Base imponible para rentabilidad y margen real
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TABLA DE DESGLOSE DETALLADO CRONOLÓGICO ───────────────────────── */}
      {data && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Package size={18} className="text-indigo-400" />
                <span>Desglose Detallado de Movimientos</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Orden cronológico de compras directas y transferencias que componen el saldo neto.
              </p>
            </div>

            {/* Filtros de tabla */}
            <div className="flex items-center gap-2 w-full sm:w-auto print:hidden">
              <input
                type="text"
                placeholder="Buscar por proveedor, item o ref..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 h-10 bg-neutral-950 border border-neutral-800 text-white rounded-xl px-3 text-xs outline-none focus:border-indigo-500"
              />

              <select
                value={filterTipo}
                onChange={e => setFilterTipo(e.target.value)}
                className="h-10 bg-neutral-950 border border-neutral-800 text-neutral-300 rounded-xl px-3 text-xs outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="TODOS">Todos los tipos</option>
                <option value="COMPRA_LOCAL">Compras Locales (+)</option>
                <option value="DESPACHO_RECIBIDO">Despachos Recibidos (+)</option>
                <option value="DESPACHO_ENTREGADO">Despachos Entregados (−)</option>
                <option value="VENTA_AL_COSTO">Ventas al Costo (−)</option>
              </select>
            </div>
          </div>

          {/* Tabla de movimientos */}
          <div className="overflow-x-auto border border-neutral-800 rounded-xl">
            <table className="w-full text-left text-xs text-neutral-300 whitespace-nowrap">
              <thead className="bg-neutral-950/70 text-neutral-400 font-bold uppercase tracking-wider border-b border-neutral-800">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Tipo Movimiento</th>
                  <th className="px-4 py-3 text-center">Impacto</th>
                  <th className="px-4 py-3">Detalle / Concepto</th>
                  <th className="px-4 py-3">Origen / Destino</th>
                  <th className="px-4 py-3">Referencia</th>
                  <th className="px-4 py-3 text-right">Monto USD</th>
                  <th className="px-4 py-3 text-right">Monto Bs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {movimientosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-neutral-500">
                      No se encontraron movimientos registrados para este período y sede.
                    </td>
                  </tr>
                ) : (
                  movimientosFiltrados.map(m => {
                    const isSuma = m.signo === '+';
                    const isDespachoRec = m.tipo === 'DESPACHO_RECIBIDO';
                    const isDespachoEnt = m.tipo === 'DESPACHO_ENTREGADO';
                    const isVentaCosto = m.tipo === 'VENTA_AL_COSTO';

                    let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                    if (isDespachoRec) badgeColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
                    else if (isDespachoEnt) badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                    else if (isVentaCosto) badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/20';

                    return (
                      <tr key={m.id} className="hover:bg-neutral-800/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-white">{m.fecha_formateada}</td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${badgeColor}`}
                          >
                            {isDespachoRec && <ArrowDownLeft size={12} />}
                            {isDespachoEnt && <ArrowUpRight size={12} />}
                            {isVentaCosto && <BadgePercent size={12} />}
                            {!isDespachoRec && !isDespachoEnt && !isVentaCosto && <ShoppingCart size={12} />}
                            {m.tipo_label}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-black text-xs ${
                              isSuma ? 'bg-emerald-950/60 text-emerald-400' : 'bg-rose-950/60 text-rose-400'
                            }`}
                          >
                            {m.signo} {isSuma ? 'SUMA' : 'RESTA'}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-medium text-neutral-200 max-w-xs truncate" title={m.descripcion}>
                          {m.descripcion}
                        </td>

                        <td className="px-4 py-3 text-neutral-400">{m.origen_destino}</td>

                        <td className="px-4 py-3 font-mono text-[11px] text-neutral-400">{m.referencia}</td>

                        <td className={`px-4 py-3 text-right font-bold text-sm ${isSuma ? 'text-white' : 'text-rose-400'}`}>
                          {m.signo} {formatUSD(m.monto_usd)}
                        </td>

                        <td className="px-4 py-3 text-right font-mono text-neutral-400">
                          {m.monto_bs > 0 ? `${m.signo} ${formatBs(m.monto_bs)}` : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Pie de tabla con resumen */}
              {movimientosFiltrados.length > 0 && (
                <tfoot className="bg-neutral-950 font-bold border-t-2 border-neutral-700 text-white">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-xs uppercase tracking-wider text-indigo-400">
                      Balance Neta de Compras:
                    </td>
                    <td colSpan={3} className="px-4 py-3 text-xs text-neutral-400">
                      Locales ({formatUSD(data.compras_locales.total_usd)}) + Recibidos ({formatUSD(data.despachos_recibidos.total_usd)}) − Entregados ({formatUSD(data.despachos_entregados.total_usd)})
                    </td>
                    <td className="px-4 py-3 text-right text-base font-black text-indigo-300">
                      {formatUSD(data.compra_neta_usd)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-mono text-neutral-400">
                      {formatBs(data.compras_locales.total_bs)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
