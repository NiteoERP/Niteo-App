const fs = require('fs');
let code = fs.readFileSync('src/actions/compras-actions.ts', 'utf-8');

code = code.replace(
  /moneda: 'USD' \| 'VES';\s+tasa: number;/,
  `moneda: 'USD' | 'VES';
    tasa: number;
    metodo_pago: string;`
);

code = code.replace(
  /metodo_pago: factura\.moneda === 'USD' \? 'Efectivo USD' : 'Transferencia BS',/,
  "metodo_pago: factura.metodo_pago || (factura.moneda === 'USD' ? 'Efectivo USD' : 'Transferencia BS'),"
);

fs.writeFileSync('src/actions/compras-actions.ts', code);
