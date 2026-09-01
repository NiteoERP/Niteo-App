const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/informes/page.tsx', 'utf-8');

// 1. Add jsPDF and autoTable imports
code = code.replace(
  /import \* as XLSX from 'xlsx';/,
  `import * as XLSX from 'xlsx';\nimport jsPDF from 'jspdf';\nimport autoTable from 'jspdf-autotable';`
);

// 2. Remove setShowPreviewModal(true)
code = code.replace(/setShowPreviewModal\(true\);/g, '');

// 3. Auto-generate effect
const handleGenStart = `  const handleGenerate = async (`;
if (code.includes(handleGenStart)) {
  const autoGenEffect = `
  useEffect(() => {
    if (selectedReport && sheetStartDate && sheetEndDate) {
      handleGenerate(selectedReport.id, sheetStartDate, sheetEndDate);
    }
  }, [selectedReport, sheetStartDate, sheetEndDate, categoriaFilter, cajeroFilter, clienteFilter]);

  const handleGenerate = async (`;
  code = code.replace(handleGenStart, autoGenEffect);
}

// 4. Update the "Generar Informe" button to just say "Generar PDF" and "Excel" in BOTH desktop and mobile.
const renderResultTable = `
function ResultTable({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;
  const keys = Object.keys(data[0]);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl relative w-full">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-neutral-400 uppercase bg-neutral-950/50 border-b border-neutral-800">
            <tr>
              {keys.map((key, i) => (
                <th key={key} className={\`px-6 py-4 font-bold \${i === 0 ? 'sticky left-0 bg-neutral-950 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]' : ''}\`}>
                  {key.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/50">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-neutral-800/30 transition-colors">
                {keys.map((key, i) => {
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
  );
}
`;

// Insert the ResultTable function at the bottom of the file
code = code + "\\n" + renderResultTable;

// Replace all occurrences of ResultCards and MiniBarChart with ResultTable
code = code.replace(/<ResultCards data=\{reportData\} \/>/g, '<ResultTable data={reportData} />');
code = code.replace(/<MiniBarChart data=\{reportData\} \/>/g, '');

// 5. PDF & Excel Exports
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

// 6. Replace both 'Generar Informe' buttons with PDF / Excel buttons
const mobileButton = /<\!-- Botón generar -->\s*<button[\s\S]*?onClick=\{\(\) => handleGenerate\([\s\S]*?<\/button>/g;
const desktopButton = /\{\/\* Botón generar \*\/\}\s*<button[\s\S]*?onClick=\{\(\) => handleGenerate\([\s\S]*?<\/button>/g;

const buttonsHTML = `
          {/* Botones Exportar */}
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
code = code.replace(mobileButton, buttonsHTML);
code = code.replace(desktopButton, buttonsHTML);

fs.writeFileSync('src/app/dashboard/informes/page.tsx', code);
