'use client';

import React, { useOptimistic, useTransition, useState, useMemo } from 'react';
import { createInsumo, deleteInsumo, ajustarInventarioBatch } from './actions';
import {
  PackageOpen, Plus, Trash2, Loader2, AlertCircle, FileText,
  Save, X, Edit3, DollarSign, Boxes,
  ArrowUpCircle, ArrowDownCircle, History, BarChart3, ChevronDown, ChevronUp,
  PackageSearch, Activity, Download, Calendar, Lock,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  format, subDays, subWeeks, subMonths, subYears,
  parseISO, startOfDay, startOfWeek, startOfMonth, startOfYear,
  isWithinInterval, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
  addDays, addWeeks, addMonths, endOfDay, endOfWeek, endOfMonth,
} from 'date-fns';
import { es } from 'date-fns/locale';

type Insumo = {
  id: string;
  nombre: string;
  unidad_medida: string;
  costo_promedio: number;
  cantidad_actual: number;
  empresa_id?: string;
  sede_id?: string;
  isOptimistic?: boolean;
};

type Movimiento = {
  id: string;
  empresa_id: string;
  insumo_id: string;
  usuario_id: string;
  tipo_movimiento: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  motivo: string;
  cantidad: number;
  costo_perdido: number;
  fecha_movimiento: string;
  insumo_nombre: string;
  insumo_unidad: string;
  operador_nombre: string;
};

type PeriodType = 'dias' | 'semanas' | 'meses' | 'años';
type ExportPeriodType = 'dia' | 'semana' | 'mes';

const MOTIVO_LABELS: Record<string, string> = {
  'AJUSTE_INVENTARIO': 'Ajuste de Existencias',
  'STOCK_INICIAL': 'Stock Inicial',
  'COMPRA': 'Compra de Insumos',
  'VENTA POS': 'Venta POS',
  'MERMA': 'Merma / Pérdida',
  'TRANSFORMACION': 'Transformación',
};

function getMotivoLabel(motivo: string) {
  return MOTIVO_LABELS[motivo] || motivo;
}

function getTipoColor(tipo: string) {
  return tipo === 'ENTRADA'
    ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
    : 'text-rose-400 bg-rose-400/10 border-rose-400/20';
}

function buildChartData(movimientos: Movimiento[], insumos: Insumo[], period: PeriodType) {
  const now = new Date();
  type ChartPoint = { label: string; valor: number; date: Date };
  const points: ChartPoint[] = [];
  let count: number;
  let fmt: string;
  let stepFn: (d: Date, n: number) => Date;
  let truncFn: (d: Date) => Date;

  switch (period) {
    case 'dias':   count = 14; fmt = 'dd MMM'; stepFn = subDays;   truncFn = startOfDay;   break;
    case 'semanas':count = 12; fmt = "dd/MM"; stepFn = subWeeks;  truncFn = startOfWeek;  break;
    case 'meses':  count = 12; fmt = 'MMM yy'; stepFn = subMonths; truncFn = startOfMonth; break;
    case 'años':   count = 5;  fmt = 'yyyy';   stepFn = subYears;  truncFn = startOfYear;  break;
  }

  const currentValue = insumos.reduce((s, i) => s + i.costo_promedio * i.cantidad_actual, 0);
  let reconstructedValue = currentValue;

  for (let i = 0; i < count; i++) {
    const pointDate = truncFn(stepFn(now, i));
    const nextDate = i === 0 ? now : truncFn(stepFn(now, i - 1));
    const movsInPeriod = movimientos.filter(m => {
      const d = parseISO(m.fecha_movimiento);
      return d >= pointDate && d < nextDate;
    });
    if (i > 0) {
      movsInPeriod.forEach(m => {
        const unitCost = insumos.find(ins => ins.id === m.insumo_id)?.costo_promedio || 0;
        const val = m.cantidad * unitCost;
        if (m.tipo_movimiento === 'ENTRADA') reconstructedValue -= val;
        else reconstructedValue += val;
      });
    }
    points.unshift({
      label: format(pointDate, fmt, { locale: es }),
      valor: Math.max(0, parseFloat(reconstructedValue.toFixed(2))),
      date: pointDate,
    });
  }
  return points;
}

