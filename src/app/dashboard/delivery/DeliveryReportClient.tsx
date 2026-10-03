'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Truck, DollarSign, Loader2 } from 'lucide-react';
import NiteoDateRangePicker from '@/components/ui/NiteoDateRangePicker';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { fetchDeliveryData } from '@/actions/deliveryAdminActions';

interface Sede {
  id: string;
  nombre_sede: string;
}

interface Repartidor {
  id: string;
  nombre_completo: string;
}

interface DeliveryRaw {
  id: string;
  fecha_registro_real: string;
  pago_repartidor: number;
  sede_id: string;
  repartidor_id: string;
  sede: { nombre_sede: string } | { nombre_sede: string }[];
  repartidor: { nombre_completo: string } | { nombre_completo: string }[];
}

export default function DeliveryReportClient({ 
  sedesDisponibles, 
  repartidoresDisponibles,
}: { 
  sedesDisponibles: Sede[], 
  repartidoresDisponibles: Repartidor[],
}) {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  
  // Filtros
  const [sedeFilter, setSedeFilter] = useState<string>('ALL');
  const [repFilter, setRepFilter] = useState<string>('ALL');
  
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState<DeliveryRaw[]>([]);

  useEffect(() => {
    loadData();
  }, [startDate, endDate, sedeFilter, repFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchDeliveryData(
        startDate, 
        endDate, 
        sedeFilter === 'ALL' ? [] : [sedeFilter],
        repFilter === 'ALL' ? '' : repFilter
      );
      setRawData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // PIVOT TABLE LOGIC
  // ==========================================================================
  const pivotData = useMemo(() => {
    // 1. Identificar columnas de sedes dinámicas basadas en los datos obtenidos
    const sedesVistas = new Set<string>();
    
    // 2. Agrupar por [Fecha_Local]_[RepartidorID]
    const agrupado: Record<string, {
      fechaStr: string;
      repartidorNombre: string;
      sedesData: Record<string, { count: number; monto: number }>;
      totalCount: number;
      totalMonto: number;
    }> = {};

    rawData.forEach(row => {
      // Extraer nombres reales (Supabase a veces devuelve array si es O2M por error de Foreign Key, o un objeto single)
      const nombreSede = Array.isArray(row.sede) ? row.sede[0]?.nombre_sede : row.sede?.nombre_sede;
      const nombreRepartidor = Array.isArray(row.repartidor) ? row.repartidor[0]?.nombre_completo : row.repartidor?.nombre_completo;
      const sedeKey = nombreSede || 'Sin Sede';
      
      sedesVistas.add(sedeKey);

      // Usar fecha local (solo YYYY-MM-DD)
      const fechaLocal = new Date(row.fecha_registro_real).toLocaleDateString('es-VE');
      const groupKey = `${fechaLocal}_${row.repartidor_id}`;

      if (!agrupado[groupKey]) {
        agrupado[groupKey] = {
          fechaStr: fechaLocal,
          repartidorNombre: nombreRepartidor || 'Desconocido',
          sedesData: {},
          totalCount: 0,
          totalMonto: 0
        };
      }

      if (!agrupado[groupKey].sedesData[sedeKey]) {
        agrupado[groupKey].sedesData[sedeKey] = { count: 0, monto: 0 };
      }

      const pago = Number(row.pago_repartidor) || 0;
      
      agrupado[groupKey].sedesData[sedeKey].count += 1;
      agrupado[groupKey].sedesData[sedeKey].monto += pago;
      
      agrupado[groupKey].totalCount += 1;
      agrupado[groupKey].totalMonto += pago;
    });

    const columnasSedes = Array.from(sedesVistas).sort();
    const filas = Object.values(agrupado).sort((a, b) => a.fechaStr.localeCompare(b.fechaStr));

    // Totales Globales
    const totalGlobalMonto = filas.reduce((acc, f) => acc + f.totalMonto, 0);
    const totalGlobalCount = filas.reduce((acc, f) => acc + f.totalCount, 0);

    return { filas, columnasSedes, totalGlobalMonto, totalGlobalCount };
  }, [rawData]);

  return (
    <div className="space-y-6 max-w-[1400px] animate-in fade-in duration-300">
      
      {/* HEADER OSCURO */}
      <div className="border-b border-neutral-800 pb-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
            <Truck className="text-indigo-400" size={28} />
            Nómina de Deliveries
          </h1>
          <p className="text-neutral-400 text-xs md:text-sm mt-1">
            Reporte consolidado de pagos y cantidad de entregas agrupado por repartidor.
          </p>
        </div>
      </div>

      {/* FILTROS Y WIDGETS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Controles */}
        <div className="lg:col-span-3 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-wrap gap-4 items-end">
          
          <div className="flex-1 min-w-[250px]">
             <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5 block">Período</label>
             <NiteoDateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={(start, end) => { setStartDate(start); setEndDate(end); }}
             />
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5 block">Sede</label>
            <select 
              value={sedeFilter}
              onChange={(e) => setSedeFilter(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-2 px-3 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
            >
              <option value="ALL">Todas las sedes</option>
              {sedesDisponibles.map(s => (
                <option key={s.id} value={s.id}>{s.nombre_sede}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5 block">Repartidor</label>
            <select 
              value={repFilter}
              onChange={(e) => setRepFilter(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-2 px-3 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
            >
              <option value="ALL">Todos los repartidores</option>
              {repartidoresDisponibles.map(r => (
                <option key={r.id} value={r.id}>{r.nombre_completo}</option>
              ))}
            </select>
          </div>
          
        </div>

        {/* Totales Resumen */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-center">
           <div className="flex justify-between items-center mb-2">
             <span className="text-xs font-bold text-neutral-500 uppercase">Total a Pagar</span>
             <DollarSign size={16} className="text-emerald-400" />
           </div>
           <p className="text-3xl font-black text-white">${pivotData.totalGlobalMonto.toFixed(2)}</p>
           <p className="text-xs text-neutral-400 mt-1">{pivotData.totalGlobalCount} entregas totales</p>
        </div>
      </div>

      {/* TABLA PIVOT OSCURA */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl relative">
        {loading && (
          <div className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
          </div>
        )}

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 text-xs uppercase tracking-wider font-bold">
                <th className="p-4">Fecha</th>
                <th className="p-4 border-r border-neutral-800/50">Repartidor</th>
                
                {/* Columnas Dinámicas de Sedes */}
                {pivotData.columnasSedes.map(sedeName => (
                  <th key={sedeName} className="p-4 text-center bg-neutral-900/30">
                    <span className="block truncate max-w-[120px] mx-auto" title={sedeName}>{sedeName}</span>
                  </th>
                ))}
                
                <th className="p-4 text-center border-l border-neutral-800/50 bg-indigo-500/5 text-indigo-300">Cnt. Total</th>
                <th className="p-4 text-right bg-emerald-500/5 text-emerald-300">A Pagar ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {pivotData.filas.map((fila, i) => (
                <tr key={i} className="hover:bg-neutral-800/40 transition-colors group">
                  <td className="p-4 text-neutral-300 font-medium">{fila.fechaStr}</td>
                  <td className="p-4 text-white font-bold border-r border-neutral-800/50">
                    {fila.repartidorNombre}
                  </td>
                  
                  {/* Celdas Dinámicas */}
                  {pivotData.columnasSedes.map(sedeName => {
                    const stats = fila.sedesData[sedeName];
                    if (!stats) return <td key={sedeName} className="p-4 text-center text-neutral-600">-</td>;
                    return (
                      <td key={sedeName} className="p-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-white font-bold">${stats.monto.toFixed(2)}</span>
                          <span className="text-[10px] text-neutral-500">{stats.count} via.</span>
                        </div>
                      </td>
                    );
                  })}
                  
                  <td className="p-4 text-center border-l border-neutral-800/50 font-bold text-indigo-200">
                    {fila.totalCount}
                  </td>
                  <td className="p-4 text-right font-black text-emerald-400 text-base">
                    ${fila.totalMonto.toFixed(2)}
                  </td>
                </tr>
              ))}
              
              {pivotData.filas.length === 0 && !loading && (
                <tr>
                  <td colSpan={4 + pivotData.columnasSedes.length} className="p-12 text-center text-neutral-500">
                    <Truck size={32} className="mx-auto mb-3 opacity-20" />
                    No hay deliveries registrados en este período.
                  </td>
                </tr>
              )}
            </tbody>
            {pivotData.filas.length > 0 && (
              <tfoot className="bg-neutral-950 border-t border-neutral-800 font-black">
                <tr>
                  <td colSpan={2} className="p-4 text-right text-neutral-400 uppercase tracking-widest text-xs border-r border-neutral-800/50">
                    Totales
                  </td>
                  {pivotData.columnasSedes.map(sedeName => {
                    const totalSedeMonto = pivotData.filas.reduce((acc, f) => acc + (f.sedesData[sedeName]?.monto || 0), 0);
                    return (
                      <td key={sedeName} className="p-4 text-center text-white">
                        ${totalSedeMonto.toFixed(2)}
                      </td>
                    );
                  })}
                  <td className="p-4 text-center text-indigo-300 border-l border-neutral-800/50">
                    {pivotData.totalGlobalCount}
                  </td>
                  <td className="p-4 text-right text-emerald-400 text-lg">
                    ${pivotData.totalGlobalMonto.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
