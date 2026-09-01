const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/informes/page.tsx', 'utf-8');

const pivotStart = `// Pivot para mǸtodos de pago`;
const pivotEnd = `setReportData(data);`;

const startIndex = code.indexOf(pivotStart);
if (startIndex !== -1) {
  const endIndex = code.indexOf(pivotEnd, startIndex);
  if (endIndex !== -1) {
    code = code.substring(0, startIndex) + code.substring(endIndex);
  }
}

fs.writeFileSync('src/app/dashboard/informes/page.tsx', code);
