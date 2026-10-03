const fs = require('fs');
const file = 'src/app/dashboard/inventario/InsumosManager.tsx';
const buffer = fs.readFileSync(file);
const str = buffer.toString('latin1');
// Let's print a snippet around index 1560 to see if it makes sense as latin1
console.log(str.substring(1500, 1600));