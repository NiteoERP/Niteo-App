const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/informes/page.tsx', 'utf-8');

// 1. Remove Printer import and add jsPDF / autoTable
code = code.replace(
  /import \* as XLSX from 'xlsx';/,
  `import * as XLSX from 'xlsx';\nimport jsPDF from 'jspdf';\nimport autoTable from 'jspdf-autotable';`
);

// 2. Remove showPreviewModal state
code = code.replace(
  /const \[showPreviewModal, setShowPreviewModal\] = useState\(false\);/,
  ''
);

// 3. Add auto-generation effect
const handleGenStart = `  const handleGenerate = async (`;
if (code.includes(handleGenStart)) {
  const autoGenEffect = `
  useEffect(() => {
    if (selectedReport && sheetStartDate && sheetEndDate) {
      handleGenerate(selectedReport.id, sheetStartDate, sheetEndDate);
    }
  }, [selectedReport, sheetStartDate, sheetEndDate, sedeFilter, categoriaFilter, cajeroFilter, clienteFilter]);

  const handleGenerate = async (`;
  code = code.replace(handleGenStart, autoGenEffect);
}

// 4. Remove the big "Generar Informe" button and replace with PDF/Excel buttons
const genButtonRegex = /<\!-- Botón generar -->[\s\S]*?<\/button>/;
const genButtonAlternative = /\{\/\* Botón generar \*\/\}[\s\S]*?<\/button>/;

const newExportButtons = `
          {/* Botones de Exportación */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={exportPDF}
              disabled={!reportData || reportData.length === 0}
              className="flex-1 h-12 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-50
                         text-rose-500 border border-rose-500/20 font-bold rounded-xl flex items-center justify-center gap-2
                         transition-colors"
            >
              <FileText size={18} /> PDF
            </button>
            <button
              onClick={exportExcel}
              disabled={!reportData || reportData.length === 0}
              className="flex-1 h-12 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50
                         text-emerald-500 border border-emerald-500/20 font-bold rounded-xl flex items-center justify-center gap-2
                         transition-colors"
            >
              <FileSpreadsheet size={18} /> Excel
            </button>
          </div>
`;
code = code.replace(genButtonAlternative, newExportButtons);


// 5. Replace exportExcel and add exportPDF
const exportExcelRegex = /const exportExcel = \(\) => \{[\s\S]*?\.xlsx\`\);\n  \};/;
const newExports = `
  const exportExcel = () => {
    if (!reportData || reportData.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(reportData);
    const colWidths: number[] = [];
    reportData.forEach(row =>
      Object.entries(row).forEach(([k, v], i) => {
        colWidths[i] = Math.max(colWidths[i] || 0, String(v ?? '').length, k.length);
      })
    );
    ws['!cols'] = colWidths.map(w => ({ width: w + 2 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    XLSX.writeFile(wb, \`\${selectedReportName.replace(/ /g, '_')}_\${format(new Date(), 'yyyyMMdd')}.xlsx\`);
  };

  const exportPDF = () => {
    if (!reportData || reportData.length === 0) return;
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229);
    doc.text('NITEO ERP', 14, 20);
    
    doc.setFontSize(14);
    doc.setTextColor(10, 10, 10);
    doc.text(selectedReportName, 14, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(\`Período: \${format(sheetStartDate, 'dd/MM/yyyy')} - \${format(sheetEndDate, 'dd/MM/yyyy')}\`, 14, 36);
    doc.text(\`Generado el: \${new Date().toLocaleString()}\`, 14, 42);

    const keys = Object.keys(reportData[0] || {});
    const head = [keys.map(k => k.replace(/_/g, ' ').toUpperCase())];
    
    const body = reportData.map(row => {
      return keys.map(k => {
        const val = row[k];
        if (typeof val === 'number') {
          return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return String(val ?? '');
      });
    });

    autoTable(doc, {
      startY: 50,
      head: head,
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [24, 24, 27], textColor: 255 },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      styles: { fontSize: 9 },
    });
    
    doc.save(\`\${selectedReportName.replace(/ /g, '_')}_\${format(new Date(), 'yyyyMMdd')}.pdf\`);
  };
`;
code = code.replace(exportExcelRegex, newExports);

// 6. Replace everything from {/* Columna Resultados */} all the way to the end of the return statement.
const rightColStart = `{/* Columna Resultados */}`;
const startIndex = code.indexOf(rightColStart);

if (startIndex !== -1) {
  // Find where the component's main return ends.
  // We can just find `  );` before `}` of the component.
  // Actually, there's `    </div>\n  );\n}\n\n// --- Mini bar chart ---`
  const endMarker = '  );\n}';
  const endIndex = code.indexOf(endMarker, startIndex);
  
  if (endIndex !== -1) {
    const newRightColumn = `{/* Columna Resultados */}
        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar p-6 bg-neutral-950">
          {!reportData && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-neutral-700 gap-3">
              <BarChart2 size={48} className="opacity-20" />
              <p className="text-sm">Configura los filtros y selecciona un informe</p>
            </div>
          )}
          {isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-neutral-700 gap-3">
              <Loader2 size={32} className="animate-spin text-indigo-400" />
              <p className="text-sm animate-pulse">Generando reporte...</p>
            </div>
          )}
          {reportData && !isLoading && reportData.length > 0 && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl relative">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-neutral-400 uppercase bg-neutral-950/50 border-b border-neutral-800">
                    <tr>
                      {Object.keys(reportData[0]).map((key, i) => (
                        <th key={key} className={\`px-6 py-4 font-bold \${i === 0 ? 'sticky left-0 bg-neutral-950 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]' : ''}\`}>
                          {key.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50">
                    {reportData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-neutral-800/30 transition-colors">
                        {Object.keys(row).map((key, i) => {
                          const val = row[key];
                          const isNumber = typeof val === 'number';
                          return (
                            <td key={key} className={\`px-6 py-3 \${i === 0 ? 'font-medium text-white whitespace-nowrap sticky left-0 bg-neutral-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] z-10' : 'text-neutral-300'}\`}>
                              {isNumber ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(val ?? '')}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {reportData && !isLoading && reportData.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-neutral-700 gap-3">
              <p className="text-sm">No se encontraron resultados para los filtros seleccionados.</p>
            </div>
          )}
        </div>
      </div>
    </div>`;
    
    code = code.substring(0, startIndex) + newRightColumn + code.substring(endIndex);
  }
}

// 7. Remove MiniBarChart and ResultCards components from the bottom of the file
const componentsToRemove = ['function MiniBarChart', 'function ResultCards'];
componentsToRemove.forEach(comp => {
  const compIndex = code.indexOf(comp);
  if (compIndex !== -1) {
    code = code.substring(0, compIndex);
  }
});

fs.writeFileSync('src/app/dashboard/informes/page.tsx', code);
