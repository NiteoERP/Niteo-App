const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/informes/page.tsx', 'utf-8');

// Replace onClick handler in Mobile View
code = code.replace(
  /onClick=\{\(\) => handleGenerate\(selectedReport\.id, sheetStartDate, sheetEndDate\)\}/g,
  'onClick={() => setShowPreviewModal(true)}'
);

// Replace onGenerate handler passed to DesktopReportPanel
code = code.replace(
  /onGenerate=\{\(\) => handleGenerate\(selectedReport\.id, sheetStartDate, sheetEndDate\)\}/g,
  'onGenerate={() => setShowPreviewModal(true)}'
);

// Change text to Generar Documento
code = code.replace(
  /> Generar Reporte<\/>/g,
  '> Generar Documento</>'
);

// Change icon for the button (BarChart2 -> FileText)
code = code.replace(
  /<BarChart2 size=\{16\} \/> Generar Documento/g,
  '<FileText size={16} /> Generar Documento'
);

code = code.replace(
  /<BarChart2 size=\{18\} \/> Generar Documento/g,
  '<FileText size={18} /> Generar Documento'
);

fs.writeFileSync('src/app/dashboard/informes/page.tsx', code);
