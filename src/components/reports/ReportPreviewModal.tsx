import React from 'react';
import { Printer, Download, FileText, FileSpreadsheet, X } from 'lucide-react';

interface ReportPreviewProps {
  data: any[];
  kpis: any;
  range: string;
  onClose: () => void;
}

export default function ReportPreviewModal({ data, kpis, range, onClose }: ReportPreviewProps) {
  
  const formatMoney = (val: number) => `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const getRangeLabel = () => {
    switch(range) {
      case 'today': return 'Hoy';
      case '7days': return 'Últimos 7 Días';
      case 'lastMonth': return 'Mes Anterior';
      case 'thisMonth': return 'Este Mes';
      default: return range;
    }
  };

  // --- EXPORT LOGIC ---

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    // Generar CSV
    let csv = 'Día,Ventas Brutas,Costo Insumos (COGS),Mermas,Gastos Operativos,Utilidad Neta\n';
    data.forEach(row => {
      csv += `${row.dia},${row.ventas_brutas},${row.cogs},${row.mermas},${row.gastos_operativos},${row.utilidad_neta}\n`;
    });
    // Añadir fila de totales
    csv += `TOTAL,${kpis.ventas},${kpis.cogs},${kpis.mermas},${kpis.gastos},${kpis.utilidad}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_niteo_${range}.csv`;
    link.click();
  };

  const handleExportWord = () => {
    const reportHtml = document.getElementById('printable-report')?.innerHTML;
    if (!reportHtml) return;

    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Reporte Niteo</title><style>table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background-color:#f2f2f2;}</style></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + reportHtml + footer;
    
    const blob = new Blob(['\\ufeff', sourceHTML], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_niteo_${range}.doc`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm print:p-0 print:bg-white print:block">
      
      {/* Ventana Modal */}
      <div className="bg-white dark:bg-neutral-900 w-full max-w-5xl h-[90vh] sm:h-auto max-h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden print:w-full print:h-auto print:max-h-none print:shadow-none print:rounded-none">
        
        {/* Barra de Herramientas (No visible al imprimir) */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 print:hidden">
          <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-200">Vista Previa del Reporte</h2>
          <div className="flex items-center gap-2 overflow-x-auto">
            <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-sm font-medium rounded-lg transition-colors">
              <Printer size={16} /> Imprimir / PDF
            </button>
            <button onClick={handleExportExcel} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-sm font-medium rounded-lg transition-colors">
              <FileSpreadsheet size={16} /> Excel (CSV)
            </button>
            <button onClick={handleExportWord} className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-sm font-medium rounded-lg transition-colors">
              <FileText size={16} /> Word
            </button>
            <div className="w-px h-6 bg-neutral-300 dark:bg-neutral-700 mx-2"></div>
            <button onClick={onClose} className="p-1.5 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Contenido del Reporte (Este div es el que se exporta y se imprime) */}
        <div className="flex-1 overflow-auto p-8 bg-white text-black" id="printable-report">
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-neutral-900 uppercase tracking-tight">Reporte Financiero</h1>
            <p className="text-neutral-500 mt-1">Periodo: <span className="font-bold">{getRangeLabel()}</span> | Generado el: {new Date().toLocaleDateString()}</p>
          </div>

          {/* Resumen KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <p className="text-xs font-bold text-neutral-500 uppercase mb-1">Ventas Brutas</p>
              <h3 className="text-xl font-black text-green-700">{formatMoney(kpis.ventas)}</h3>
            </div>
            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <p className="text-xs font-bold text-neutral-500 uppercase mb-1">Costo (COGS)</p>
              <h3 className="text-xl font-black text-orange-600">{formatMoney(kpis.cogs)}</h3>
            </div>
            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <p className="text-xs font-bold text-neutral-500 uppercase mb-1">Gastos Opex</p>
              <h3 className="text-xl font-black text-purple-600">{formatMoney(kpis.gastos)}</h3>
            </div>
            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <p className="text-xs font-bold text-neutral-500 uppercase mb-1">Utilidad Neta</p>
              <h3 className={`text-xl font-black ${kpis.utilidad >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{formatMoney(kpis.utilidad)}</h3>
            </div>
          </div>

          {/* Tabla de Datos */}
          <div className="border border-neutral-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-neutral-100 text-neutral-600 uppercase text-xs font-bold border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Ventas</th>
                  <th className="px-4 py-3 text-right">COGS</th>
                  <th className="px-4 py-3 text-right">Gastos</th>
                  <th className="px-4 py-3 text-right">Utilidad Neta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {data.map((row, i) => (
                  <tr key={i} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium text-neutral-900">{row.dia}</td>
                    <td className="px-4 py-3 text-right text-neutral-700">{formatMoney(row.ventas_brutas)}</td>
                    <td className="px-4 py-3 text-right text-neutral-700">{formatMoney(row.cogs)}</td>
                    <td className="px-4 py-3 text-right text-neutral-700">{formatMoney(row.gastos_operativos)}</td>
                    <td className="px-4 py-3 text-right font-bold text-neutral-900">{formatMoney(row.utilidad_neta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 text-center text-xs text-neutral-400 border-t border-neutral-200 pt-4">
            Generado automáticamente por Niteo ERP. Documento para uso interno y contable.
          </div>

        </div>

      </div>

      {/* Estilos para forzar el print correcto */}
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
          }
        }
      `}} />

    </div>
  );
}
