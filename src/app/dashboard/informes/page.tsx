'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Calendar as CalendarIcon, Store, Users, Printer, FileSpreadsheet, Search, Check, X, Box, Tag } from 'lucide-react';
import { getSedes } from '@/actions/dashboard-actions'; 
import { useEmpresa } from '@/components/providers/EmpresaProvider'; 
import { generateReport } from '@/actions/informes-actions';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subWeeks } from 'date-fns';
import * as XLSX from 'xlsx';

const REPORT_MENU = [
  {
    category: 'Ventas',
    reports: [
      { id: 'ventas_diarias', name: 'Ventas Diarias' },
      { id: 'ventas_productos', name: 'Ventas por Producto' },
      { id: 'ventas_productos_clientes', name: 'Ventas por Producto y Cliente' },
      { id: 'ventas_metodos_pago', name: 'Ventas por Método de Pago' },
      { id: 'ventas_usuarios', name: 'Desempeo de Cajeros' },
      { id: 'cuentas_por_cobrar', name: 'Cuentas por Cobrar (Créditos)' },
      { id: 'cuentas_abiertas', name: 'Cuentas Abiertas (Mesas)' }
    ]
  },
  {
    category: 'Control de Caja',
    reports: [
      { id: 'cierres_caja', name: 'Historial de Cierres de Caja' }
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
  const { formatCurrency, empresa } = useEmpresa();
  const [selectedReportId, setSelectedReportId] = useState('ventas_diarias');
  const [sedes, setSedes] = useState<any[]>([]);
  
  // Filtros
  const [sedeId, setSedeId] = useState('ALL');
  
  // Rango de Fechas
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Estado de Datos
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any[] | null>(null);
  const [reportError, setReportError] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    getSedes().then(setSedes);
  }, []);

  const selectedReportName = REPORT_MENU.flatMap(c => c.reports).find(r => r.id === selectedReportId)?.name;

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setReportError('');
    setShowPreviewModal(false);
    
    try {
      const res = await generateReport(selectedReportId, sedeId, startDate, endDate);
      if (res.success) {
        let finalData = res.data;

        // Si es el reporte de mtodos de pago, hacemos un pivot table por fecha
        if (selectedReportId === 'ventas_metodos_pago' && finalData.length > 0 && finalData[0]['Fecha']) {
           const pivotMap = new Map();
           const metodosSet = new Set<string>();

           finalData.forEach((row: any) => {
             const fecha = row['Fecha'];
             const metodo = row['Metodo de Pago'];
             const monto = row['Monto Total'] || 0;
             metodosSet.add(metodo);

             if (!pivotMap.has(fecha)) {
               pivotMap.set(fecha, { Fecha: fecha });
             }
             pivotMap.get(fecha)[metodo] = monto;
           });

           // Convertir a array
           const metodosArray = Array.from(metodosSet).sort();
           finalData = Array.from(pivotMap.values()).map((row: any) => {
             // Asegurar que todos los mtodos tengan un valor (0 si no hay)
             metodosArray.forEach(m => {
               if (row[m] === undefined) row[m] = 0;
             });
             return row;
           });
        }

        setReportData(finalData);
        setShowPreviewModal(true);
      } else {
        setReportError(res.error || 'Error desconocido');
      }
    } catch (err: any) {
      setReportError(err.message || 'Error de conexin');
    } finally {
      setIsLoading(false);
    }
  };

  const setPredefinedDate = (type: string) => {
    const today = new Date();
    switch (type) {
      case 'hoy':
        setStartDate(today); setEndDate(today); break;
      case 'ayer':
        setStartDate(subDays(today, 1)); setEndDate(subDays(today, 1)); break;
      case 'esta_semana':
        setStartDate(startOfWeek(today)); setEndDate(endOfWeek(today)); break;
      case 'semana_pasada':
        setStartDate(startOfWeek(subWeeks(today, 1))); setEndDate(endOfWeek(subWeeks(today, 1))); break;
      case 'este_mes':
        setStartDate(startOfMonth(today)); setEndDate(endOfMonth(today)); break;
      case 'mes_pasado':
        setStartDate(startOfMonth(subMonths(today, 1))); setEndDate(endOfMonth(subMonths(today, 1))); break;
      case 'este_ano':
        setStartDate(startOfYear(today)); setEndDate(endOfYear(today)); break;
    }
    setShowDatePicker(false);
  };

  return (
    <div className="flex h-full w-full bg-neutral-950 text-white overflow-hidden flex-col lg:flex-row relative">
      
      {/* SIDEBAR IZQUIERDO: CATÁLOGO */}
      <div className="w-full lg:w-72 border-r border-neutral-800 bg-neutral-950 flex flex-col shrink-0 print:hidden">
        <div className="p-5 border-b border-neutral-800">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Search size={18} className="text-indigo-400" />
            CATÁLOGO DE INFORMES
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {REPORT_MENU.map((category, idx) => (
            <div key={idx}>
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

      {/* ÁREA CENTRAL: PLACEHOLDER */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center print:hidden">
         <div className="max-w-md">
            <div className="w-20 h-20 bg-neutral-900 rounded-3xl mx-auto flex items-center justify-center border border-neutral-800 mb-6 shadow-2xl">
               <FileSpreadsheet size={32} className="text-indigo-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Módulo de Informes</h2>
            <p className="text-neutral-400 mb-8">
              Selecciona un reporte del catálogo, ajusta los filtros en el panel derecho y genera un documento contable consolidado al instante.
            </p>
         </div>
      </div>

      {/* SIDEBAR DERECHO: FILTROS */}
      <div className="w-full lg:w-72 border-l border-neutral-800 bg-neutral-950 flex flex-col shrink-0 print:hidden z-10">
        <div className="p-5 border-b border-neutral-800">
          <h2 className="text-base font-bold text-white flex items-center gap-2">Filtros Activos</h2>
        </div>
        
        <div className="flex-1 p-5 space-y-6 overflow-visible">
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Sucursal / Sede</label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
              <select value={sedeId} onChange={(e) => setSedeId(e.target.value)} className="w-full h-14 bg-neutral-900 border border-neutral-800 text-white text-sm pl-10 pr-3 rounded-xl focus:outline-none focus:border-indigo-500 appearance-none">
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
                className="w-full h-14 bg-neutral-900 border border-neutral-800 hover:border-neutral-600 text-white text-sm px-3 rounded-xl flex items-center justify-center gap-3 transition-colors"
              >
                <CalendarIcon size={16} className="text-indigo-400" />
                <span className="font-medium">{format(startDate, 'dd/MM/yy')} - {format(endDate, 'dd/MM/yy')}</span>
              </button>
              
              {showDatePicker && (
                <div className="absolute top-full right-0 mt-2 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 w-[300px] sm:w-[500px] p-5 flex flex-col sm:flex-row gap-6 origin-top-right">
                  <div className="flex-1 space-y-4">
                    <div>
                      <p className="text-xs font-bold text-neutral-400 uppercase mb-2">Fecha Inicio</p>
                      <input type="date" value={format(startDate, 'yyyy-MM-dd')} onChange={(e) => {
                          if(e.target.value) {
                            const d = new Date(e.target.value + 'T00:00:00');
                            if(!isNaN(d.getTime())) setStartDate(d);
                          }
                        }} className="w-full h-14 bg-neutral-950 border border-neutral-800 text-white text-sm px-3 rounded-xl focus:outline-none focus:border-indigo-500 [color-scheme:dark]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-400 uppercase mb-2">Fecha Fin</p>
                      <input type="date" value={format(endDate, 'yyyy-MM-dd')} onChange={(e) => {
                          if(e.target.value) {
                            const d = new Date(e.target.value + 'T00:00:00');
                            if(!isNaN(d.getTime())) setEndDate(d);
                          }
                        }} className="w-full h-14 bg-neutral-950 border border-neutral-800 text-white text-sm px-3 rounded-xl focus:outline-none focus:border-indigo-500 [color-scheme:dark]" />
                    </div>
                  </div>
                  <div className="w-full sm:w-48 sm:border-l border-neutral-800 sm:pl-5">
                    <p className="text-xs font-bold text-neutral-400 uppercase mb-3">Rápidos</p>
                    <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
                      <button onClick={()=>setPredefinedDate('hoy')} className="text-left text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 px-2 py-1.5 rounded">Hoy</button>
                      <button onClick={()=>setPredefinedDate('ayer')} className="text-left text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 px-2 py-1.5 rounded">Ayer</button>
                      <button onClick={()=>setPredefinedDate('esta_semana')} className="text-left text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 px-2 py-1.5 rounded">Esta Semana</button>
                      <button onClick={()=>setPredefinedDate('este_mes')} className="text-left text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 px-2 py-1.5 rounded text-indigo-400 font-medium">Este Mes</button>
                      <button onClick={()=>setPredefinedDate('mes_pasado')} className="text-left text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 px-2 py-1.5 rounded">Mes Pasado</button>
                      <button onClick={()=>setPredefinedDate('este_ano')} className="text-left text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 px-2 py-1.5 rounded">Este Año</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ACCIONES INFERIORES */}
        <div className="p-5 border-t border-neutral-800 space-y-3">
          {reportError && (
             <p className="text-rose-500 text-xs font-bold text-center mb-2 bg-rose-500/10 py-1 rounded">{reportError}</p>
          )}
          <button 
            onClick={handleGenerateReport}
            disabled={isLoading}
            className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <><Search size={18} /> Generar Reporte</>
            )}
          </button>
        </div>
      </div>

      {/* MODAL PREVISUALIZACION DEL REPORTE */}
      {showPreviewModal && reportData && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-start overflow-y-auto p-4 sm:p-8 print:p-0 print:bg-white print:block">
            
            <div className="w-full max-w-5xl my-auto flex flex-col print:my-0">
              {/* Toolbar superior (No se imprime) */}
              <div className="w-full flex justify-between items-center mb-4 print:hidden shrink-0 pt-8">
                 <h3 className="text-white font-bold text-lg flex items-center gap-2">
                   <FileText size={20} className="text-indigo-400" />
                   Vista Previa del Reporte
                 </h3>
                 <div className="flex items-center gap-3">
                   <button onClick={() => {
                       if (!reportData || reportData.length === 0) return;
                       
                       // 1. Convertir JSON a Hoja de Trabajo de SheetJS (Worksheet)
                       const ws = XLSX.utils.json_to_sheet(reportData);
                       
                       // 2. Ajustar el ancho de las columnas (Hacerlo legible)
                       const objectMaxLength: number[] = []; 
                       reportData.forEach(row => {
                         Object.entries(row).forEach(([key, value], idx) => {
                           const columnValue = value ? value.toString() : "";
                           objectMaxLength[idx] = Math.max(
                             objectMaxLength[idx] || 0,
                             columnValue.length,
                             key.length
                           );
                         });
                       });
                       ws['!cols'] = objectMaxLength.map(w => ({ width: w + 2 }));
                       
                       // 3. Crear Libro de Trabajo (Workbook) y exportar
                       const wb = XLSX.utils.book_new();
                       XLSX.utils.book_append_sheet(wb, ws, "Reporte");
                       
                       const fileName = `${selectedReportName?.replace(/ /g, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
                       XLSX.writeFile(wb, fileName);
                    }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm">
                     <FileSpreadsheet size={18} /> Exportar Excel
                   </button>
                   <button onClick={()=>window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm">
                     <Printer size={18} /> Imprimir / PDF
                   </button>
                   <button onClick={()=>setShowPreviewModal(false)} className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm border border-neutral-700">
                     Cerrar
                   </button>
                 </div>
              </div>

              {/* El Documento (Papel) */}
              <div className="bg-white text-black w-full rounded-xl shadow-2xl p-8 sm:p-12 print:shadow-none print:p-0 mb-8 shrink-0 min-h-[800px]">
               
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
                         <th key={key} className="px-5 py-4 border-b border-neutral-200">{key.replace(/_/g, ' ')}</th>
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
            </div>
          </div>
      )}

    </div>
  );
}
