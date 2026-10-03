const fs = require('fs');
const file = 'src/app/dashboard/inventario/InsumosManager.tsx';
const content = fs.readFileSync(file, 'utf8');
console.log(content.substring(1500, 1600));