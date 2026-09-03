'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, FileSpreadsheet, Printer, Search, ChevronDown, ChevronRight,
  TrendingUp, Clock, Calendar as CalendarIcon, Users, CreditCard, DollarSign,
  Package, AlertTriangle, Receipt, Star, BarChart2, X, Loader2,
  Store, Tag, ShieldAlert, LayoutGrid, Trash2, List,
} from 'lucide-react';
import { getSedes } from '@/actions/dashboard-actions';
import { useEmpresa } from '@/components/providers/EmpresaProvider';
import { generateReport, getCategorias, getCajeros, getClientes, ExtraFilters } from '@/actions/informes-actions';
import { format, subDays, startOfWeek, endOfWeek, startOfDay, endOfDay,
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  subMonths,
} from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


// ─── Tipos ──────────────────────────────────────────────────────────────────

type DateRangeKey = 'hoy' | 'ayer' | '7d' | 'esta_semana' | 'este_mes' | 'mes_pasado' | 'este_ano';

interface Report {
  id: string;
  name: string;
  desc: string;
  icon: React.ElementType;
  badge?: string;
  /** qué filtros contextuales mostrar en el panel de este reporte */
  extraFilters?: ('categoria' | 'cajero' | 'cliente')[];
}

interface ReportGroup {
  id: string;
  category: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  reports: Report[];
}

// ─── Catálogo rediseñado ─────────────────────────────────────────────────────

const REPORT_CATALOG: ReportGroup[] = [
  {
    id: 'ventas',
    category: 'Rendimiento de Ventas',
    icon: TrendingUp,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10 border-indigo-500/20',
    reports: [
      {
        id: 'detalle_ventas',
        name: 'Detalle de Ventas',
        desc: 'Cada factura con nº de orden, cliente, cajero, productos y pago',
        icon: List,
        extraFilters: ['cliente', 'cajero'],
        badge: 'Nuevo',
      },
      {
        id: 'productos_vendidos',
        name: 'Productos Vendidos',
        desc: 'Código, nombre, categoría, unidades e ingresos. Filtrable por categoría, cajero y cliente',
        icon: Star,
        extraFilters: ['categoria', 'cajero', 'cliente'],
      },
      {
        id: 'ventas_categoria',
        name: 'Ventas por Categoría',
        desc: 'Totales agrupados por grupo de producto. Filtrable por categoría, cajero y cliente',
        icon: LayoutGrid,
        extraFilters: ['categoria', 'cajero', 'cliente'],
      },
      { id: 'productos_vendidos',  name: 'Top Productos', extraFilters: ['categoria', 'cajero', 'cliente'],             desc: 'Qué platos o bebidas se venden más',                  icon: Star },
      { id: 'ventas_hora',       name: 'Horas Pico',                desc: 'Distribución de ventas por franjas horarias',          icon: Clock },
      { id: 'ventas_diarias',    name: 'Tendencia Diaria',          desc: 'Evolución día a día del volumen de negocio',           icon: CalendarIcon },
      {
        id: 'ventas_usuarios',
        name: 'Rendimiento por Empleado',
        desc: 'Ventas registradas por cajero o mesero',
        icon: Users,
        extraFilters: ['cajero'],
      },
      {
        id: 'ventas_clientes',
        name: 'Clientes Frecuentes',
        desc: 'Ranking de mejores clientes por volumen de compras',
        icon: Receipt,
        extraFilters: ['cliente'],
      },
    ],
  },

  {
    id: 'finanzas',
    category: 'Flujo de Caja y Finanzas',
    icon: DollarSign,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    reports: [
      { id: 'ventas_metodos_pago',name: 'Ingresos por Método',     desc: 'Desglose por Efectivo, Zelle, Punto, Binance, etc.',   icon: CreditCard },
      { id: 'ganancias_margenes', name: 'Rentabilidad Real',       desc: 'Ventas vs Costo Promedio — margen neto',               icon: BarChart2 },
      { id: 'cierres_caja',       name: 'Historial de Cierres',    desc: 'Resumen histórico de cierres de caja (Reportes Z)',     icon: ShieldAlert },
    ],
  },
  {
    id: 'clientes',
    category: 'Clientes y Créditos',
    icon: Users,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
    reports: [
      { id: 'cuentas_por_cobrar', name: 'Cuentas por Cobrar',      desc: 'Créditos activos y deudas pendientes de cobro',        icon: Receipt },
      { id: 'ventas_clientes',    name: 'Clientes Frecuentes',      desc: 'Ranking de mejores clientes por volumen de compras',   icon: Star },
    ],
  },
  {
    id: 'inventario',
    category: 'Inventario',
    icon: Package,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
    reports: [
      { id: 'stock_valorizado',   name: 'Valorización de Stock',   desc: 'Cantidades actuales y valor total del inventario',     icon: Package },
      { id: 'stock_bajo',         name: 'Alertas de Reposición',   desc: 'Artículos por debajo del nivel mínimo de stock',       icon: AlertTriangle },
      { id: 'mermas',             name: 'Mermas y Regalías',       desc: 'Pérdidas, daños y cortesías registradas',              icon: Trash2, badge: 'Próx.' },
    ],
  },
];

