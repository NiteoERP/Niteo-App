'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Loader2, MapPin, Download, FileText, Table } from 'lucide-react';
import { getResumenPagos } from '@/actions/cierres-actions';
import { getSedes } from '@/actions/sedes-actions';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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


  const exportExcel = () => {
    if (data.length === 0) return;
    
    // Preparar cabeceras
    const header = ['FECHA', 'TOTAL USD', ...methods];
    
    // Preparar filas
    const rows = data.map(row => {
      const rowData = [
        new Date(row.fecha + 'T12:00:00Z').toLocaleDateString('es-VE'),
        Number(row.total_usd.toFixed(2))
      ];
      methods.forEach(m => {
        rowData.push(Number((row.metodos[m] || 0).toFixed(2)));
      });
      return rowData;
    });
    
    // Fila de totales
    const totalsRow = ['TOTALES', Number(grandTotal.toFixed(2))];
    methods.forEach(m => {
      totalsRow.push(Number(methodTotals[m].toFixed(2)));
    });
    rows.push(totalsRow);
    
    // Crear workbook
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resumen");
    
    XLSX.writeFile(wb, `Resumen_Pagos_${fechaInicio}_${fechaFin}.xlsx`);
  };

  const exportPDF = () => {
    if (data.length === 0) return;
    
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(16);
    doc.text('Resumen de Pagos', 14, 15);
    doc.setFontSize(10);
    doc.text(`Desde: ${fechaInicio} Hasta: ${fechaFin}`, 14, 22);
    
    const head = [['FECHA', 'TOTAL USD', ...methods]];
    
    const body = data.map(row => {
      const rowData = [
        new Date(row.fecha + 'T12:00:00Z').toLocaleDateString('es-VE'),
        `${row.total_usd.toFixed(2)}`
      ];
      methods.forEach(m => {
        rowData.push(row.metodos[m] ? `${row.metodos[m].toFixed(2)}` : '-');
      });
      return rowData;
    });
    
    const foot = [['TOTALES', `${grandTotal.toFixed(2)}`, ...methods.map(m => `${methodTotals[m].toFixed(2)}`)]];
    
    autoTable(doc, {
      startY: 28,
      head: head,
      body: body,
      foot: foot,
      theme: 'grid',
      headStyles: { fillColor: [41, 37, 36], textColor: 255 }, // neutral-800
      footStyles: { fillColor: [23, 23, 23], textColor: 52, fontStyle: 'bold' }, // neutral-950 + emerald
      alternateRowStyles: { fillColor: [250, 250, 250] },
    });
    
    doc.save(`Resumen_Pagos_${fechaInicio}_${fechaFin}.pdf`);
  };

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
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button onClick={exportPDF} disabled={data.length === 0} className="flex-1 md:flex-none bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 px-4 py-2 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <FileText size={18} />
            <span>PDF</span>
          </button>
          <button onClick={exportExcel} disabled={data.length === 0} className="flex-1 md:flex-none bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 px-4 py-2 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <Table size={18} />
            <span>Excel</span>
          </button>
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
