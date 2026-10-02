const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/inventario/InsumosManager.tsx', 'utf8');

content = content.replace(/className=\{px-4 py-1\.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors \}/g, "className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterCategoria === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'}`}");

fs.writeFileSync('src/app/dashboard/inventario/InsumosManager.tsx', content, 'utf8');
console.log('Fixed using Node');