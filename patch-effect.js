const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/informes/page.tsx', 'utf-8');

const handleGenStart = `  const handleGenerate = async (`;
if (code.includes(handleGenStart) && !code.includes('useEffect(() => {\n    if (selectedReport && sheetStartDate')) {
  const autoGenEffect = `
  useEffect(() => {
    if (selectedReport && sheetStartDate && sheetEndDate) {
      handleGenerate(selectedReport.id, sheetStartDate, sheetEndDate);
    }
  }, [selectedReport, sheetStartDate, sheetEndDate, categoriaFilter, cajeroFilter, clienteFilter]);

  const handleGenerate = async (`;
  code = code.replace(handleGenStart, autoGenEffect);
}

// Remove setShowPreviewModal(true) from handleGenerate so it doesn't open modal on every filter change
code = code.replace(/setShowPreviewModal\(true\);/g, '');

fs.writeFileSync('src/app/dashboard/informes/page.tsx', code);
