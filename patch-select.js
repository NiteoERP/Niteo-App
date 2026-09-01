const fs = require('fs');

let code = fs.readFileSync('src/actions/cierres-actions.ts', 'utf-8');

code = code.replace(
  /\.select\('\*, sedes\(nombre_sede\), usuarios\(nombre\)'\)/g,
  `.select('*, sedes(nombre_sede)')`
);

fs.writeFileSync('src/actions/cierres-actions.ts', code);
