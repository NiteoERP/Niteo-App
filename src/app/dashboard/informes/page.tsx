'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Calendar as CalendarIcon, Store, Users, ShoppingCart, Printer, FileSpreadsheet, Search, Check, X, FileIcon } from 'lucide-react';
import { getSedes } from '@/actions/dashboard-actions'; 
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';

type ReportCategory = 'Ventas' | 'Compra' | 'Stock return' | 'Perdidos y dañados' | 'Finance' | 'Control de stock';

const REPORT_MENU = [
  {
    category: 'Ventas',
    reports: [
      { id: 'ventas_productos', name: 'Productos' },
      { id: 'ventas_grupos', name: 'Grupos de productos' },
      { id: 'ventas_clientes', name: 'Clientes' },
      { id: 'ventas_impuestos', name: 'Tasas de impuestos' },
      { id: 'ventas_usuarios', name: 'Usuarios' },
      { id: 'ventas_diarias', name: 'Ventas diarias' },
      { id: 'margen_beneficio', name: 'Margen de beneficio' },
    ]
  },
  {
    category: 'Compra',
    reports: [
      { id: 'compra_productos', name: 'Productos' },
      { id: 'compra_proveedores', name: 'Proveedores' },
      { id: 'compra_facturas', name: 'Lista de facturas de compra' }
    ]
  },
  {
    category: 'Control de stock',
    reports: [
      { id: 'stock_bajo', name: 'Aviso de stock bajo' }
    ]
  }
];

