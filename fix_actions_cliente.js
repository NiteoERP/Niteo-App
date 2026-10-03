const fs = require('fs');
let content = fs.readFileSync('src/actions/cierres-actions.ts', 'utf8');

// Update getCierreParaEditar
const queryRegex = /\.select\('\*'\)\r?\n\s*\.eq\('cierre_id', cierreId\);/;
if (content.includes(".select('*')")) {
  // It fetches '*' so cliente is already fetched.
}

// Update insert logic in guardarCierre
const transaccionesConIdRegex = /const transaccionesConId = transacciones\.map\(t => \(\{\r?\n\s*cierre_id: (nuevoCierre\.id|cierreId),\r?\n\s*metodo: t\.metodo,\r?\n\s*banco: t\.banco,\r?\n\s*referencia: t\.referencia,\r?\n\s*monto: t\.monto,\r?\n\s*moneda: t\.moneda\r?\n\s*\}\)\);/g;

content = content.replace(transaccionesConIdRegex, (match, idVar) => {
  return `const transaccionesConId = transacciones.map(t => ({
      cierre_id: ${idVar},
      metodo: t.metodo,
      banco: t.banco,
      referencia: t.referencia,
      cliente: t.cliente,
      monto: t.monto,
      moneda: t.moneda
    }));`;
});

fs.writeFileSync('src/actions/cierres-actions.ts', content, 'utf8');
