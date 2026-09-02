const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/proveedores/actions.ts', 'utf-8');

code = code.replace(`.select('id, numero_factura, concepto, total, saldo_pendiente, fecha_emision')`, `.select('id, numero_factura, concepto, total, saldo_pendiente, fecha_emision, pagos:compras_pagos(id, monto, metodo_pago, referencia, created_at)')`);

fs.writeFileSync('src/app/dashboard/proveedores/actions.ts', code);
