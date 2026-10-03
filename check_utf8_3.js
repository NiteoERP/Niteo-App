const fs = require('fs');
const str = fs.readFileSync('src/app/dashboard/proveedores/page.tsx', 'utf8');
console.log(str.substring(str.indexOf('Hubo un problema de conex'), str.indexOf('Hubo un problema de conex') + 50));