const fs = require('fs');

let code = fs.readFileSync('src/components/pos/HistorialVentas.tsx', 'utf-8');

// The line we need to change:
// getHistorialVentasCompleto(sedeId).then(setAllMonthVentas);
// Let's replace all occurrences with format(calMonth, 'yyyy-MM')

code = code.replace(/getHistorialVentasCompleto\(sedeId\)\.then\(setAllMonthVentas\);/g, 
  `getHistorialVentasCompleto(sedeId, format(calMonth, 'yyyy-MM')).then(setAllMonthVentas);`);

fs.writeFileSync('src/components/pos/HistorialVentas.tsx', code);
