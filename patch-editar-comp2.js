const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', 'utf-8');

code = code.replace(
  /else if \(initialSedeId\) setSelectedSedeId\(initialSedeId\);/g,
  ''
);

code = code.replace(
  /setTransacciones\(\(cierreRes \|\| \{\}\)\.transacciones\);/g,
  'setTransacciones((cierreRes || {}).transacciones || []);'
);

fs.writeFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', code);
