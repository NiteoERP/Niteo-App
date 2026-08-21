'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Calendar as CalendarIcon, Store, Users, Printer, FileSpreadsheet, Search, Check, X, Box } from 'lucide-react';
import { getSedes } from '@/actions/dashboard-actions'; 
import { generateReport } from '@/actions/informes-actions';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subWeeks } from 'date-fns';

const REPORT_MENU = [
  {
    category: 'Ventas',
    reports: [
      { id: 'ventas_diarias', name: 'Ventas Diarias' },
      { id: 'ventas_productos', name: 'Ventas por Producto' },
      { id: 'ventas_usuarios', name: 'Desempeño de Cajeros' },
      { id: 'cuentas_por_cobrar', name: 'Cuentas por Cobrar (Créditos)' }
    ]
  },
  {
    category: 'Inventario y Compras (Próximamente)',
    reports: [
      { id: 'compras_proveedores', name: 'Compras por Proveedor' },
      { id: 'stock_bajo', name: 'Aviso de Stock Bajo' }
    ]
  }
];

export default function InformesPage() {
  const [selectedReportId, setSelectedReportId] = useState('ventas_diarias');
  const [sedes, setSedes] = useState<any[]>([]);
  
  // Filtros
  const [sedeId, setSedeId] = useState('ALL');
  const [usuarioId, setUsuarioId] = useState('ALL');
  
  // Rango de Fechas
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Estado de Datos
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any[] | null>(null);
  const [reportError, setReportError] = useState('');

  useEffect(() => {
    getSedes().then(setSedes);
  }, []);

  const selectedReportName = REPORT_MENU.flatMap(c => c.reports).find(r => r.id === selectedReportId)?.name;

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setReportError('');
    try {
      const res = await generateReport(selectedReportId, sedeId, startDate, endDate);
      if (res.success) {
        setReportData(res.data);
      } else {
        setReportError(res.error || 'Error desconocido');
        setReportData(null);
      }
    } catch (e) {
      setReportError('Error de red al generar el reporte.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const handleExportExcel = () => {
    if (!reportData || reportData.length === 0) return;
    const headers = Object.keys(reportData[0]);
    let csv = headers.join(',') + '\\n';
    
    reportData.forEach(row => {
      const values = headers.map(header => {
        let val = row[header];
        if (typeof val === 'string') val = val.replace(/,/g, ''); // Evitar comas conflictivas
        return val;
      });
      csv += values.join(',') + '\\n';
    });

    const blob = new Blob(['\\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_${selectedReportId}_${format(startDate, 'yyyyMMdd')}.csv`;
    link.click();
  };

  const setDatePredef = (type: string) => {
    const today = new Date();
    switch(type) {
      case 'hoy': setStartDate(today); setEndDate(today); break;
      case 'ayer': setStartDate(subDays(today,1)); setEndDate(subDays(today,1)); break;
      case 'esta_semana': setStartDate(startOfWeek(today)); setEndDate(endOfWeek(today)); break;
      case 'ultima_semana': setStartDate(startOfWeek(subWeeks(today,1))); setEndDate(endOfWeek(subWeeks(today,1))); break;
      case 'este_mes': setStartDate(startOfMonth(today)); setEndDate(endOfMonth(today)); break;
      case 'ultimo_mes': setStartDate(startOfMonth(subMonths(today,1))); setEndDate(endOfMonth(subMonths(today,1))); break;
      case 'este_ano': setStartDate(startOfYear(today)); setEndDate(endOfYear(today)); break;
      case 'ultimo_ano': setStartDate(startOfYear(subDays(startOfYear(today), 1))); setEndDate(endOfYear(subDays(startOfYear(today), 1))); break;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] -m-6 bg-neutral-900 overflow-hidden text-neutral-200">
      
      {/* SIDEBAR IZQUIERDO: LISTA DE REPORTES */}
      <div className="w-full lg:w-72 border-r border-neutral-800 bg-neutral-950 flex flex-col shrink-0">
        <div className="p-4 border-b border-neutral-800 flex items-center">
          <Search size={18} className="mr-3 text-indigo-400" />
          <span className="font-bold text-sm tracking-wide text-white">CATÁLOGO DE INFORMES</span>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {REPORT_MENU.map((category) => (
            <div key={category.category} className="mb-6">
              <h3 className="px-5 text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">{category.category}</h3>
              <ul className="space-y-1 px-3">
                {category.reports.map((report) => (
                  <li key={report.id}>
                    <button 
                      onClick={() => { setSelectedReportId(report.id); setReportData(null); setReportError(''); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${
                        selectedReportId === report.id 
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50 border border-transparent'
                      }`}
                    >
                      <FileText size={16} className={selectedReportId === report.id ? 'text-indigo-400' : 'text-neutral-500'} />
                      {report.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ÁREA CENTRAL: VISTA PREVIA (SE IMPRIME) */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a] relative overflow-auto p-4 lg:p-8" id="printable-report">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-indigo-400">
            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-medium">Generando informe inteligente...</p>
          </div>
        ) : reportError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-rose-500">
            <p className="text-sm font-bold bg-rose-500/10 px-4 py-2 rounded-lg border border-rose-500/20">{reportError}</p>
          </div>
        ) : !reportData ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500">
            <FileText size={48} className="mb-4 opacity-10" />
            <p className="text-sm">Configura los filtros a la derecha y haz clic en "Mostrar Reporte"</p>
          </div>
        ) : (
          <div className="bg-white text-black p-8 sm:p-10 rounded-2xl shadow-2xl w-full max-w-5xl mx-auto print:shadow-none print:w-full print:max-w-none print:p-0 min-h-[800px]">
            
            {/* Header del Reporte */}
            <div className="border-b-2 border-neutral-200 pb-6 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div>
                <h1 className="text-3xl font-black uppercase text-neutral-900 tracking-tight">{selectedReportName}</h1>
                <p className="text-neutral-500 text-sm mt-2">Período: <span className="font-semibold text-neutral-800">{format(startDate, 'dd/MM/yyyy')} - {format(endDate, 'dd/MM/yyyy')}</span></p>
                <p className="text-neutral-500 text-sm">Sede: <span className="font-semibold text-neutral-800">{sedeId === 'ALL' ? 'Todas las Sucursales Consolidadas' : sedes.find(s=>s.id === sedeId)?.nombre || sedeId}</span></p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xl font-black text-indigo-600 tracking-wider">NITEO ERP</p>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mt-1">Documento Contable</p>
                <p className="text-xs text-neutral-400 mt-1">{new Date().toLocaleString()}</p>
              </div>
            </div>

            {/* Tabla Dinámica */}
            <div className="overflow-x-auto rounded-xl border border-neutral-200">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-neutral-100 text-neutral-700 font-bold uppercase text-xs">
                  <tr>
                    {Object.keys(reportData[0] || {}).map((key) => (
                      <th key={key} className="px-5 py-4 border-b border-neutral-200">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {reportData.map((row, i) => (
                    <tr key={i} className="hover:bg-neutral-50">
                      {Object.values(row).map((val: any, j) => (
                        <td key={j} className="px-5 py-4 text-neutral-800 font-medium">
                          {typeof val === 'number' ? val.toLocaleString('en-US', {minimumFractionDigits:2}) : val}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {reportData.length === 0 && (
                    <tr><td colSpan={10} className="px-5 py-12 text-center text-neutral-500">No hay transacciones registradas para este período.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}
      </div>

      {/* SIDEBAR DERECHO: FILTROS (ESTILO Niteo) */}
      <div className="w-full lg:w-72 border-l border-neutral-800 bg-neutral-950 flex flex-col shrink-0 print:hidden">
        <div className="p-5 border-b border-neutral-800">
          <h2 className="text-base font-bold text-white flex items-center gap-2">Filtros Activos</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Sucursal / Sede</label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
              <select value={sedeId} onChange={(e) => setSedeId(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 text-white text-sm py-2.5 pl-10 pr-3 rounded-lg focus:outline-none focus:border-indigo-500 appearance-none">
                <option value="ALL">Todas las sedes</option>
                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Período del Reporte</label>
            <div className="relative">
              <button 
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="w-full bg-neutral-900 border border-neutral-800 hover:border-neutral-600 text-white text-sm py-2.5 px-3 rounded-lg flex items-center justify-center gap-3 transition-colors"
              >
                <CalendarIcon size={16} className="text-indigo-400" />
                <span className="font-medium">{format(startDate, 'dd/MM/yy')} - {format(endDate, 'dd/MM/yy')}</span>
              </button>
              
              {/* Modal/Popover de Fechas Niteo */}
              {showDatePicker && (
                <div className="absolute top-full right-0 mt-2 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 w-[300px] sm:w-[500px] p-5 flex flex-col sm:flex-row gap-6 origin-top-right">
                  <div className="flex-1 space-y-4">
                    <div>
                      <p className="text-xs font-bold text-neutral-400 uppercase mb-2">Fecha Inicio</p>
                      <input type="date" value={format(startDate, 'yyyy-MM-dd')} onChange={(e) => setStartDate(new Date(e.target.value))} className="w-full bg-neutral-950 border border-neutral-800 text-white text-sm py-2 px-3 rounded-lg focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-400 uppercase mb-2">Fecha Fin</p>
                      <input type="date" value={format(endDate, 'yyyy-MM-dd')} onChange={(e) => setEndDate(new Date(e.target.value))} className="w-full bg-neutral-950 border border-neutral-800 text-white text-sm py-2 px-3 rounded-lg focus:outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                  <div className="w-full sm:w-48 sm:border-l border-neutral-800 sm:pl-5">
                    <p className="text-xs font-bold text-neutral-400 uppercase mb-3 text-center sm:text-left">Aajos Rápidos</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setDatePredef('hoy')} className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs py-1.5 rounded-lg transition-colors">Hoy</button>
                      <button onClick={() => setDatePredef('ayer')} className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs py-1.5 rounded-lg transition-colors">Ayer</button>
                      <button onClick={() => setDatePredef('esta_semana')} className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs py-1.5 rounded-lg transition-colors">Esta semana</button>
                      <button onClick={() => setDatePredef('este_mes')} className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs py-1.5 rounded-lg transition-colors">Este mes</button>
                      <button onClick={() => setDatePredef('este_ano')} className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs py-1.5 rounded-lg transition-colors col-span-2">Este año</button>
                    </div>
                    <div className="flex gap-2 mt-4 pt-4 border-t border-neutral-800">
                      <button onClick={() => setShowDatePicker(false)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded-lg flex justify-center items-center gap-1"><Check size={14}/> Ok</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Grid de Acción Niteo */}
          <div className="pt-4 border-t border-neutral-800 space-y-3">
            <button 
              onClick={handleGenerateReport}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
            >
              <Search size={18} /> Generar Reporte
            </button>
            
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={handlePrint} disabled={!reportData}
                className="bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white text-xs font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Printer size={16} /> Imprimir
              </button>
              <button 
                disabled={!reportData} onClick={handleExportExcel}
                className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 disabled:opacity-50 text-emerald-400 text-xs font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <FileSpreadsheet size={16} /> Excel
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ESTILOS DE IMPRESIÓN */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #printable-report, #printable-report * { visibility: visible; }
          #printable-report {
            position: absolute; left: 0; top: 0; width: 100%; height: 100%; padding: 0; margin: 0; background-color: white !important;
          }
        }
      `}} />

    </div>
  );
}
