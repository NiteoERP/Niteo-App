const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/compras/ComprasClient.tsx', 'utf8');

code = code.replace(
  "const formatCurrency = (val: number) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(val);",
  "const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' USD';"
);

fs.writeFileSync('src/app/dashboard/compras/ComprasClient.tsx', code, 'utf8');
