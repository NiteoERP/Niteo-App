const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/caja/[id]/page.tsx', 'utf-8');

code = code.replace(
  /\)\.map\(\(\[metodo, data\]\) => \(/g,
  ').map(([metodo, data]: [string, any]) => ('
);

fs.writeFileSync('src/app/dashboard/caja/[id]/page.tsx', code);