export default function InformesPage() {
  const [selectedReportId, setSelectedReportId] = useState('ventas_diarias');
  const [sedes, setSedes] = useState<any[]>([]);
  
  // Filtros
  const [sedeId, setSedeId] = useState('ALL');
  const [clienteProv, setClienteProv] = useState('ALL');
  const [usuarioId, setUsuarioId] = useState('ALL');
  const [caja, setCaja] = useState('ALL');
  const [producto, setProducto] = useState('ALL');
  const [grupo, setGrupo] = useState('ALL');
  const [incluirSubgrupos, setIncluirSubgrupos] = useState(true);
  
  // Rango de Fechas
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Estado de Datos
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any[] | null>(null);

  useEffect(() => {
    getSedes().then(setSedes);
  }, []);

  const selectedReportName = REPORT_MENU.flatMap(c => c.reports).find(r => r.id === selectedReportId)?.name;

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setTimeout(() => {
      if (selectedReportId === 'ventas_diarias') {
        setReportData([
          { dia: '2026-08-18', ventas: 1250.50, transacciones: 45, ticket_promedio: 27.78 },
          { dia: '2026-08-19', ventas: 1840.00, transacciones: 62, ticket_promedio: 29.67 },
          { dia: '2026-08-20', ventas: 980.20, transacciones: 30, ticket_promedio: 32.67 },
        ]);
      } else if (selectedReportId === 'ventas_productos' || selectedReportId === 'compra_productos') {
        setReportData([
          { producto: 'Hamburguesa Doble', cantidad: 120, total: 1080.00 },
          { producto: 'Refresco Cola', cantidad: 85, total: 170.00 },
        ]);
      } else {
        setReportData([]);
      }
      setIsLoading(false);
    }, 600);
  };

  const handlePrint = () => window.print();

  // Funciones de Fecha Predefinidas
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
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] -m-6 bg-[#1e1e1e] overflow-hidden text-[#cccccc] text-sm font-sans">
      
      {/* SIDEBAR IZQUIERDO: LISTA DE REPORTES */}
      <div className="w-full lg:w-72 border-r border-[#333333] bg-[#252526] flex flex-col shrink-0">
        <div className="p-2 border-b border-[#333333] bg-[#007acc] text-white flex items-center">
          <Search size={14} className="mr-2" />
          <span className="font-semibold text-xs uppercase tracking-wide">Seleccionar informe</span>
        </div>
        <div className="p-2 border-b border-[#333333]">
          <h2 className="text-base text-white mb-2">Seleccione el informe para ver o imprimir</h2>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-[#888888] w-3 h-3" />
            <input 
              type="text" 
              placeholder="Search reports" 
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded-sm pl-7 pr-2 py-1 text-xs text-white focus:outline-none focus:border-[#007acc]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {REPORT_MENU.map((category) => (
            <div key={category.category} className="mb-2">
              <div className="px-3 py-1 flex items-center">
                <span className="text-[#cccccc] text-sm">{category.category}</span>
                <div className="ml-2 flex-1 h-px bg-[#333333]"></div>
              </div>
              <ul className="space-y-0.5">
                {category.reports.map((report) => (
                  <li key={report.id}>
                    <button 
                      onClick={() => { setSelectedReportId(report.id); setReportData(null); }}
                      className={`w-full text-left px-4 py-1.5 text-xs transition-colors flex items-center gap-2 ${
                        selectedReportId === report.id 
                          ? 'bg-[#04395e] text-white border-l-2 border-[#007acc]' 
                          : 'text-[#cccccc] hover:bg-[#2a2d2e] border-l-2 border-transparent'
                      }`}
                    >
                      <FileText size={13} className={selectedReportId === report.id ? 'text-[#007acc]' : 'text-[#888888]'} />
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
      <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e] relative overflow-auto p-6" id="printable-report">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#007acc]">
            <div className="w-8 h-8 border-2 border-[#007acc]/30 border-t-[#007acc] rounded-full animate-spin mb-4"></div>
            <p className="text-sm">Generando informe...</p>
          </div>
        ) : !reportData ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#555555]">
            <FileText size={48} className="mb-4 opacity-20" />
            <p className="text-sm">Seleccione el informe y haga clic en "Mostrar reporte"</p>
          </div>
        ) : (
          <div className="bg-white text-black p-8 rounded shadow-lg max-w-5xl mx-auto print:shadow-none print:w-full print:max-w-none print:p-0 min-h-[800px]">
            {/* Header del Reporte */}
            <div className="border-b-2 border-gray-300 pb-4 mb-6 flex justify-between items-end">
              <div>
                <h1 className="text-2xl font-bold uppercase text-gray-800">{selectedReportName}</h1>
                <p className="text-gray-500 text-sm mt-1">Período: {format(startDate, 'dd/MM/yyyy')} - {format(endDate, 'dd/MM/yyyy')}</p>
                <p className="text-gray-500 text-sm">Sede: {sedeId === 'ALL' ? 'Todas' : sedes.find(s=>s.id === sedeId)?.nombre || sedeId}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-800">Niteo ERP</p>
                <p className="text-xs text-gray-400">{new Date().toLocaleString()}</p>
              </div>
            </div>

            {/* Tabla */}
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-gray-100 text-gray-700 font-bold border-b-2 border-gray-300">
                <tr>
                  {Object.keys(reportData[0] || {}).map((key) => (
                    <th key={key} className="px-3 py-2 uppercase text-xs">{key.replace('_', ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reportData.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val: any, j) => (
                      <td key={j} className="px-3 py-2 text-gray-800">
                        {typeof val === 'number' ? val.toLocaleString('en-US', {minimumFractionDigits:2}) : val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SIDEBAR DERECHO: FILTROS (ESTILO ARONIUM) */}
      <div className="w-full lg:w-72 border-l border-[#333333] bg-[#252526] flex flex-col shrink-0 print:hidden">
        <div className="p-3 border-b border-[#333333]">
          <h2 className="text-lg font-normal text-white">Filtro</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          
          {/* Sucursal (Niteo Specific) */}
          <div className="space-y-1">
            <label className="text-xs text-[#cccccc]">Sede / Sucursal</label>
            <select value={sedeId} onChange={(e) => setSedeId(e.target.value)} className="w-full bg-[#3c3c3c] border border-[#1e1e1e] text-[#cccccc] text-xs py-1.5 px-2 focus:outline-none focus:border-[#007acc]">
              <option value="ALL">Todas las sedes</option>
              {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#cccccc]">Clientes & proveedores</label>
            <select value={clienteProv} onChange={(e) => setClienteProv(e.target.value)} className="w-full bg-[#3c3c3c] border border-[#1e1e1e] text-[#cccccc] text-xs py-1.5 px-2 focus:outline-none focus:border-[#007acc]">
              <option value="ALL">Todos los clientes & proveedores</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#cccccc]">Usuario</label>
            <select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)} className="w-full bg-[#3c3c3c] border border-[#1e1e1e] text-[#cccccc] text-xs py-1.5 px-2 focus:outline-none focus:border-[#007acc]">
              <option value="ALL">Todos los usuarios</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#cccccc]">Caja</label>
            <select value={caja} onChange={(e) => setCaja(e.target.value)} className="w-full bg-[#3c3c3c] border border-[#1e1e1e] text-[#cccccc] text-xs py-1.5 px-2 focus:outline-none focus:border-[#007acc]">
              <option value="ALL">Todas las cajas</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#cccccc]">Producto</label>
            <select value={producto} onChange={(e) => setProducto(e.target.value)} className="w-full bg-[#3c3c3c] border border-[#1e1e1e] text-[#cccccc] text-xs py-1.5 px-2 focus:outline-none focus:border-[#007acc]">
              <option value="ALL">Todos los productos</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#cccccc]">Grupo de productos</label>
            <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className="w-full bg-[#3c3c3c] border border-[#1e1e1e] text-[#cccccc] text-xs py-1.5 px-2 focus:outline-none focus:border-[#007acc]">
              <option value="ALL">Products</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1 pb-2">
            <input type="checkbox" id="subgrupos" checked={incluirSubgrupos} onChange={(e) => setIncluirSubgrupos(e.target.checked)} className="accent-[#007acc] w-3 h-3" />
            <label htmlFor="subgrupos" className="text-xs text-[#cccccc]">Incluir subgrupos</label>
          </div>

          {/* Selector de Fechas (Estilo Botón Aronium) */}
          <div className="relative">
            <button 
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#555] text-[#cccccc] text-sm py-2 px-3 flex items-center justify-center gap-3 transition-colors group"
              title="Click para cambiar el período del reporte"
            >
              <CalendarIcon size={16} className="text-[#cccccc] group-hover:text-white" />
              <span>{format(startDate, 'd/M/yyyy')} - {format(endDate, 'd/M/yyyy')}</span>
            </button>
            
            {/* Modal/Popover de Fechas */}
            {showDatePicker && (
              <div className="absolute top-full right-0 mt-1 bg-[#252526] border border-[#444444] shadow-2xl z-50 w-[600px] p-4 flex gap-6 right-0 origin-top-right">
                
                <div className="flex-1 flex gap-4">
                  <div className="flex-1 text-center">
                    <p className="text-xs text-white mb-2">Inicio</p>
                    <input type="date" value={format(startDate, 'yyyy-MM-dd')} onChange={(e) => setStartDate(new Date(e.target.value))} className="w-full bg-[#3c3c3c] border border-[#1e1e1e] text-[#cccccc] text-xs py-1.5 px-2 focus:outline-none focus:border-[#007acc]" />
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-xs text-white mb-2">Fin</p>
                    <input type="date" value={format(endDate, 'yyyy-MM-dd')} onChange={(e) => setEndDate(new Date(e.target.value))} className="w-full bg-[#3c3c3c] border border-[#1e1e1e] text-[#cccccc] text-xs py-1.5 px-2 focus:outline-none focus:border-[#007acc]" />
                  </div>
                </div>

                <div className="w-48 border-l border-[#444444] pl-4">
                  <p className="text-xs text-white text-center mb-2">Período predefinido</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={() => setDatePredef('hoy')} className="bg-[#333333] hover:bg-[#444] text-xs py-1.5 text-center">Hoy</button>
                    <button onClick={() => setDatePredef('ayer')} className="bg-[#333333] hover:bg-[#444] text-xs py-1.5 text-center">Ayer</button>
                    <button onClick={() => setDatePredef('esta_semana')} className="bg-[#333333] hover:bg-[#444] text-xs py-1.5 text-center">Esta semana</button>
                    <button onClick={() => setDatePredef('ultima_semana')} className="bg-[#333333] hover:bg-[#444] text-xs py-1.5 text-center">Última semana</button>
                    <button onClick={() => setDatePredef('este_mes')} className="bg-[#333333] hover:bg-[#444] text-xs py-1.5 text-center">Este mes</button>
                    <button onClick={() => setDatePredef('ultimo_mes')} className="bg-[#333333] hover:bg-[#444] text-xs py-1.5 text-center">Último mes</button>
                    <button onClick={() => setDatePredef('este_ano')} className="bg-[#333333] hover:bg-[#444] text-xs py-1.5 text-center">Este año</button>
                    <button onClick={() => setDatePredef('ultimo_ano')} className="bg-[#333333] hover:bg-[#444] text-xs py-1.5 text-center">Último año</button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mt-4">
                    <button onClick={() => setShowDatePicker(false)} className="bg-[#007acc] hover:bg-[#005f9e] text-white text-xs py-2 flex items-center justify-center gap-1"><Check size={14}/> Ok</button>
                    <button onClick={() => setShowDatePicker(false)} className="bg-[#333333] hover:bg-[#444] text-white text-xs py-2 flex items-center justify-center gap-1"><X size={14}/> Cancelar</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Grid de 4 Botones de Acción (Estilo Aronium) */}
          <div className="grid grid-cols-2 gap-1 pt-2">
            <button 
              onClick={handleGenerateReport}
              className="bg-[#333333] hover:bg-[#444444] text-[#cccccc] hover:text-white text-xs py-2.5 flex items-center justify-center gap-2 border border-[#1e1e1e] transition-colors"
            >
              <Search size={14} /> Mostrar reporte
            </button>
            <button 
              onClick={handlePrint} disabled={!reportData}
              className="bg-[#333333] hover:bg-[#444444] disabled:opacity-50 text-[#cccccc] hover:text-white text-xs py-2.5 flex items-center justify-center gap-2 border border-[#1e1e1e] transition-colors"
            >
              <Printer size={14} /> Imprimir
            </button>
            <button 
              disabled={!reportData}
              className="bg-[#333333] hover:bg-[#444444] disabled:opacity-50 text-[#cccccc] hover:text-white text-xs py-2.5 flex items-center justify-center gap-2 border border-[#1e1e1e] transition-colors"
            >
              <FileSpreadsheet size={14} /> Excel
            </button>
            <button 
              disabled={!reportData} onClick={handlePrint}
              className="bg-[#333333] hover:bg-[#444444] disabled:opacity-50 text-[#cccccc] hover:text-white text-xs py-2.5 flex items-center justify-center gap-2 border border-[#1e1e1e] transition-colors"
            >
              <FileIcon size={14} /> PDF
            </button>
          </div>

        </div>
      </div>

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