// ── Export helpers ────────────────────────────────────────────────────────────
function buildExportRows(
  movimientos: Movimiento[],
  insumos: Insumo[],
  desde: Date,
  hasta: Date,
  breakdown: ExportPeriodType
) {
  // Filter movimientos in range
  const filtered = movimientos.filter(m => {
    const d = parseISO(m.fecha_movimiento);
    return d >= desde && d <= hasta;
  });

  // Group by period
  type Row = { periodo: string; entradas: number; salidas: number; neto: number; valorFinal: number };
  const rows: Row[] = [];

  if (breakdown === 'dia') {
    const days = eachDayOfInterval({ start: desde, end: hasta });
    days.forEach(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const dayMovs = filtered.filter(m => {
        const d = parseISO(m.fecha_movimiento);
        return d >= dayStart && d <= dayEnd;
      });
      const entradas = dayMovs.filter(m => m.tipo_movimiento === 'ENTRADA').reduce((s, m) => {
        return s + m.cantidad * (insumos.find(i => i.id === m.insumo_id)?.costo_promedio || 0);
      }, 0);
      const salidas = dayMovs.filter(m => m.tipo_movimiento === 'SALIDA').reduce((s, m) => {
        return s + m.cantidad * (insumos.find(i => i.id === m.insumo_id)?.costo_promedio || 0);
      }, 0);
      rows.push({ periodo: format(day, 'dd/MM/yyyy', { locale: es }), entradas, salidas, neto: entradas - salidas, valorFinal: 0 });
    });
  } else if (breakdown === 'semana') {
    const weeks = eachWeekOfInterval({ start: desde, end: hasta }, { locale: es });
    weeks.forEach(weekStart => {
      const weekEnd = endOfWeek(weekStart, { locale: es });
      const weekMovs = filtered.filter(m => {
        const d = parseISO(m.fecha_movimiento);
        return d >= weekStart && d <= weekEnd;
      });
      const entradas = weekMovs.filter(m => m.tipo_movimiento === 'ENTRADA').reduce((s, m) => {
        return s + m.cantidad * (insumos.find(i => i.id === m.insumo_id)?.costo_promedio || 0);
      }, 0);
      const salidas = weekMovs.filter(m => m.tipo_movimiento === 'SALIDA').reduce((s, m) => {
        return s + m.cantidad * (insumos.find(i => i.id === m.insumo_id)?.costo_promedio || 0);
      }, 0);
      rows.push({
        periodo: `${format(weekStart, 'dd/MM', { locale: es })} – ${format(weekEnd, 'dd/MM/yyyy', { locale: es })}`,
        entradas, salidas, neto: entradas - salidas, valorFinal: 0,
      });
    });
  } else {
    const months = eachMonthOfInterval({ start: desde, end: hasta });
    months.forEach(monthStart => {
      const monthEnd = endOfMonth(monthStart);
      const monthMovs = filtered.filter(m => {
        const d = parseISO(m.fecha_movimiento);
        return d >= monthStart && d <= monthEnd;
      });
      const entradas = monthMovs.filter(m => m.tipo_movimiento === 'ENTRADA').reduce((s, m) => {
        return s + m.cantidad * (insumos.find(i => i.id === m.insumo_id)?.costo_promedio || 0);
      }, 0);
      const salidas = monthMovs.filter(m => m.tipo_movimiento === 'SALIDA').reduce((s, m) => {
        return s + m.cantidad * (insumos.find(i => i.id === m.insumo_id)?.costo_promedio || 0);
      }, 0);
      rows.push({
        periodo: format(monthStart, 'MMMM yyyy', { locale: es }),
        entradas, salidas, neto: entradas - salidas, valorFinal: 0,
      });
    });
  }

  // Calculate running inventory value
  const startValue = insumos.reduce((s, i) => s + i.costo_promedio * i.cantidad_actual, 0);
  let runningVal = startValue;
  for (let i = rows.length - 1; i >= 0; i--) {
    rows[i].valorFinal = Math.max(0, runningVal);
    runningVal -= rows[i].neto;
  }

  return rows;
}

