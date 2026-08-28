const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/finanzas/page.tsx', 'utf8');

code = code.replace(
  "return new Intl.NumberFormat('es-US', { style: 'currency', currency: 'USD' }).format(val);",
  "return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' USD';"
);

fs.writeFileSync('src/app/dashboard/finanzas/page.tsx', code, 'utf8');
