const fs = require('fs');

let code = fs.readFileSync('src/components/pos/HistorialVentas.tsx', 'utf-8');

code = code.replace(/const updated = await getHistorialVentasCompleto\(sedeId\);/g, 
  `const updated = await getHistorialVentasCompleto(sedeId, format(calMonth, 'yyyy-MM'));`);

fs.writeFileSync('src/components/pos/HistorialVentas.tsx', code);
