const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/informes/page.tsx', 'utf-8');

// Replace the onClick handler for the "Generar Informe" buttons (both Mobile and Desktop)
// Mobile button is inside the DesktopReportPanel component (passed as onGenerate) and also inside the return block directly for some reason?
// Actually, let's just replace all occurrences of:
// onClick={() => handleGenerate(selectedReport.id, sheetStartDate, sheetEndDate)}
// with:
// onClick={() => setShowPreviewModal(true)}
code = code.replace(
  /onClick=\{\(\) => handleGenerate\(selectedReport\.id, sheetStartDate, sheetEndDate\)\}/g,
  'onClick={() => setShowPreviewModal(true)}'
);

code = code.replace(
  /onGenerate=\{\(\) => handleGenerate\(selectedReport\.id, sheetStartDate, sheetEndDate\)\}/g,
  'onGenerate={() => setShowPreviewModal(true)}'
);

// Replace "Generar Informe" text with "Generar Documento"
code = code.replace(
  /> Generar Informe<\/>/g,
  '> Generar Documento</>'
);

// Also change the icon from BarChart2 to FileText
code = code.replace(
  /<BarChart2 size=\{18\} \/> Generar Documento/g,
  '<FileText size={18} /> Generar Documento'
);

fs.writeFileSync('src/app/dashboard/informes/page.tsx', code);
