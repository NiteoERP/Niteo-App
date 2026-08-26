const fs = require('fs');
let code = fs.readFileSync('src/components/pos/HistorialVentas.tsx', 'utf8');

code = code.replace(
  "No hay ventas registradas {fechaFiltro ? 'hasta esta fecha' : 'recientemente'}.",
  "No hay ventas registradas {fechaFiltro ? 'en esta fecha' : 'recientemente'}."
);

fs.writeFileSync('src/components/pos/HistorialVentas.tsx', code, 'utf8');
