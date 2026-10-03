const fs = require('fs');
const file = 'src/app/dashboard/inventario/InsumosManager.tsx';
const buffer = fs.readFileSync(file);
const str = buffer.toString('latin1');
fs.writeFileSync(file, str, 'utf8');
console.log('Fixed encoding in InsumosManager.tsx');