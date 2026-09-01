const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/informes/page.tsx', 'utf-8');

const startPivot = `if (reportId === 'ventas_metodos_pago'`;
const startIndex = code.indexOf(startPivot);
if (startIndex !== -1) {
  // find the previous '// Pivot' comment
  let realStart = code.lastIndexOf('// Pivot', startIndex);
  if (realStart === -1) realStart = startIndex;
  
  const endIndex = code.indexOf('setReportData(data);', startIndex);
  if (endIndex !== -1) {
    code = code.substring(0, realStart) + code.substring(endIndex);
  }
}

fs.writeFileSync('src/app/dashboard/informes/page.tsx', code);