// ─── Selectores de fecha rápidos ─────────────────────────────────────────────

const DATE_PILLS: { key: DateRangeKey; label: string }[] = [
  { key: 'hoy',        label: 'Hoy'   },
  { key: '7d',         label: '7D'    },
  { key: 'este_mes',   label: 'Mes'   },
  { key: 'mes_pasado', label: '-Mes'  },
  { key: 'este_ano',   label: 'Año'   },
];

// ─── Componente principal ────────────────────────────────────────────────────

export default function InformesPage() {
  const { empresa } = useEmpresa();
  const [sedes, setSedes] = useState<any[]>([]);
  const [sedeId, setSedeId] = useState('ALL');

  // Fecha global
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate,   setEndDate]   = useState<Date>(new Date());

  // Búsqueda y acordeones
  const [searchQuery, setSearchQuery] = useState('');
  const [openGroups,  setOpenGroups]  = useState<Record<string, boolean>>({ ventas: true });

  // Bottom Sheet
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [sheetOpen,      setSheetOpen]      = useState(false);

  // Fecha dentro del Bottom Sheet / panel desktop
  const [sheetStartDate, setSheetStartDate] = useState<Date>(startOfMonth(new Date()));
  const [sheetEndDate,   setSheetEndDate]   = useState<Date>(new Date());
  const [sheetDateKey,   setSheetDateKey]   = useState<DateRangeKey>('este_mes');

  // ── Filtros extra (categoría / cajero / cliente) ──────────────────────────
  const [categorias,       setCategorias]       = useState<string[]>([]);
  const [cajeros,          setCajeros]          = useState<{ id: string; nombre: string }[]>([]);
  const [clientes,         setClientes]         = useState<{ id: string; nombre: string }[]>([]);
  const [categoriaFilter,  setCategoriaFilter]  = useState('');
  const [cajeroFilter,     setCajeroFilter]     = useState('');
  const [clienteFilter,    setClienteFilter]    = useState('');
  const [loadingFilters,   setLoadingFilters]   = useState(false);

  // Resultado del reporte
  const [isLoading,        setIsLoading]        = useState(false);
  const [reportData,       setReportData]       = useState<any[] | null>(null);
  const [reportError,      setReportError]      = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => { getSedes().then(setSedes); }, []);



  // ── Helpers de fecha ──────────────────────────────────────────────────────

  const applyDatePreset = useCallback((key: DateRangeKey, setStart: (d: Date) => void, setEnd: (d: Date) => void) => {
    const today = new Date();
    switch (key) {
      case 'hoy':        setStart(today);                          setEnd(today);                          break;
      case 'ayer':       setStart(subDays(today, 1));              setEnd(subDays(today, 1));              break;
      case '7d':         setStart(subDays(today, 7));              setEnd(today);                          break;
      case 'esta_semana':setStart(startOfWeek(today));             setEnd(endOfWeek(today));               break;
      case 'este_mes':   setStart(startOfMonth(today));            setEnd(endOfMonth(today));              break;
      case 'mes_pasado': setStart(startOfMonth(subMonths(today,1)));setEnd(endOfMonth(subMonths(today,1)));break;
      case 'este_ano':   setStart(startOfYear(today));             setEnd(endOfYear(today));               break;
    }
  }, []);

  const setPredefinedDate = (key: DateRangeKey) => {
    applyDatePreset(key, setStartDate, setEndDate);
  };

  const setSheetPreset = (key: DateRangeKey) => {
    setSheetDateKey(key);
    applyDatePreset(key, setSheetStartDate, setSheetEndDate);
  };

  // ── Generar reporte ────────────────────────────────────────────────────────


  useEffect(() => {
    if (selectedReport && sheetStartDate && sheetEndDate) {
      handleGenerate(selectedReport.id, sheetStartDate, sheetEndDate);
    }
  }, [selectedReport, sheetStartDate, sheetEndDate, categoriaFilter, cajeroFilter, clienteFilter]);


  useEffect(() => {
    if (selectedReport && sheetStartDate && sheetEndDate) {
      handleGenerate(selectedReport.id, sheetStartDate, sheetEndDate);
    }
  }, [selectedReport, sheetStartDate, sheetEndDate, categoriaFilter, cajeroFilter, clienteFilter]);

  const handleGenerate = async (reportId: string, s: Date, e: Date) => {
    setIsLoading(true);
    setReportError('');
    setReportData(null);
    try {
      const extra: ExtraFilters = {
        categoriaFilter: categoriaFilter || undefined,
        cajeroId:        cajeroFilter    || undefined,
        clienteId:       clienteFilter   || undefined,
      };
      const res = await generateReport(
        reportId, 
        sedeId, 
        format(startOfDay(s), "yyyy-MM-dd'T'HH:mm:ssXXX"), 
        format(endOfDay(e), "yyyy-MM-dd'T'HH:mm:ssXXX"), 
        extra
      );
      if (res.success) {
        let data = res.data;
        setReportData(data);
        
      } else {
          setReportError(res.error || 'Error desconocido.');
          setReportData(null);
        }
    } catch (err: any) {
      setReportError(err.message || 'Error de conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Catálogo filtrado por búsqueda ────────────────────────────────────────

  const filteredCatalog = REPORT_CATALOG.map(group => ({
    ...group,
    reports: group.reports.filter(r =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.desc.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(g => g.reports.length > 0);

  // ── Abrir Bottom Sheet + cargar listas de filtros dinámicos ──────────────

  const openSheet = async (report: Report) => {
    setSelectedReport(report);
    setReportData(null);
    setReportError('');
    setCategoriaFilter('');
    setCajeroFilter('');
    setClienteFilter('');
    setSheetOpen(true);
    setSheetDateKey('este_mes');
    applyDatePreset('este_mes', setSheetStartDate, setSheetEndDate);

    const needs = report.extraFilters ?? [];
    if (needs.length === 0) return;

    setLoadingFilters(true);
    try {
      await Promise.all([
        needs.includes('categoria') && categorias.length === 0
          ? getCategorias().then(setCategorias)
          : Promise.resolve(),
        needs.includes('cajero') && cajeros.length === 0
          ? getCajeros().then(setCajeros)
          : Promise.resolve(),
        needs.includes('cliente') && clientes.length === 0
          ? getClientes().then(setClientes)
          : Promise.resolve(),
      ]);
    } finally {
      setLoadingFilters(false);
    }
  };



  // ── Toggle acordeón ───────────────────────────────────────────────────────

  const toggleGroup = (id: string) =>
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));

  // ── Nombre del reporte seleccionado ──────────────────────────────────────
  const selectedReportName = selectedReport?.name ?? '';

  // ── Export Excel ──────────────────────────────────────────────────────────

  
  const exportExcel = () => {
    if (!reportData || reportData.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(reportData);
    const colWidths: number[] = [];
    reportData.forEach(row =>
      Object.entries(row).forEach(([k, v], i) => {
        colWidths[i] = Math.max(colWidths[i] || 0, String(v ?? '').length, k.length);
      })
    );
    ws['!cols'] = colWidths.map(w => ({ width: w + 2 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    XLSX.writeFile(wb, `${selectedReportName.replace(/ /g, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const exportPDF = () => {
    if (!reportData || reportData.length === 0) return;
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229);
    doc.text('NITEO ERP', 14, 20);
    
    doc.setFontSize(14);
    doc.setTextColor(10, 10, 10);
    doc.text(selectedReportName, 14, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Período: ${format(sheetStartDate, 'dd/MM/yyyy')} - ${format(sheetEndDate, 'dd/MM/yyyy')}`, 14, 36);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 42);

    const keys = Object.keys(reportData[0] || {});
    const head = [keys.map(k => k.replace(/_/g, ' ').toUpperCase())];
    
    const body = reportData.map(row => {
      return keys.map(k => {
        const val = row[k];
        if (typeof val === 'number') {
          return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return String(val ?? '');
      });
    });

    autoTable(doc, {
      startY: 50,
      head: head,
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [24, 24, 27], textColor: 255 },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      styles: { fontSize: 9 },
    });
    
    doc.save(`${selectedReportName.replace(/ /g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };


  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full w-full bg-neutral-950 text-white overflow-hidden print:overflow-visible print:h-auto flex-col lg:flex-row relative print:block">

      {/* ══════════════════════════════════════════════════════════════════
          PANEL IZQUIERDO — Catálogo con Acordeones
      ══════════════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-neutral-800
                      bg-neutral-950 flex flex-col shrink-0 print:hidden
                      max-h-[50vh] lg:max-h-full">

        {/* Header + Búsqueda */}
        <div className="p-4 border-b border-neutral-800 shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar informe..."
              className="w-full h-10 bg-neutral-900 border border-neutral-800 text-white text-sm rounded-xl pl-9 pr-3
                         focus:outline-none focus:border-indigo-500 placeholder:text-neutral-600"
            />
          </div>
        </div>

        {/* Grupos con Acordeón */}
        <div className="flex-1 overflow-y-auto print:overflow-visible print:h-auto custom-scrollbar">
          {filteredCatalog.length === 0 ? (
            <p className="text-center text-neutral-600 text-sm py-10 px-4">Sin resultados para "{searchQuery}"</p>
          ) : (
            filteredCatalog.map(group => {
              const GroupIcon = group.icon;
              const isOpen = !!openGroups[group.id];
              return (
                <div key={group.id} className="border-b border-neutral-800/60">
                  {/* Cabecera del acordeón */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between px-4 py-3.5
                               hover:bg-neutral-900/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${group.bgColor}`}>
                        <GroupIcon size={15} className={group.color} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-neutral-200">{group.category}</p>
                        <p className="text-xs text-neutral-500">{group.reports.length} informe{group.reports.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-neutral-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Ítems del grupo */}
                  {isOpen && (
                    <div className="pb-2 px-2 space-y-0.5 animate-in slide-in-from-top-1 duration-150">
                      {group.reports.map(report => {
                        const ReportIcon = report.icon;
                        const isSelected = selectedReport?.id === report.id && sheetOpen;
                        return (
                          <button
                            key={report.id}
                            onClick={() => openSheet(report)}
                            className={`
                              w-full flex items-center gap-3 px-3 h-14 rounded-xl text-left
                              transition-all duration-150 group/item
                              ${isSelected
                                ? `${group.bgColor} border`
                                : 'hover:bg-neutral-800/60 border border-transparent'
                              }
                            `}
                          >
                            <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                              ${isSelected ? group.bgColor : 'bg-neutral-800 group-hover/item:bg-neutral-700'}
                              transition-colors`}>
                              <ReportIcon size={15} className={isSelected ? group.color : 'text-neutral-400'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-neutral-300'}`}>
                                {report.name}
                              </p>
                              <p className="text-xs text-neutral-600 truncate">{report.desc}</p>
                            </div>
                            {report.badge ? (
                              <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                {report.badge}
                              </span>
                            ) : (
                              <ChevronRight size={14} className={`shrink-0 transition-colors ${isSelected ? group.color : 'text-neutral-700 group-hover/item:text-neutral-500'}`} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ÁREA CENTRAL — Placeholder + Panel Filtros (Desktop)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden print:overflow-visible print:h-auto">

        {/* Estado vacío / placeholder */}
        {!sheetOpen && (
          <div className="flex-1 hidden lg:flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-neutral-900 rounded-2xl mx-auto flex items-center justify-center border border-neutral-800 mb-4">
              <FileSpreadsheet size={28} className="text-indigo-500" />
            </div>
            <p className="text-neutral-300 font-semibold text-lg">Selecciona un informe</p>
            <p className="text-neutral-600 text-sm mt-1 max-w-xs">
              Elige un reporte del catálogo para ver los filtros y generar el documento.
            </p>
          </div>
        )}

        {/* Panel de Filtros — Desktop (solo cuando hay reporte seleccionado) */}
        {sheetOpen && selectedReport && (
          <div className="hidden lg:flex flex-1 flex-col animate-in fade-in duration-200">
            <DesktopReportPanel
              report={selectedReport}
              sedes={sedes}
              sedeId={sedeId}
              setSedeId={setSedeId}
              sheetStartDate={sheetStartDate}
              sheetEndDate={sheetEndDate}
              setSheetStartDate={setSheetStartDate}
              setSheetEndDate={setSheetEndDate}
              sheetDateKey={sheetDateKey}
              setSheetPreset={setSheetPreset}
              isLoading={isLoading}
              reportData={reportData}
              reportError={reportError}
              categorias={categorias}
              cajeros={cajeros}
              clientes={clientes}
              loadingFilters={loadingFilters}
              categoriaFilter={categoriaFilter}
              setCategoriaFilter={setCategoriaFilter}
              cajeroFilter={cajeroFilter}
              setCajeroFilter={setCajeroFilter}
              clienteFilter={clienteFilter}
              setClienteFilter={setClienteFilter}
              onGenerate={() => setShowPreviewModal(true)}
              onExport={exportExcel}
              onClose={() => setSheetOpen(false)}
            />

          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          BOTTOM SHEET — Mobile (90% pantalla desde abajo)
      ══════════════════════════════════════════════════════════════════ */}
      {sheetOpen && selectedReport && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
          />
          {/* Sheet */}
          <div className="lg:hidden fixed bottom-0 inset-x-0 z-50
                          bg-neutral-900 border-t border-neutral-800 rounded-t-3xl
                          animate-in slide-in-from-bottom duration-300
                          max-h-[92dvh] flex flex-col
                          pb-[env(safe-area-inset-bottom)]">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-neutral-700" />
            </div>

            {/* Header del sheet */}
            <div className="flex items-center justify-between px-5 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                {(() => {
                  const group = REPORT_CATALOG.find(g => g.reports.some(r => r.id === selectedReport.id));
                  const Icon  = selectedReport.icon;
                  return (
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${group?.bgColor ?? 'bg-neutral-800'}`}>
                      <Icon size={18} className={group?.color ?? 'text-neutral-400'} />
                    </div>
                  );
                })()}
                <div>
                  <p className="font-bold text-white text-base">{selectedReport.name}</p>
                  <p className="text-xs text-neutral-500">{selectedReport.desc}</p>
                </div>
              </div>
              <button
                onClick={() => setSheetOpen(false)}
                className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido scrollable */}
            <div className="flex-1 overflow-y-auto print:overflow-visible print:h-auto custom-scrollbar px-5 space-y-5 pb-4">

              {/* — Sede selector — */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Sucursal</label>
                <div className="relative">
                  <Store size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <select
                    value={sedeId}
                    onChange={e => setSedeId(e.target.value)}
                    className="w-full h-12 bg-neutral-950 border border-neutral-800 text-white text-base rounded-xl pl-9 pr-3 appearance-none focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ALL">Todas las sedes</option>
                    {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              </div>

              {/* — Filtros extra contextuales (categoría / cajero / cliente) — */}
              {loadingFilters && (
                <div className="flex items-center gap-2 text-neutral-500 text-sm">
                  <Loader2 size={14} className="animate-spin" /> Cargando filtros...
                </div>
              )}
              {!loadingFilters && selectedReport.extraFilters?.includes('categoria') && categorias.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Categoría</label>
                  <select
                    value={categoriaFilter}
                    onChange={e => setCategoriaFilter(e.target.value)}
                    className="w-full h-12 bg-neutral-950 border border-neutral-800 text-white text-base rounded-xl px-3 appearance-none focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Todas las categorías</option>
                    {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
              {!loadingFilters && selectedReport.extraFilters?.includes('cajero') && cajeros.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Cajero / Empleado</label>
                  <select
                    value={cajeroFilter}
                    onChange={e => setCajeroFilter(e.target.value)}
                    className="w-full h-12 bg-neutral-950 border border-neutral-800 text-white text-base rounded-xl px-3 appearance-none focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Todos los empleados</option>
                    {cajeros.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                  </select>
                </div>
              )}
              {!loadingFilters && selectedReport.extraFilters?.includes('cliente') && clientes.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Cliente</label>
                  <select
                    value={clienteFilter}
                    onChange={e => setClienteFilter(e.target.value)}
                    className="w-full h-12 bg-neutral-950 border border-neutral-800 text-white text-base rounded-xl px-3 appearance-none focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Todos los clientes</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
              )}

              {/* — Píldoras de fecha rápidas — */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Período</label>
                <div className="flex gap-2 flex-wrap">
                  {DATE_PILLS.map(pill => (
                    <button
                      key={pill.key}
                      onClick={() => setSheetPreset(pill.key)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                        sheetDateKey === pill.key
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-600'
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-neutral-600 pt-1">
                  {format(sheetStartDate, 'dd/MM/yy')} → {format(sheetEndDate, 'dd/MM/yy')}
                </p>
              </div>


              {/* — Botón generar — */}
              <button
                onClick={() => setShowPreviewModal(true)}
                disabled={isLoading}
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50
                           text-white font-bold rounded-2xl flex items-center justify-center gap-2
                           transition-colors shadow-[0_0_20px_rgba(99,102,241,0.3)]"
              >
                {isLoading
                  ? <><Loader2 size={18} className="animate-spin" /> Generando...</>
                  : <><FileText size={18} /> Generar Documento</>
                }
              </button>

              {/* — Mini gráfico placeholder — */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Vista Previa</p>
                {!reportData && !isLoading && (
                  <div className="h-32 flex flex-col items-center justify-center text-neutral-700 gap-2">
                    <BarChart2 size={32} className="opacity-30" />
                    <p className="text-xs">Genera el reporte para ver el resumen</p>
                  </div>
                )}
                {isLoading && (
                  <div className="h-32 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-indigo-400" />
                  </div>
                )}
                {reportData && !isLoading && (
                  <>
                    {/* Gráfico de barras simulado con las primeras columnas numéricas */}
                    
                  </>
                )}
              </div>

              {/* — Resultados en tarjetas — */}
              {reportData && !isLoading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                      {reportData.length} resultado{reportData.length !== 1 ? 's' : ''}
                    </p>
                    <button
                      onClick={exportExcel}
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
                    >
                      <FileSpreadsheet size={12} /> Excel
                    </button>
                  </div>
                  <ResultTable data={reportData} />
                </div>
              )}

              {/* — Error — */}
              {reportError && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
                  <p className="text-rose-400 text-sm font-medium">{reportError}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL PREVISUALIZACIÓN (Print / PDF) — compartido mobile+desktop
      ══════════════════════════════════════════════════════════════════ */}
      {showPreviewModal && reportData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex justify-center items-start overflow-y-auto print:overflow-visible print:h-auto p-4 sm:p-8 print:p-0 print:bg-white print:block">
          <div className="w-full max-w-5xl my-auto flex flex-col print:my-0">
            {/* Toolbar */}
            <div className="w-full flex justify-between items-center mb-4 print:hidden shrink-0 pt-6">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <FileText size={20} className="text-indigo-400" />
                {selectedReportName}
              </h3>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  onClick={exportExcel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                >
                  <FileSpreadsheet size={16} /> Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                >
                  <Printer size={16} /> Imprimir / PDF
                </button>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg font-medium text-sm border border-neutral-700"
                >
                  Cerrar
                </button>
              </div>
            </div>

            {/* Documento (papel) */}
            <div className="bg-white text-black w-full rounded-xl shadow-2xl p-8 sm:p-12 print:shadow-none print:p-0 mb-8 shrink-0 min-h-[800px]">
              <div className="border-b-2 border-neutral-200 pb-6 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                  <h1 className="text-3xl font-black uppercase text-neutral-900 tracking-tight">{selectedReportName}</h1>
                  <p className="text-neutral-500 text-sm mt-2">
                    Período: <span className="font-semibold text-neutral-800">{format(sheetStartDate,'dd/MM/yyyy')} - {format(sheetEndDate,'dd/MM/yyyy')}</span>
                  </p>
                  <p className="text-neutral-500 text-sm">
                    Sede: <span className="font-semibold text-neutral-800">{sedeId === 'ALL' ? 'Todas las Sucursales' : sedes.find(s => s.id === sedeId)?.nombre ?? sedeId}</span>
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xl font-black text-indigo-600 tracking-wider">NITEO ERP</p>
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mt-1">Documento Contable</p>
                  <p className="text-xs text-neutral-400 mt-1">{new Date().toLocaleString()}</p>
                </div>
              </div>

              <div className="overflow-x-auto print:overflow-visible print:h-auto rounded-xl border border-neutral-200">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-neutral-100 text-neutral-700 font-bold uppercase text-xs">
                    <tr>
                      {Object.keys(reportData[0] || {}).map(key => (
                        <th key={key} className="px-5 py-4 border-b border-neutral-200">{key.replace(/_/g, ' ')}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {reportData.map((row, i) => (
                      <tr key={i} className="hover:bg-neutral-50">
                        {Object.values(row).map((val: any, j) => (
                          <td key={j} className="px-5 py-4 text-neutral-800 font-medium">
                            {typeof val === 'number' ? val.toLocaleString('en-US', { minimumFractionDigits: 2 }) : val}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {reportData.length === 0 && (
                      <tr><td colSpan={10} className="px-5 py-12 text-center text-neutral-500">Sin datos para este período.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Panel Desktop del reporte seleccionado ──────────────────────────────────

function DesktopReportPanel({
  report, sedes, sedeId, setSedeId,
  sheetStartDate, sheetEndDate, setSheetStartDate, setSheetEndDate,
  sheetDateKey, setSheetPreset,
  isLoading, reportData, reportError,
  categorias, cajeros, clientes, loadingFilters,
  categoriaFilter, setCategoriaFilter,
  cajeroFilter, setCajeroFilter,
  clienteFilter, setClienteFilter,
  onGenerate, onExport, onClose,
}: {
  report: Report;
  sedes: any[]; sedeId: string; setSedeId: (v: string) => void;
  sheetStartDate: Date; sheetEndDate: Date;
  setSheetStartDate: (d: Date) => void; setSheetEndDate: (d: Date) => void;
  sheetDateKey: DateRangeKey; setSheetPreset: (k: DateRangeKey) => void;
  isLoading: boolean; reportData: any[] | null; reportError: string;
  categorias: string[]; cajeros: {id:string;nombre:string}[]; clientes: {id:string;nombre:string}[];
  loadingFilters: boolean;
  categoriaFilter: string; setCategoriaFilter: (v:string)=>void;
  cajeroFilter: string; setCajeroFilter: (v:string)=>void;
  clienteFilter: string; setClienteFilter: (v:string)=>void;
  onGenerate: () => void; onExport: () => void; onClose: () => void;
}) {
  const group = REPORT_CATALOG.find(g => g.reports.some(r => r.id === report.id));
  const Icon  = report.icon;
  const [showCustomDates, setShowCustomDates] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${group?.bgColor ?? 'bg-neutral-800'}`}>
            <Icon size={18} className={group?.color ?? 'text-neutral-400'} />
          </div>
          <div>
            <p className="font-bold text-white">{report.name}</p>
            <p className="text-xs text-neutral-500">{report.desc}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden print:overflow-visible print:h-auto">
        {/* Columna Filtros */}
        <div className="w-72 border-r border-neutral-800 flex flex-col p-5 space-y-5 shrink-0 overflow-y-auto print:overflow-visible print:h-auto">

          {/* Sede */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Sucursal</label>
            <div className="relative">
              <Store size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <select value={sedeId} onChange={e => setSedeId(e.target.value)}
                className="w-full h-12 bg-neutral-900 border border-neutral-800 text-white text-sm pl-9 pr-3 rounded-xl appearance-none focus:outline-none focus:border-indigo-500">
                <option value="ALL">Todas las sedes</option>
                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          </div>

          {/* Filtros extra contextuales */}
          {loadingFilters && (
            <div className="flex items-center gap-2 text-neutral-500 text-xs">
              <Loader2 size={12} className="animate-spin" /> Cargando filtros...
            </div>
          )}
          {!loadingFilters && report.extraFilters?.includes('categoria') && categorias.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Categoría</label>
              <select value={categoriaFilter} onChange={e => setCategoriaFilter(e.target.value)}
                className="w-full h-10 bg-neutral-900 border border-neutral-800 text-white text-sm px-3 rounded-xl appearance-none focus:outline-none focus:border-indigo-500">
                <option value="">Todas las categorías</option>
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          {!loadingFilters && report.extraFilters?.includes('cajero') && cajeros.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Cajero / Empleado</label>
              <select value={cajeroFilter} onChange={e => setCajeroFilter(e.target.value)}
                className="w-full h-10 bg-neutral-900 border border-neutral-800 text-white text-sm px-3 rounded-xl appearance-none focus:outline-none focus:border-indigo-500">
                <option value="">Todos los empleados</option>
                {cajeros.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
              </select>
            </div>
          )}
          {!loadingFilters && report.extraFilters?.includes('cliente') && clientes.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Cliente</label>
              <select value={clienteFilter} onChange={e => setClienteFilter(e.target.value)}
                className="w-full h-10 bg-neutral-900 border border-neutral-800 text-white text-sm px-3 rounded-xl appearance-none focus:outline-none focus:border-indigo-500">
                <option value="">Todos los clientes</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          )}

          {/* Período - píldoras */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Período</label>
            <div className="flex flex-wrap gap-2">
              {DATE_PILLS.map(pill => (
                <button key={pill.key} onClick={() => { setSheetPreset(pill.key); setShowCustomDates(false); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    sheetDateKey === pill.key
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
              <button onClick={() => setShowCustomDates(!showCustomDates)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  showCustomDates ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
                }`}
              >
                Personalizado
              </button>
            </div>
            {showCustomDates && (
              <div className="space-y-2 pt-1">
                <input type="date" value={format(sheetStartDate, 'yyyy-MM-dd')}
                  onChange={e => { const d = new Date(e.target.value + 'T00:00:00'); if (!isNaN(d.getTime())) setSheetStartDate(d); }}
                  className="w-full h-10 bg-neutral-900 border border-neutral-800 text-white text-sm px-3 rounded-xl focus:outline-none focus:border-indigo-500 [color-scheme:dark]" />
                <input type="date" value={format(sheetEndDate, 'yyyy-MM-dd')}
                  onChange={e => { const d = new Date(e.target.value + 'T00:00:00'); if (!isNaN(d.getTime())) setSheetEndDate(d); }}
                  className="w-full h-10 bg-neutral-900 border border-neutral-800 text-white text-sm px-3 rounded-xl focus:outline-none focus:border-indigo-500 [color-scheme:dark]" />
              </div>
            )}
            <p className="text-xs text-neutral-600">{format(sheetStartDate,'dd/MM/yy')} → {format(sheetEndDate,'dd/MM/yy')}</p>
          </div>

          {/* Botón generar */}
          <button onClick={onGenerate} disabled={isLoading}
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl
                       flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(99,102,241,0.25)]">
            {isLoading ? <><Loader2 size={16} className="animate-spin" /> Generando...</> : <><FileText size={16} /> Generar Documento</>}
          </button>

          {reportError && (
            <p className="text-rose-400 text-xs font-medium bg-rose-500/10 rounded-lg p-2 border border-rose-500/20">{reportError}</p>
          )}
        </div>


        {/* Columna Resultados */}
        <div className="flex-1 overflow-y-auto print:overflow-visible print:h-auto custom-scrollbar p-6 space-y-6">
          {!reportData && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-neutral-700 gap-3">
              <BarChart2 size={48} className="opacity-20" />
              <p className="text-sm">Configura los filtros y genera el informe</p>
            </div>
          )}
          {isLoading && (
            <div className="h-full flex items-center justify-center">
              <Loader2 size={32} className="animate-spin text-indigo-400" />
            </div>
          )}
          {reportData && !isLoading && (
            <>
              {/* Mini gráfico */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-neutral-300">Resumen Visual</p>
                  <button onClick={onExport}
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-colors">
                    <FileSpreadsheet size={12} /> Exportar Excel
                  </button>
                </div>
                
              </div>

              {/* Tarjetas de resultados */}
              <div>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
                  {reportData.length} resultado{reportData.length !== 1 ? 's' : ''}
                </p>
                <ResultTable data={reportData} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Mini gráfico de barras (CSS puro, sin librería) ─────────────────────────

function MiniBarChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  // Toma la primera columna numérica como valor a graficar
  const keys = Object.keys(data[0] || {});
  const labelKey = keys[0];
  const valueKey = keys.find(k => typeof data[0][k] === 'number') ?? keys[1];
  if (!valueKey) return null;

  const slice = data.slice(0, 12); // máx 12 barras
  const maxVal = Math.max(...slice.map((r: any) => Number(r[valueKey]) || 0), 1);

  return (
    <div className="space-y-2">
      {slice.map((row: any, i: number) => {
        const val   = Number(row[valueKey]) || 0;
        const pct   = Math.max((val / maxVal) * 100, 2);
        const label = String(row[labelKey] ?? '').substring(0, 24);
        return (
          <div key={i} className="flex items-center gap-3 group">
            <span className="text-xs text-neutral-500 w-32 truncate shrink-0 text-right">{label}</span>
            <div className="flex-1 bg-neutral-800 rounded-full h-5 overflow-hidden print:overflow-visible print:h-auto">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-bold text-neutral-300 w-16 text-right shrink-0">
              {typeof val === 'number' ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : val}
            </span>
          </div>
        );
      })}
      {data.length > 12 && (
        <p className="text-xs text-neutral-600 text-center pt-1">+{data.length - 12} más en el reporte completo</p>
      )}
    </div>
  );
}

// ─── Tarjetas de resultados ───────────────────────────────────────────────────

function ResultCards({ data }: { data: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT   = 8;
  const visible = expanded ? data : data.slice(0, LIMIT);
  const keys    = Object.keys(data[0] || {});

  return (
    <div className="space-y-2">
      {visible.map((row, i) => (
        <div key={i} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-colors">
          {/* Primera columna como título de la tarjeta */}
          <p className="text-sm font-semibold text-neutral-200 mb-2 truncate">{String(row[keys[0]] ?? '—')}</p>
          {/* Resto de columnas como pares clave-valor */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {keys.slice(1).map(k => (
              <div key={k} className="flex items-center gap-1">
                <span className="text-xs text-neutral-600">{k.replace(/_/g, ' ')}:</span>
                <span className="text-xs font-bold text-neutral-300">
                  {typeof row[k] === 'number'
                    ? row[k].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : String(row[k] ?? '—')}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
      {data.length > LIMIT && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-3 text-xs font-semibold text-neutral-500 hover:text-white border border-dashed border-neutral-800 rounded-xl transition-colors"
        >
          {expanded ? 'Mostrar menos' : `Ver todos (${data.length - LIMIT} más)`}
        </button>
      )}
    </div>
  );
}

function ResultTable({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;
  const keys = Object.keys(data[0]);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl relative w-full">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-neutral-400 uppercase bg-neutral-950/50 border-b border-neutral-800">
            <tr>
              {keys.map((key, i) => (
                <th key={key} className={`px-6 py-4 font-bold ${i === 0 ? 'sticky left-0 bg-neutral-950 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]' : ''}`}>
                  {key.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/50">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-neutral-800/30 transition-colors">
                {keys.map((key, i) => {
                  const val = row[key];
                  const isNumber = typeof val === 'number';
                  return (
                    <td key={key} className={`px-6 py-3 ${i === 0 ? 'font-medium text-white whitespace-nowrap sticky left-0 bg-neutral-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] z-10' : 'text-neutral-300'}`}>
                      {isNumber ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(val ?? '')}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
