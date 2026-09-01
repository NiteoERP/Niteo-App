const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', 'utf-8');

code = code.replace(
  /if \(cierreRes\.targetSedeId\)/g,
  'if (false)'
);
code = code.replace(
  /cierreRes\./g,
  '(cierreRes || {}).'
);

fs.writeFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', code);
