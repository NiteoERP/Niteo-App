const fs = require('fs');

let code = fs.readFileSync('src/components/pos/HistorialVentas.tsx', 'utf-8');
code = code.replace('Mtodos de Pago', 'Métodos de Pago');
fs.writeFileSync('src/components/pos/HistorialVentas.tsx', code);
