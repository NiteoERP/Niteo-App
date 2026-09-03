const fs = require('fs');
let code = fs.readFileSync('src/components/providers/EmpresaProvider.tsx', 'utf8');

const oldFunc = `  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount === null) return \`\${empresa?.simbolo_moneda || '$'}0.00\`;
    
    // Si tenemos una moneda ISO y el navegador la soporta, la usamos. Si no, fallback manual.
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: empresa?.moneda || 'USD',
        currencyDisplay: 'narrowSymbol'
      }).format(amount);
    } catch (e) {
      return \`\${empresa?.simbolo_moneda || '$'}\${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`;
    }
  };`;

const newFunc = `  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount === null) return \`0.00 \${empresa?.moneda || 'USD'}\`;
    
    return \`\${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} \${empresa?.moneda || 'USD'}\`;
  };`;

code = code.replace(oldFunc, newFunc);
fs.writeFileSync('src/components/providers/EmpresaProvider.tsx', code, 'utf8');
