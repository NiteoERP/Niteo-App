const fs = require('fs');
let code = fs.readFileSync('src/components/providers/EmpresaProvider.tsx', 'utf8');

code = code.replace(
  "formatCurrency: (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,",
  "formatCurrency: (amount: number) => `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,"
);

fs.writeFileSync('src/components/providers/EmpresaProvider.tsx', code, 'utf8');
