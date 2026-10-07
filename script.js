const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/clientes/page.tsx', 'utf8');

code = code.replace(
  'const clientes = (clientesRaw || []).map(c => {',
  `const clientes = (clientesRaw || []).filter(c => 
    c.nombre !== 'Consumidor Final' && 
    ((c.rif_cedula && c.rif_cedula.trim() !== '') || (c.telefono && c.telefono.trim() !== ''))
  ).map(c => {`
);

fs.writeFileSync('src/app/dashboard/clientes/page.tsx', code, 'utf8');
