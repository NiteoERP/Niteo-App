const fs = require('fs');
let code = fs.readFileSync('src/components/pos/HistorialVentas.tsx', 'utf8');

const oldText = "{venta.pagos?.length > 0 ? venta.pagos.map(p => p.tipo_pago).join(', ') : 'No registrado'}";
const newText = "{venta.pagos?.length > 0 ? venta.pagos.map(p => p.tipo_pago).join(', ') : (venta.esta_pagado ? 'No registrado' : 'A Crédito / Por pagar')}";

code = code.replace(oldText, newText);

fs.writeFileSync('src/components/pos/HistorialVentas.tsx', code, 'utf8');
