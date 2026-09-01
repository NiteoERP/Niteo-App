const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/caja/resumen/page.tsx', 'utf-8');

// Add imports
const importsToAdd = `
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText, Table } from 'lucide-react';
`;

code = code.replace(
  /import \{ ArrowLeft, Calendar, Loader2, MapPin, Download \} from 'lucide-react';/,
  "import { ArrowLeft, Calendar, Loader2, MapPin, Download, FileText, Table } from 'lucide-react';"
);

code = code.replace(
  /import \{ getSedes \} from '@\/actions\/sedes-actions';/,
  `import { getSedes } from '@/actions/sedes-actions';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';`
);

// Add export functions before return statement
const exportFunctions = `
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
    
    XLSX.writeFile(wb, \`Resumen_Pagos_\${fechaInicio}_\${fechaFin}.xlsx\`);
  };

  const exportPDF = () => {
    if (data.length === 0) return;
    
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(16);
    doc.text('Resumen de Pagos', 14, 15);
    doc.setFontSize(10);
    doc.text(\`Desde: \${fechaInicio} Hasta: \${fechaFin}\`, 14, 22);
    
    const head = [['FECHA', 'TOTAL USD', ...methods]];
    
    const body = data.map(row => {
      const rowData = [
        new Date(row.fecha + 'T12:00:00Z').toLocaleDateString('es-VE'),
        \`$\${row.total_usd.toFixed(2)}\`
      ];
      methods.forEach(m => {
        rowData.push(row.metodos[m] ? \`$\${row.metodos[m].toFixed(2)}\` : '-');
      });
      return rowData;
    });
    
    const foot = [['TOTALES', \`$\${grandTotal.toFixed(2)}\`, ...methods.map(m => \`$\${methodTotals[m].toFixed(2)}\`)]];
    
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
    
    doc.save(\`Resumen_Pagos_\${fechaInicio}_\${fechaFin}.pdf\`);
  };

  return (
`;

code = code.replace(/  return \(/, exportFunctions);

// Add buttons to header
const headerRegex = /<div className="flex items-center gap-4">\s*<Link href="\/dashboard\/caja"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
const headerMatch = code.match(headerRegex);

if (headerMatch) {
  const newHeader = headerMatch[0].replace(
    /<\/div>\s*<\/div>$/,
    `</div>
        
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
      </div>`
  );
  code = code.replace(headerMatch[0], newHeader);
}

fs.writeFileSync('src/app/dashboard/caja/resumen/page.tsx', code);
