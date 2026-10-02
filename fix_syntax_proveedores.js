const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/proveedores/page.tsx', 'utf8');

content = content.replace(/className=\{grid grid-cols-1  gap-2\.5\}/g, "className={`grid grid-cols-1 gap-2.5 ${!crearInsumoNuevo ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}");

fs.writeFileSync('src/app/dashboard/proveedores/page.tsx', content, 'utf8');
console.log('Fixed syntax using Node');