const fs = require('fs');
let code = fs.readFileSync('src/components/providers/EmpresaProvider.tsx', 'utf8');

const oldCtx = "formatCurrency: (amount: number) => `\\$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,";
const newCtx = "formatCurrency: (amount: number) => `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,";

code = code.replace(oldCtx, newCtx);
fs.writeFileSync('src/components/providers/EmpresaProvider.tsx', code, 'utf8');