// ── Export to XLSX ─────────────────────────────────────────────────────────────
async function exportExcel(
  movimientos: Movimiento[], insumos: Insumo[],
  desde: Date, hasta: Date, breakdown: ExportPeriodType
) {
  const XLSX = await import('xlsx');
  const rows = buildExportRows(movimientos, insumos, desde, hasta, breakdown);
  const data = rows.map(r => ({
    'Período': r.periodo,
    'Entradas (USD)': parseFloat(r.entradas.toFixed(2)),
    'Salidas (USD)': parseFloat(r.salidas.toFixed(2)),
    'Neto (USD)': parseFloat(r.neto.toFixed(2)),
    'Valor Inventario (USD)': parseFloat(r.valorFinal.toFixed(2)),
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 22 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
  // Also add raw movements sheet
  const rawData = movimientos
    .filter(m => {
      const d = parseISO(m.fecha_movimiento);
      return d >= desde && d <= hasta;
    })
    .map(m => ({
      'Fecha': format(parseISO(m.fecha_movimiento), 'dd/MM/yyyy HH:mm', { locale: es }),
      'Insumo': m.insumo_nombre,
      'Tipo': m.tipo_movimiento,
      'Motivo': getMotivoLabel(m.motivo),
      'Cantidad': m.cantidad,
      'Unidad': m.insumo_unidad,
      'Operador': m.operador_nombre,
    }));
  const wsRaw = XLSX.utils.json_to_sheet(rawData);
  wsRaw['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 10 }, { wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsRaw, 'Movimientos Detalle');
  XLSX.writeFile(wb, `Inventario_${format(desde, 'yyyyMMdd')}_${format(hasta, 'yyyyMMdd')}.xlsx`);
}

// ── Export to PDF ──────────────────────────────────────────────────────────────
function exportPDF(
  movimientos: Movimiento[], insumos: Insumo[],
  desde: Date, hasta: Date, breakdown: ExportPeriodType
) {
  const rows = buildExportRows(movimientos, insumos, desde, hasta, breakdown);
  const totalEntradas = rows.reduce((s, r) => s + r.entradas, 0);
  const totalSalidas = rows.reduce((s, r) => s + r.salidas, 0);

  let tableHtml = rows.map(r => `
    <tr>
      <td>${r.periodo}</td>
      <td class="green">$${r.entradas.toFixed(2)}</td>
      <td class="red">$${r.salidas.toFixed(2)}</td>
      <td class="${r.neto >= 0 ? 'green' : 'red'}">${r.neto >= 0 ? '+' : ''}$${r.neto.toFixed(2)}</td>
      <td class="bold">$${r.valorFinal.toFixed(2)}</td>
    </tr>`).join('');

  const html = `<html><head><title>Reporte de Inventario</title><style>
    body{font-family:sans-serif;padding:24px;color:#111}
    h1{font-size:20px;margin-bottom:4px}
    p.sub{color:#555;font-size:12px;margin-bottom:20px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border:1px solid #ddd;padding:8px;text-align:left}
    th{background:#f5f5f5;font-weight:600}
    tfoot td{background:#f9f9f9;font-weight:700}
    .green{color:#16a34a}.red{color:#dc2626}.bold{font-weight:700}
    @media print{body{padding:0}}
  </style></head><body onload="window.print()">
    <h1>Resumen de Inventario</h1>
    <p class="sub">
      Período: ${format(desde, 'dd/MM/yyyy', { locale: es })} → ${format(hasta, 'dd/MM/yyyy', { locale: es })}
      &nbsp;|&nbsp; Desglose por ${breakdown === 'dia' ? 'Día' : breakdown === 'semana' ? 'Semana' : 'Mes'}
      &nbsp;|&nbsp; Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}
    </p>
    <table>
      <thead><tr><th>Período</th><th>Entradas (USD)</th><th>Salidas (USD)</th><th>Neto (USD)</th><th>Valor Inventario (USD)</th></tr></thead>
      <tbody>${tableHtml}</tbody>
      <tfoot><tr>
        <td>TOTALES</td>
        <td class="green">$${totalEntradas.toFixed(2)}</td>
        <td class="red">$${totalSalidas.toFixed(2)}</td>
        <td class="${totalEntradas - totalSalidas >= 0 ? 'green' : 'red'}">${totalEntradas - totalSalidas >= 0 ? '+' : ''}$${(totalEntradas - totalSalidas).toFixed(2)}</td>
        <td></td>
      </tr></tfoot>
    </table>
  </body></html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function InsumosManager({
  initialInsumos,
  empresaId,
  sedeId,
  initialMovimientos = [],
  canSeeCosts = false,
}: {
  initialInsumos: Insumo[];
  empresaId: string;
  sedeId: string;
  initialMovimientos?: Movimiento[];
  canSeeCosts?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  // Form state
  const [nombre, setNombre] = useState('');
  const [unidad, setUnidad] = useState('Kg');
  const [costo, setCosto] = useState('');
  const [stock, setStock] = useState('');

  // Internal tab
  const [activeTab, setActiveTab] = useState<'inventario' | 'movimientos'>('inventario');

  // Chart period
  const [period, setPeriod] = useState<PeriodType>('meses');

  // Movimientos filters
  const [filterTipo, setFilterTipo] = useState<'TODOS' | 'ENTRADA' | 'SALIDA'>('TODOS');
  const [filterMotivo, setFilterMotivo] = useState<string>('TODOS');
  const [expandedMov, setExpandedMov] = useState<string | null>(null);

  // Adjust modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustData, setAdjustData] = useState<Record<string, string>>({});
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Export modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'pdf'>('xlsx');
  const [exportDesde, setExportDesde] = useState(() => format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [exportHasta, setExportHasta] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [exportBreakdown, setExportBreakdown] = useState<ExportPeriodType>('mes');
  const [isExporting, setIsExporting] = useState(false);

  // Insumo Details Drawer
  const [selectedInsumo, setSelectedInsumo] = useState<Insumo | null>(null);
  const [insumoHistorial, setInsumoHistorial] = useState<any[]>([]);
  const [isLoadingHistorial, setIsLoadingHistorial] = useState(false);

  // Optimistic UI
  const [optimisticInsumos, addOptimisticInsumo] = useOptimistic(
    initialInsumos,
    (state, action: { type: 'add' | 'delete' | 'update'; payload: any }) => {
      if (action.type === 'add') return [{ ...action.payload, id: Math.random().toString(), isOptimistic: true }, ...state];
      if (action.type === 'delete') return state.filter(i => i.id !== action.payload);
      if (action.type === 'update') return state.map(i => {
        const adj = action.payload.find((a: any) => a.id === i.id);
        return adj ? { ...i, cantidad_actual: adj.cantidad_actual } : i;
      });
      return state;
    }
  );

  // ── Metrics ─────────────────────────────────────────────────────────────────
  const totalValue = useMemo(
    () => optimisticInsumos.reduce((s, i) => s + i.costo_promedio * i.cantidad_actual, 0),
    [optimisticInsumos]
  );
  const topInsumo = useMemo(
    () => optimisticInsumos.reduce<Insumo | null>((top, i) => {
      const v = i.costo_promedio * i.cantidad_actual;
      const topV = top ? top.costo_promedio * top.cantidad_actual : -1;
      return v > topV ? i : top;
    }, null),
    [optimisticInsumos]
  );
  const chartData = useMemo(
    () => buildChartData(initialMovimientos, optimisticInsumos, period),
    [initialMovimientos, optimisticInsumos, period]
  );
  const allMotivos = useMemo(() => {
    const set = new Set(initialMovimientos.map(m => m.motivo));
    return ['TODOS', ...Array.from(set)];
  }, [initialMovimientos]);
  const filteredMovimientos = useMemo(() => initialMovimientos.filter(m => {
    const tipoOk = filterTipo === 'TODOS' || m.tipo_movimiento === filterTipo;
    const motivoOk = filterMotivo === 'TODOS' || m.motivo === filterMotivo;
    return tipoOk && motivoOk;
  }), [initialMovimientos, filterTipo, filterMotivo]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !costo || !stock) return;
    setError('');
    const newInsumo = { empresa_id: empresaId, nombre, unidad_medida: unidad, costo_promedio: parseFloat(costo), cantidad_actual: parseFloat(stock) };
    setNombre(''); setCosto(''); setStock('');
    startTransition(async () => {
      addOptimisticInsumo({ type: 'add', payload: newInsumo });
      const res = await createInsumo(empresaId, sedeId, newInsumo.nombre, newInsumo.unidad_medida, newInsumo.costo_promedio, newInsumo.cantidad_actual);
      if (!res.success) setError(res.error || 'Error desconocido');
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este insumo?')) return;
    startTransition(async () => {
      addOptimisticInsumo({ type: 'delete', payload: id });
      const res = await deleteInsumo(id);
      if (!res.success) alert(res.error);
    });
  };

  const openAdjustModal = () => {
    const data: Record<string, string> = {};
    optimisticInsumos.forEach(i => { data[i.id] = i.cantidad_actual.toString(); });
    setAdjustData(data);
    setShowAdjustModal(true);
  };

  const handleSaveAdjustments = async () => {
    const changes: { id: string; cantidad_actual: number; cantidad_anterior: number }[] = [];
    optimisticInsumos.forEach(i => {
      const newVal = parseFloat(adjustData[i.id]);
      if (!isNaN(newVal) && newVal !== i.cantidad_actual) {
        changes.push({ id: i.id, cantidad_actual: newVal, cantidad_anterior: i.cantidad_actual });
      }
    });
    if (changes.length === 0) { setShowAdjustModal(false); return; }
    setIsAdjusting(true);
    startTransition(async () => {
      addOptimisticInsumo({ type: 'update', payload: changes });
      const res = await ajustarInventarioBatch(empresaId, sedeId, changes);
      setIsAdjusting(false);
      if (res.success) setShowAdjustModal(false);
      else alert('Hubo un error al ajustar existencias');
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const desde = startOfDay(new Date(exportDesde + 'T00:00:00'));
      const hasta = endOfDay(new Date(exportHasta + 'T00:00:00'));
      if (exportFormat === 'xlsx') {
        await exportExcel(initialMovimientos, optimisticInsumos, desde, hasta, exportBreakdown);
      } else {
        exportPDF(initialMovimientos, optimisticInsumos, desde, hasta, exportBreakdown);
      }
      setShowExportModal(false);
    } finally {
      setIsExporting(false);
    }
  };

  const handleInsumoClick = async (insumo: Insumo) => {
    setSelectedInsumo(insumo);
    setIsLoadingHistorial(true);
    setInsumoHistorial([]);
    
    // Import dynamically so we don't break existing imports if they're grouped
    const { getHistorialInsumo } = await import('./actions');
    const history = await getHistorialInsumo(insumo.id);
    setInsumoHistorial(history);
    setIsLoadingHistorial(false);
  };

  // ── Custom Tooltip ──────────────────────────────────────────────────────────
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 shadow-xl">
          <p className="text-neutral-400 text-xs mb-1">{label}</p>
          <p className="text-white font-bold text-sm">${payload[0].value.toFixed(2)} USD</p>
        </div>
      );
    }
    return null;
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <PackageOpen className="text-emerald-400" /> Control de Insumos Base
        </h2>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          {canSeeCosts && (
            <button
              onClick={() => setShowExportModal(true)}
              className="bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Download size={16} /> Exportar
            </button>
          )}
          <button
            onClick={openAdjustModal}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap shadow-lg shadow-indigo-900/30"
          >
            <Edit3 size={16} /> Ajustar Existencias
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS — solo con acceso financiero */}
      {canSeeCosts && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-gradient-to-br from-indigo-950/70 to-neutral-900 border border-indigo-500/30 rounded-3xl p-6 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-indigo-300 text-sm font-medium mb-1 flex items-center gap-1.5">
                <DollarSign size={14} /> Valor del Inventario
              </p>
              <p className="text-4xl font-black text-white tracking-tight">
                ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-indigo-400 text-lg ml-2">USD</span>
              </p>
              <p className="text-neutral-500 text-xs mt-2">Suma de (costo prom. × existencias) de todos los insumos</p>
            </div>
            <div className="hidden md:flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
              <BarChart3 size={36} className="text-indigo-400" />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Boxes size={18} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-neutral-500 text-xs">Tipos de Insumos</p>
                <p className="text-white font-bold text-xl">{optimisticInsumos.length}</p>
              </div>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <PackageSearch size={18} className="text-amber-400" />
              </div>
              <div className="overflow-hidden">
                <p className="text-neutral-500 text-xs">Mayor Valor en Stock</p>
                <p className="text-white font-bold text-sm truncate">{topInsumo?.nombre || '—'}</p>
                {topInsumo && <p className="text-amber-400 text-xs">${(topInsumo.costo_promedio * topInsumo.cantidad_actual).toFixed(2)}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EVOLUTION CHART — solo con acceso financiero */}
      {canSeeCosts && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Activity size={16} className="text-indigo-400" /> Evolución del Valor del Inventario
            </h3>
            <div className="flex gap-1">
              {(['dias', 'semanas', 'meses', 'años'] as PeriodType[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${period === p ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="label" tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="valor" stroke="#6366f1" strokeWidth={2} fill="url(#colorValor)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* INTERNAL TABS */}
      <div className="flex gap-1 border-b border-neutral-800">
        <button onClick={() => setActiveTab('inventario')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'inventario' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}>
          <Boxes size={15} /> Inventario
        </button>
        {canSeeCosts && (
          <button onClick={() => setActiveTab('movimientos')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'movimientos' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}>
            <History size={15} /> Movimientos
            {initialMovimientos.length > 0 && (
              <span className="bg-neutral-700 text-neutral-300 text-xs px-1.5 py-0.5 rounded-full">{initialMovimientos.length}</span>
            )}
          </button>
        )}
      </div>

      {/* ── INVENTARIO TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'inventario' && (
        <>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">Registrar Nuevo Insumo</p>
            <form onSubmit={handleCreate} className="flex flex-col lg:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-neutral-500 mb-1.5 uppercase tracking-wider">Nombre del Insumo / Materia Prima</label>
                <input required type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Harina de Trigo, Queso Mozzarella..."
                  className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              </div>
              <div className="w-full lg:w-48">
                <label className="block text-xs font-medium text-neutral-500 mb-1.5 uppercase tracking-wider">Unidad de Medida</label>
                <select value={unidad} onChange={e => setUnidad(e.target.value)}
                  className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none">
                  <option value="Kg">Kilogramos (Kg)</option>
                  <option value="Gr">Gramos (Gr)</option>
                  <option value="Lt">Litros (Lt)</option>
                  <option value="Ml">Mililitros (Ml)</option>
                  <option value="Und">Unidades (Und)</option>
                  <option value="Cajas">Cajas</option>
                  <option value="Paquetes">Paquetes</option>
                </select>
              </div>
              <div className="w-full lg:w-32">
                <label className="block text-xs font-medium text-neutral-500 mb-1.5 uppercase tracking-wider">Existencia Base</label>
                <input required type="number" step="any" min="0" value={stock} onChange={e => setStock(e.target.value)}
                  placeholder="0.00" className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              </div>
              {canSeeCosts && (
                <div className="w-full lg:w-32">
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5 uppercase tracking-wider">Costo (USD)</label>
                  <input required type="number" step="any" min="0" value={costo} onChange={e => setCosto(e.target.value)}
                    placeholder="0.00" className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
              )}
              <button type="submit" disabled={isPending}
                className="w-full lg:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-6 rounded-xl transition-colors shadow-lg shadow-emerald-900/20 flex justify-center items-center gap-2 self-end">
                {isPending ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />} Registrar
              </button>
            </form>
            {error && (
              <div className="mt-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
                <AlertCircle size={16} /> {error}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-black/40 border-b border-neutral-800 text-neutral-400">
                    <th className="py-4 px-6 font-medium">Insumo / Materia Prima</th>
                    <th className="py-4 px-6 font-medium">Unidad</th>
                    {canSeeCosts && <th className="py-4 px-6 font-medium">Costo Promedio</th>}
                    <th className="py-4 px-6 font-medium">Existencia Actual</th>
                    {canSeeCosts && <th className="py-4 px-6 font-medium text-right">Valor Total (USD)</th>}
                    <th className="py-4 px-6 text-center w-[80px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50">
                  {optimisticInsumos.length === 0 ? (
                    <tr><td colSpan={canSeeCosts ? 6 : 4} className="py-12 text-center text-neutral-500">No hay insumos registrados. Agrega el primero arriba.</td></tr>
                  ) : optimisticInsumos.map(insumo => {
                    const valorTotal = insumo.costo_promedio * insumo.cantidad_actual;
                    return (
                      <tr key={insumo.id} onClick={() => handleInsumoClick(insumo)} className="hover:bg-white/5 transition-colors text-neutral-300 cursor-pointer group">
                        <td className="py-4 px-6 font-medium text-neutral-200 group-hover:text-indigo-400 transition-colors">
                          {insumo.nombre}
                          {insumo.isOptimistic && <span className="ml-2 text-xs text-emerald-400 opacity-70">(Guardando...)</span>}
                        </td>
                        <td className="py-4 px-6">
                          <span className="bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded-md text-xs font-medium border border-neutral-700">{insumo.unidad_medida}</span>
                        </td>
                        {canSeeCosts && (
                          <td className="py-4 px-6 font-mono text-sm text-neutral-300">${insumo.costo_promedio.toFixed(4)}</td>
                        )}
                        <td className="py-4 px-6 font-bold text-white">{insumo.cantidad_actual}</td>
                        {canSeeCosts && (
                          <td className="py-4 px-6 text-right">
                            <span className={`font-semibold ${valorTotal > 0 ? 'text-emerald-400' : 'text-neutral-500'}`}>${valorTotal.toFixed(2)}</span>
                          </td>
                        )}
                        <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => handleDelete(insumo.id)} disabled={insumo.isOptimistic}
                            className="text-neutral-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors disabled:opacity-50">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {canSeeCosts && optimisticInsumos.length > 0 && (
                  <tfoot className="border-t border-neutral-800 bg-black/30">
                    <tr>
                      <td colSpan={4} className="py-3 px-6 text-right text-neutral-400 font-medium">Total del Inventario:</td>
                      <td className="py-3 px-6 text-right font-black text-white text-base">${totalValue.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── MOVIMIENTOS TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'movimientos' && canSeeCosts && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-xl p-1">
              {(['TODOS', 'ENTRADA', 'SALIDA'] as const).map(t => (
                <button key={t} onClick={() => setFilterTipo(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterTipo === t
                    ? t === 'ENTRADA' ? 'bg-emerald-600 text-white' : t === 'SALIDA' ? 'bg-rose-600 text-white' : 'bg-neutral-700 text-white'
                    : 'text-neutral-400 hover:text-white'}`}>
                  {t === 'TODOS' ? 'Todos' : t === 'ENTRADA' ? '↑ Entradas' : '↓ Salidas'}
                </button>
              ))}
            </div>
            <select value={filterMotivo} onChange={e => setFilterMotivo(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500">
              {allMotivos.map(m => <option key={m} value={m}>{m === 'TODOS' ? 'Todos los motivos' : getMotivoLabel(m)}</option>)}
            </select>
            <span className="text-neutral-500 text-xs ml-auto">{filteredMovimientos.length} registros</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
            {filteredMovimientos.length === 0 ? (
              <div className="py-16 text-center text-neutral-500">
                <History size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No hay movimientos con estos filtros</p>
                <p className="text-xs mt-1 text-neutral-600">Los ajustes, compras y ventas aparecerán aquí automáticamente</p>
              </div>
            ) : filteredMovimientos.map(mov => {
              const isEntrada = mov.tipo_movimiento === 'ENTRADA';
              const isExpanded = expandedMov === mov.id;
              return (
                <div key={mov.id} className="border-b border-neutral-800/60 last:border-0">
                  <button onClick={() => setExpandedMov(isExpanded ? null : mov.id)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors text-left">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isEntrada ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                        {isEntrada ? <ArrowUpCircle size={16} className="text-emerald-400" /> : <ArrowDownCircle size={16} className="text-rose-400" />}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{mov.insumo_nombre}</p>
                        <p className="text-neutral-500 text-xs">{getMotivoLabel(mov.motivo)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className={`text-sm font-bold hidden sm:block ${isEntrada ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isEntrada ? '+' : '-'}{mov.cantidad} {mov.insumo_unidad}
                      </span>
                      <span className="text-neutral-500 text-xs hidden md:block">
                        {format(parseISO(mov.fecha_movimiento), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </span>
                      {isExpanded ? <ChevronUp size={16} className="text-neutral-500 shrink-0" /> : <ChevronDown size={16} className="text-neutral-500 shrink-0" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-4 pt-1 bg-black/20 border-t border-neutral-800/50">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-neutral-500 text-xs">Fecha y Hora</p>
                          <p className="text-white">{format(parseISO(mov.fecha_movimiento), 'dd MMM yyyy, HH:mm', { locale: es })}</p>
                        </div>
                        <div>
                          <p className="text-neutral-500 text-xs">Tipo</p>
                          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${getTipoColor(mov.tipo_movimiento)}`}>{mov.tipo_movimiento}</span>
                        </div>
                        <div>
                          <p className="text-neutral-500 text-xs">Cantidad</p>
                          <p className={`font-bold ${isEntrada ? 'text-emerald-400' : 'text-rose-400'}`}>{isEntrada ? '+' : '-'}{mov.cantidad} {mov.insumo_unidad}</p>
                        </div>
                        <div>
                          <p className="text-neutral-500 text-xs">Operador</p>
                          <p className="text-white">{mov.operador_nombre}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ADJUST MODAL ─────────────────────────────────────────────────────── */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[90vh] flex flex-col">
            <button onClick={() => setShowAdjustModal(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"><X size={20} /></button>
            <h2 className="text-xl font-black text-white mb-1 flex items-center gap-2"><Edit3 className="text-indigo-400" /> Ajustar Existencias Físicas</h2>
            <p className="text-sm text-neutral-400 mb-6">Actualiza las cantidades reales. El sistema registrará la diferencia automáticamente en el historial.</p>
            <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar space-y-3">
              {optimisticInsumos.map(insumo => (
                <div key={insumo.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">{insumo.nombre}</p>
                    <p className="text-xs text-neutral-500">
                      {insumo.unidad_medida} | Sistema: {insumo.cantidad_actual}
                      {adjustData[insumo.id] && parseFloat(adjustData[insumo.id]) !== insumo.cantidad_actual && (
                        <span className={`ml-2 font-medium ${parseFloat(adjustData[insumo.id]) > insumo.cantidad_actual ? 'text-emerald-400' : 'text-rose-400'}`}>
                          → {adjustData[insumo.id]} ({parseFloat(adjustData[insumo.id]) > insumo.cantidad_actual ? '+' : ''}{(parseFloat(adjustData[insumo.id]) - insumo.cantidad_actual).toFixed(2)})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="w-full sm:w-32 shrink-0">
                    <input type="number" step="any"
                      value={adjustData[insumo.id] || ''}
                      onChange={e => setAdjustData(prev => ({ ...prev, [insumo.id]: e.target.value }))}
                      className="w-full bg-indigo-900/20 border border-indigo-500/30 text-white rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-neutral-800">
              <button onClick={() => setShowAdjustModal(false)} className="px-5 py-2.5 text-sm font-medium text-neutral-300 hover:text-white transition-colors">Cancelar</button>
              <button onClick={handleSaveAdjustments} disabled={isAdjusting} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2">
                {isAdjusting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar Ajustes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EXPORT MODAL ─────────────────────────────────────────────────────── */}
      {showExportModal && canSeeCosts && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><Download className="text-indigo-400" size={18} /> Exportar Reporte</h2>
              <button onClick={() => setShowExportModal(false)} className="text-neutral-500 hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-5">
              {/* Format */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Formato</label>
                <div className="grid grid-cols-2 gap-2">
                  {([['xlsx', 'Excel (.xlsx)', '📊'], ['pdf', 'PDF (Impresión)', '📄']] as const).map(([val, lbl, icon]) => (
                    <button key={val} onClick={() => setExportFormat(val)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${exportFormat === val ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'}`}>
                      <span>{icon}</span> {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date range */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Calendar size={12} /> Rango de Fechas</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">Desde</label>
                    <input type="date" value={exportDesde} onChange={e => setExportDesde(e.target.value)}
                      className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">Hasta</label>
                    <input type="date" value={exportHasta} onChange={e => setExportHasta(e.target.value)}
                      className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 [color-scheme:dark]" />
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Desglose por</label>
                <div className="grid grid-cols-3 gap-2">
                  {([['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes']] as const).map(([val, lbl]) => (
                    <button key={val} onClick={() => setExportBreakdown(val)}
                      className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${exportBreakdown === val ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'}`}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-neutral-800">
              <button onClick={() => setShowExportModal(false)} className="px-5 py-2.5 text-sm text-neutral-300 hover:text-white">Cancelar</button>
              <button onClick={handleExport} disabled={isExporting}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50">
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {exportFormat === 'xlsx' ? 'Descargar Excel' : 'Generar PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INSUMO DRAWER (HISTORIAL INDIVIDUAL) ───────────────────────────── */}
      {selectedInsumo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex justify-end transition-opacity animate-in fade-in">
          <div className="w-full max-w-4xl bg-neutral-900 h-full shadow-2xl flex flex-col border-l border-neutral-800 animate-in slide-in-from-right duration-300">
            {/* Header del Drawer */}
            <div className="px-6 py-5 border-b border-neutral-800 flex justify-between items-start bg-neutral-950/50">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex justify-center items-center">
                    <PackageOpen size={20} className="text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedInsumo.nombre}</h2>
                    <p className="text-neutral-500 text-sm font-medium">Unidad de medida: <span className="text-neutral-300">{selectedInsumo.unidad_medida}</span></p>
                  </div>
                </div>
                
                <div className="flex gap-6 mt-5 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-xs text-neutral-500 font-medium">Existencia Actual</p>
                    <p className="text-lg font-bold text-white">{selectedInsumo.cantidad_actual} <span className="text-sm font-normal text-neutral-400">{selectedInsumo.unidad_medida}</span></p>
                  </div>
                  {canSeeCosts && (
                    <>
                      <div className="w-px bg-neutral-800"></div>
                      <div>
                        <p className="text-xs text-neutral-500 font-medium">Costo Promedio</p>
                        <p className="text-lg font-bold text-indigo-400">${selectedInsumo.costo_promedio.toFixed(4)}</p>
                      </div>
                      <div className="w-px bg-neutral-800"></div>
                      <div>
                        <p className="text-xs text-neutral-500 font-medium">Valor Total del Stock</p>
                        <p className="text-lg font-bold text-emerald-400">${(selectedInsumo.costo_promedio * selectedInsumo.cantidad_actual).toFixed(2)}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedInsumo(null)} className="text-neutral-500 hover:text-white bg-neutral-800/50 hover:bg-neutral-800 p-2 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Contenido (Tabla de historial) */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                <History size={16} className="text-neutral-400" /> Historial de Movimientos
              </h3>

              {isLoadingHistorial ? (
                <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
                  <Loader2 size={32} className="animate-spin mb-3 text-indigo-500" />
                  <p>Cargando historial...</p>
                </div>
              ) : insumoHistorial.length === 0 ? (
                <div className="text-center py-16 bg-neutral-950 rounded-xl border border-neutral-800 border-dashed">
                  <FileText size={32} className="mx-auto text-neutral-600 mb-3" />
                  <p className="text-neutral-400 font-medium">No hay movimientos registrados</p>
                </div>
              ) : (
                <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-neutral-900 text-neutral-400 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Tipo de documento</th>
                        <th className="px-4 py-3 font-semibold">Fecha</th>
                        <th className="px-4 py-3 font-semibold text-right">Cantidad</th>
                        <th className="px-4 py-3 font-semibold text-right">En stock</th>
                        {canSeeCosts && <th className="px-4 py-3 font-semibold text-right">Precio de costo</th>}
                        <th className="px-4 py-3 font-semibold">Operador</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {insumoHistorial.map((mov, index) => {
                        const isEntrada = mov.tipo_movimiento === 'ENTRADA';
                        return (
                          <tr key={mov.id || index} className="hover:bg-neutral-900/50 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-medium text-neutral-200">{getMotivoLabel(mov.motivo)}</span>
                              {mov.motivo === 'COMPRA' && <span className="ml-2 text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">COMPRA</span>}
                              {mov.motivo === 'VENTA POS' && <span className="ml-2 text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">VENTA</span>}
                            </td>
                            <td className="px-4 py-3 text-neutral-400 font-mono text-xs">
                              {format(parseISO(mov.fecha_movimiento), 'dd/MM/yyyy HH:mm', { locale: es })}
                            </td>
                            <td className={`px-4 py-3 text-right font-bold ${isEntrada ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isEntrada ? '+' : '-'}{mov.cantidad}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-white">
                              {Number(mov.stock_resultante).toFixed(2).replace(/\.00$/, '')}
                            </td>
                            {canSeeCosts && (
                              <td className="px-4 py-3 text-right text-neutral-300 font-mono">
                                {mov.costo_unitario > 0 ? `$${mov.costo_unitario.toFixed(4)}` : '—'}
                              </td>
                            )}
                            <td className="px-4 py-3 text-neutral-500 text-xs">
                              {mov.operador_nombre}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
