'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Calendar, Store, Users, ShoppingCart, Printer, FileSpreadsheet, Download, Search, LayoutDashboard, Settings2 } from 'lucide-react';
import { getSedes } from '@/actions/dashboard-actions'; // Reutilizamos action de sedes
// En un sistema real aquí importaríamos actions específicos para cada reporte:
// import { getVentasDiarias, getVentasPorProducto, getStockBajo } from './actions';

type ReportCategory = 'Ventas' | 'Compras' | 'Control de Stock';

const REPORT_MENU = [
  {
    category: 'Ventas',
    reports: [
      { id: 'ventas_diarias', name: 'Ventas Diarias' },
      { id: 'ventas_productos', name: 'Ventas por Producto' },
      { id: 'ventas_clientes', name: 'Ventas por Cliente' },
      { id: 'ventas_usuarios', name: 'Desempeño de Usuarios/Cajeros' },
      { id: 'margen_beneficio', name: 'Margen de Beneficio' },
    ]
  },
  {
    category: 'Compras',
    reports: [
      { id: 'compras_proveedores', name: 'Compras por Proveedor' },
      { id: 'compras_facturas', name: 'Lista de Facturas de Compra' }
    ]
  },
  {
    category: 'Control de Stock',
    reports: [
      { id: 'stock_bajo', name: 'Aviso de Stock Bajo' },
      { id: 'valor_inventario', name: 'Valoración del Inventario' }
    ]
  }
];

