'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Loader2,
  AlertCircle,
  RefreshCw,
  Store,
  Info,
  Layers,
} from 'lucide-react';
import { getReporteFinanciero } from '@/actions/finanzas-actions';
import { useEmpresa } from '@/components/providers/EmpresaProvider';
import { useSedes } from '@/hooks/useDashboardData';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Line,
} from 'recharts';
import NiteoDateRangePicker from '@/components/ui/NiteoDateRangePicker';

export default function FinanzasPage() {
  const { empresaId, userRole, userSedeId } = useEmpresa();
  const sedes = useSedes(empresaId || '', userRole, userSedeId);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedSedeId, setSelectedSedeId] = useState<string>('ALL');

  // Por defecto el mes actual
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  });

  const [fechaFin, setFechaFin] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  });

  const loadData = async (start = fechaInicio, end = fechaFin, sedeId = selectedSedeId) => {
    setLoading(true);
    setErrorMsg('');
    const res = await getReporteFinanciero(start, end, sedeId);
    if (res.success) {
      setData(res.data);
    } else {
      setData(res.data); // still set mock data to prevent crashes
      setErrorMsg(res.error || 'Error cargando reporte');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData(fechaInicio, fechaFin, selectedSedeId);
  }, [selectedSedeId]);

  const handleSedeChange = (newSedeId: string) => {
    setSelectedSedeId(newSedeId);
    loadData(fechaInicio, fechaFin, newSedeId);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' USD';
  };

  // Preparar datos para el gráfico combinado
  let chartData: any[] = [];
  if (data) {
    const dates = new Set([
      ...(data.ingresos_por_dia || []).map((d: any) => d.fecha),
      ...(data.egresos_por_dia || []).map((d: any) => d.fecha),
    ]);

    const sortedDates = Array.from(dates).sort();

    chartData = sortedDates.map(date => {
      const ing = (data.ingresos_por_dia || []).find((d: any) => d.fecha === date);
      const egr = (data.egresos_por_dia || []).find((d: any) => d.fecha === date);
      const valIng = ing ? Number(ing.total || 0) : 0;
      const valEgr = egr ? Number(egr.total || 0) : 0;
      return {
        fecha: date,
        Ingresos: valIng,
        Egresos: valEgr,
        Ganancia: valIng - valEgr,
      };
    });
  }

  const isSedeEspecifica = selectedSedeId && selectedSedeId !== 'ALL';
  const breakdown = data?.compras_netas_breakdown;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Finanzas (P&L)</h1>
          <p className="text-neutral-400 mt-1">
            Estado de Resultados y Rentabilidad Real
            {isSedeEspecifica && data?.sede_info?.nombre ? ` — Sede: ${data.sede_info.nombre}` : ' — Consolidado Empresa'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Sede */}
          <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl">
            <Store size={16} className="text-indigo-400" />
            <select
              value={selectedSedeId}
              onChange={e => handleSedeChange(e.target.value)}
              className="bg-transparent border-none text-sm font-semibold text-white outline-none cursor-pointer pr-4"
            >
              <option value="ALL" className="bg-neutral-900 text-white">
                Todas las Sedes (Consolidado)
              </option>
              {sedes.map(s => (
                <option key={s.id} value={s.id} className="bg-neutral-900 text-white">
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          <NiteoDateRangePicker
            startDate={fechaInicio}
            endDate={fechaFin}
            onChange={(s, e) => {
              setFechaInicio(s);
              setFechaFin(e);
              if (s && e) {
                loadData(s, e, selectedSedeId);
              }
            }}
            align="right"
          />

          <button
            type="button"
            onClick={() => loadData(fechaInicio, fechaFin, selectedSedeId)}
            disabled={loading}
            className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            title="Recargar datos"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-indigo-400' : 'text-neutral-400'} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          <p>{errorMsg}</p>
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-indigo-500" size={40} />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Ingresos Totales */}
            <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h3 className="text-neutral-400 font-medium">Ingresos Totales</h3>
                  <span className="text-[11px] text-neutral-500">Ventas percibidas</span>
                </div>
              </div>
              <p className="text-3xl font-bold text-white">{formatCurrency(data.total_ingresos)}</p>
            </div>

            {/* Egresos / Compras Netas */}
            <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
                    <TrendingDown size={24} />
                  </div>
                  <div>
                    <h3 className="text-neutral-400 font-medium">
                      {isSedeEspecifica ? 'Compras Netas de la Sede' : 'Gastos / Compras Totales'}
                    </h3>
                    {isSedeEspecifica && (
                      <span className="text-[11px] font-semibold text-indigo-400">
                        Ecuación: Locales + Recibidos − Entregados
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-3xl font-bold text-white">{formatCurrency(data.total_egresos)}</p>

              {/* Detalle si es sede específica */}
              {isSedeEspecifica && breakdown && (
                <div className="mt-3 pt-3 border-t border-neutral-800/80 text-xs text-neutral-400 flex flex-wrap gap-x-3 gap-y-1">
                  <span>Locales: <strong className="text-neutral-200">${breakdown.compras_locales.toFixed(2)}</strong></span>
                  <span>+ Recibidos: <strong className="text-cyan-400">${breakdown.despachos_recibidos.toFixed(2)}</strong></span>
                  <span>− Entregados: <strong className="text-rose-400">${breakdown.despachos_entregados.toFixed(2)}</strong></span>
                </div>
              )}
            </div>

            {/* Ganancia Neta */}
            <div className="bg-indigo-600 p-6 rounded-2xl relative overflow-hidden shadow-[0_0_30px_rgba(79,70,229,0.2)]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-white/20 text-white rounded-xl">
                  <DollarSign size={24} />
                </div>
                <div>
                  <h3 className="text-indigo-100 font-medium">Ganancia Neta Real</h3>
                  <span className="text-[11px] text-indigo-200 font-medium">Ingresos − Compras Netas</span>
                </div>
              </div>
              <p className="text-3xl font-bold text-white">{formatCurrency(data.ganancia_neta)}</p>
            </div>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
            <h3 className="text-lg font-medium text-white mb-6">
              Flujo de Caja {isSedeEspecifica ? `— ${data?.sede_info?.nombre || 'Sede'}` : 'Consolidado'}
            </h3>
            <div className="h-[400px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="fecha" stroke="#888" tick={{ fill: '#888' }} />
                    <YAxis stroke="#888" tick={{ fill: '#888' }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '12px' }}
                      itemStyle={{ fontWeight: 500 }}
                    />
                    <Legend />
                    <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Egresos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="Ganancia" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-neutral-500">
                  No hay datos en este rango de fechas
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
