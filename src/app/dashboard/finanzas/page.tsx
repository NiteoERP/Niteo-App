'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { getReporteFinanciero } from '@/actions/finanzas-actions';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import NiteoDateRangePicker from '@/components/ui/NiteoDateRangePicker';

export default function FinanzasPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
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

  const loadData = async (start = fechaInicio, end = fechaFin) => {
    setLoading(true);
    setErrorMsg('');
    const res = await getReporteFinanciero(start, end);
    if (res.success) {
      setData(res.data);
    } else {
      setData(res.data); // still set mock data to prevent crashes
      setErrorMsg(res.error || 'Error cargando reporte');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' USD';
  };

  // Preparar datos para el gráfico combinado
  let chartData: any[] = [];
  if (data) {
    const dates = new Set([
      ...data.ingresos_por_dia.map((d:any) => d.fecha),
      ...data.egresos_por_dia.map((d:any) => d.fecha)
    ]);
    
    const sortedDates = Array.from(dates).sort();
    
    chartData = sortedDates.map(date => {
      const ing = data.ingresos_por_dia.find((d:any) => d.fecha === date);
      const egr = data.egresos_por_dia.find((d:any) => d.fecha === date);
      return {
        fecha: date,
        Ingresos: ing ? ing.total : 0,
        Egresos: egr ? egr.total : 0,
        Ganancia: (ing ? ing.total : 0) - (egr ? egr.total : 0)
      };
    });
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Finanzas (P&L)</h1>
          <p className="text-neutral-400 mt-1">Estado de Resultados y Rentabilidad</p>
        </div>
        
        <div className="flex items-center gap-3">
          <NiteoDateRangePicker
            startDate={fechaInicio}
            endDate={fechaFin}
            onChange={(s, e) => {
              setFechaInicio(s);
              setFechaFin(e);
              if (s && e) {
                loadData(s, e);
              }
            }}
            align="right"
          />
          <button 
            type="button"
            onClick={() => loadData(fechaInicio, fechaFin)}
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
          <p>{errorMsg} (Asegúrate de ejecutar el script SQL en Supabase)</p>
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-indigo-500" size={40} />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <TrendingUp size={24} />
                </div>
                <h3 className="text-neutral-400 font-medium">Ingresos Totales</h3>
              </div>
              <p className="text-3xl font-bold text-white">{formatCurrency(data.total_ingresos)}</p>
            </div>

            <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
                  <TrendingDown size={24} />
                </div>
                <h3 className="text-neutral-400 font-medium">Gastos / Compras</h3>
              </div>
              <p className="text-3xl font-bold text-white">{formatCurrency(data.total_egresos)}</p>
            </div>

            <div className="bg-indigo-600 p-6 rounded-2xl relative overflow-hidden shadow-[0_0_30px_rgba(79,70,229,0.2)]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-white/20 text-white rounded-xl">
                  <DollarSign size={24} />
                </div>
                <h3 className="text-indigo-100 font-medium">Ganancia Neta</h3>
              </div>
              <p className="text-3xl font-bold text-white">{formatCurrency(data.ganancia_neta)}</p>
            </div>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
            <h3 className="text-lg font-medium text-white mb-6">Flujo de Caja Mensual</h3>
            <div className="h-[400px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="fecha" stroke="#888" tick={{fill: '#888'}} />
                    <YAxis stroke="#888" tick={{fill: '#888'}} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '12px' }}
                      itemStyle={{ fontWeight: 500 }}
                    />
                    <Legend />
                    <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Egresos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="Ganancia" stroke="#6366f1" strokeWidth={3} dot={{r: 4}} />
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