export default function InformesPage() {
  const [selectedReportId, setSelectedReportId] = useState('ventas_diarias');
  const [sedes, setSedes] = useState<any[]>([]);
  
  // Filtros
  const [sedeId, setSedeId] = useState('ALL');
  const [dateRange, setDateRange] = useState('thisMonth');
  const [usuarioId, setUsuarioId] = useState('ALL');
  
  // Estado de Datos
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any[] | null>(null);

  useEffect(() => {
    getSedes().then(setSedes);
  }, []);

  const selectedReportName = REPORT_MENU.flatMap(c => c.reports).find(r => r.id === selectedReportId)?.name;

  const handleGenerateReport = async () => {
    setIsLoading(true);
    // Simulación de carga de reporte según filtros
    setTimeout(() => {
      // Mock Data basada en el reporte seleccionado
      if (selectedReportId === 'ventas_diarias') {
        setReportData([
          { dia: '2026-08-18', ventas: 1250.50, transacciones: 45, ticket_promedio: 27.78 },
          { dia: '2026-08-19', ventas: 1840.00, transacciones: 62, ticket_promedio: 29.67 },
          { dia: '2026-08-20', ventas: 980.20, transacciones: 30, ticket_promedio: 32.67 },
        ]);
      } else if (selectedReportId === 'ventas_productos') {
        setReportData([
          { producto: 'Hamburguesa Doble', cantidad: 120, total: 1080.00 },
          { producto: 'Refresco Cola', cantidad: 85, total: 170.00 },
          { producto: 'Pizza Pepperoni', cantidad: 45, total: 675.00 },
        ]);
      } else {
        setReportData([]);
      }
      setIsLoading(false);
    }, 800);
  };

  const handlePrint = () => window.print();

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] -m-6 bg-neutral-900 overflow-hidden">
      
      {/* SIDEBAR DE REPORTES */}
      <div className="w-full lg:w-80 border-r border-neutral-800 bg-neutral-950 flex flex-col shrink-0">
        <div className="p-4 border-b border-neutral-800 bg-neutral-900/50">
          <h2 className="text-lg font-bold text-white mb-3">Centro de Informes</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Buscar reporte..." 
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {REPORT_MENU.map((category) => (
            <div key={category.category}>
              <h3 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-2 px-2">{category.category}</h3>
              <ul className="space-y-0.5">
                {category.reports.map((report) => (
                  <li key={report.id}>
                    <button 
                      onClick={() => { setSelectedReportId(report.id); setReportData(null); }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                        selectedReportId === report.id 
                          ? 'bg-indigo-500/10 text-indigo-400 font-medium border border-indigo-500/20' 
                          : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 border border-transparent'
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

      {/* ÁREA PRINCIPAL: FILTROS Y VISTA PREVIA */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a] relative">
        
        {/* Panel de Filtros (Estilo Aronium pero Niteo UI) */}
        <div className="p-5 border-b border-neutral-800 bg-neutral-900/50 shrink-0 print:hidden">
          <div className="flex flex-col md:flex-row gap-6">
            
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Settings2 size={16} className="text-indigo-400" /> Parámetros del Informe: {selectedReportName}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Filtro Sede */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-400">Sucursal / Sede</label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
                    <select 
                      value={sedeId} onChange={(e) => setSedeId(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 appearance-none"
                    >
                      <option value="ALL">Todas las Sedes</option>
                      {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  </div>
                </div>

                {/* Filtro Fecha */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-400">Rango de Fechas</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
                    <select 
                      value={dateRange} onChange={(e) => setDateRange(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 appearance-none"
                    >
                      <option value="today">Hoy</option>
                      <option value="7days">Últimos 7 Días</option>
                      <option value="thisMonth">Este Mes</option>
                      <option value="lastMonth">Mes Anterior</option>
                      <option value="custom">Rango Personalizado...</option>
                    </select>
                  </div>
                </div>

                {/* Filtro Usuario/Cajero */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-400">Usuario / Cajero</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
                    <select 
                      value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 appearance-none"
                    >
                      <option value="ALL">Todos los usuarios</option>
                      <option value="user1">Juan Pérez</option>
                      <option value="user2">María García</option>
                    </select>
                  </div>
                </div>

              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-col gap-2 shrink-0 justify-end mt-4 md:mt-0 md:pl-6 md:border-l md:border-neutral-800">
              <button 
                onClick={handleGenerateReport}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? <span className="animate-pulse">Cargando...</span> : <> <Search size={16} /> Mostrar Reporte</>}
              </button>
              
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button 
                  onClick={handlePrint} disabled={!reportData}
                  className="bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Printer size={14} /> Imprimir / PDF
                </button>
                <button 
                  disabled={!reportData}
                  className="bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-500/20 disabled:opacity-50 text-emerald-400 text-xs font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <FileSpreadsheet size={14} /> Excel
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* CONTENEDOR DE VISTA PREVIA (Para Imprimir) */}
        <div className="flex-1 overflow-auto p-6 bg-neutral-950 relative" id="printable-report">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-indigo-400">
              <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
              <p className="text-sm font-medium">Generando informe...</p>
            </div>
          ) : !reportData ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500">
              <FileText size={48} className="mb-4 opacity-20" />
              <p className="text-sm">Seleccione los parámetros y haga clic en "Mostrar Reporte"</p>
            </div>
          ) : (
            <div className="bg-white text-black p-8 rounded-xl shadow-xl max-w-4xl mx-auto print:shadow-none print:w-full print:max-w-none print:p-0">
              
              {/* Membrete Reporte */}
              <div className="border-b-2 border-neutral-200 pb-6 mb-6 flex justify-between items-end">
                <div>
                  <h1 className="text-2xl font-black uppercase text-neutral-900 tracking-tight">{selectedReportName}</h1>
                  <p className="text-neutral-500 text-sm mt-1">Sede: <span className="font-semibold text-neutral-800">{sedeId === 'ALL' ? 'Todas las Sedes Consolidadas' : sedes.find(s=>s.id === sedeId)?.nombre || sedeId}</span></p>
                  <p className="text-neutral-500 text-sm">Fecha Impresión: {new Date().toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-indigo-600">Niteo ERP</p>
                  <p className="text-xs text-neutral-400">Reporte Oficial</p>
                </div>
              </div>

              {/* Tabla de Datos Dinámica */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-neutral-100 text-neutral-700 font-bold uppercase text-xs">
                    <tr>
                      {Object.keys(reportData[0] || {}).map((key) => (
                        <th key={key} className="px-4 py-3 border-b border-neutral-200">{key.replace('_', ' ')}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {reportData.map((row, i) => (
                      <tr key={i} className="hover:bg-neutral-50">
                        {Object.values(row).map((val: any, j) => (
                          <td key={j} className="px-4 py-3 text-neutral-800">
                            {typeof val === 'number' ? `$${val.toLocaleString('en-US', {minimumFractionDigits:2})}` : val}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {reportData.length === 0 && (
                      <tr><td colSpan={10} className="px-4 py-8 text-center text-neutral-500">No hay datos para este rango de fechas.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report, #printable-report * {
            visibility: visible;
          }
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            padding: 0;
            margin: 0;
            background-color: white !important;
          }
        }
      `}} />

    </div>
  );
}
