'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Loader2, MapPin, Download } from 'lucide-react';
import { getResumenPagos } from '@/actions/cierres-actions';
import { getSedes } from '@/actions/sedes-actions';

export default function ResumenPagosPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [sedes, setSedes] = useState<any[]>([]);
  
  // Fechas por defecto (Últimos 7 días)
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  
  const [fechaInicio, setFechaInicio] = useState(lastWeek);
  const [fechaFin, setFechaFin] = useState(today);
  const [sedeId, setSedeId] = useState('ALL');

  useEffect(() => {
    getSedes().then(setSedes).catch(console.error);
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const res = await getResumenPagos(fechaInicio, fechaFin, sedeId);
      if (res.data) {
        setData(res.data);
      }
      setLoading(false);
    }
    fetchData();
  }, [fechaInicio, fechaFin, sedeId]);

  // Extraer todas las columnas de métodos únicas para construir la tabla
  const allMethodsSet = new Set<string>();
  data.forEach(row => {
    Object.keys(row.metodos).forEach(m => allMethodsSet.add(m));
  });
  const methods = Array.from(allMethodsSet).sort();

  // Calcular totales
  const grandTotal = data.reduce((acc, row) => acc + row.total_usd, 0);
  const methodTotals: Record<string, number> = {};
  methods.forEach(m => {
    methodTotals[m] = data.reduce((acc, row) => acc + (row.metodos[m] || 0), 0);
  });

  return (
    <div className="p-6 md:p-10 animate-in fade-in duration-500 max-w-[1400px] mx-auto space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/caja" className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-400 hover:text-white transition-colors border border-neutral-800">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Resumen de Pagos</h1>
            <p className="text-neutral-400 mt-1">Consolidado en USD de métodos de pago por día.</p>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col sm:flex-row flex-wrap gap-6 items-end">
        <div className="space-y-2 w-full sm:w-auto">
          <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
            <Calendar size={14} /> Desde
          </label>
          <input 
            type="date" 
            value={fechaInicio} 
            onChange={e => setFechaInicio(e.target.value)}
            className="w-full bg-black/50 border border-neutral-800 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 [color-scheme:dark]"
          />
        </div>
        
        <div className="space-y-2 w-full sm:w-auto">
          <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
            <Calendar size={14} /> Hasta
          </label>
          <input 
            type="date" 
            value={fechaFin} 
            onChange={e => setFechaFin(e.target.value)}
            className="w-full bg-black/50 border border-neutral-800 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 [color-scheme:dark]"
          />
        </div>

        {sedes.length > 1 && (
          <div className="space-y-2 w-full sm:w-auto">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
              <MapPin size={14} /> Sede
            </label>
            <select 
              value={sedeId} 
              onChange={e => setSedeId(e.target.value)}
              className="w-full bg-black/50 border border-neutral-800 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">Todas las Sedes</option>
              {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre_sede}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* TABLA DE RESULTADOS */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl relative">
        {loading && (
          <div className="absolute inset-0 z-10 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
          </div>
        )}
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-neutral-400 uppercase bg-neutral-950/50 border-b border-neutral-800">
              <tr>
                <th className="px-6 py-4 font-bold sticky left-0 bg-neutral-950 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">FECHA</th>
                <th className="px-6 py-4 font-bold text-emerald-400 bg-emerald-500/5 border-r border-neutral-800">TOTAL USD</th>
                {methods.map(m => (
                  <th key={m} className="px-6 py-4 font-bold tracking-wider">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {data.length === 0 && !loading && (
                <tr>
                  <td colSpan={methods.length + 2} className="px-6 py-12 text-center text-neutral-500">
                    No se encontraron pagos en este rango de fechas.
                  </td>
                </tr>
              )}
              {data.map((row) => (
                <tr key={row.fecha} className="hover:bg-neutral-800/30 transition-colors">
                  <td className="px-6 py-3 font-medium text-white whitespace-nowrap sticky left-0 bg-neutral-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] z-10">
                    {new Date(row.fecha + 'T12:00:00Z').toLocaleDateString('es-VE')}
                  </td>
                  <td className="px-6 py-3 font-black text-emerald-400 bg-emerald-500/5 border-r border-neutral-800">
                    ${row.total_usd.toFixed(2)}
                  </td>
                  {methods.map(m => (
                    <td key={m} className="px-6 py-3 text-neutral-300">
                      {row.metodos[m] ? '$' + row.metodos[m].toFixed(2) : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {data.length > 0 && (
              <tfoot className="bg-neutral-950 border-t border-neutral-800 font-bold text-white">
                <tr>
                  <td className="px-6 py-4 sticky left-0 bg-neutral-950 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">TOTALES</td>
                  <td className="px-6 py-4 text-emerald-400 bg-emerald-500/5 border-r border-neutral-800">
                    ${grandTotal.toFixed(2)}
                  </td>
                  {methods.map(m => (
                    <td key={m} className="px-6 py-4 text-indigo-400">
                      ${methodTotals[m].toFixed(2)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      
    </div>
  );
}
