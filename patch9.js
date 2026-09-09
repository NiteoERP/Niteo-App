const fs = require('fs');
let p = fs.readFileSync('src/app/dashboard/proveedores/page.tsx', 'utf8');

// replace all instances of duplicate classNames
p = p.replace(/className="bg-neutral-900 text-white"\s+className="bg-neutral-900 text-white"/g, 'className="bg-neutral-900 text-white"');
p = p.replace(/className="bg-neutral-900 text-white"\s+value="([^"]*)"\s+className="bg-neutral-900 text-white"/g, 'className="bg-neutral-900 text-white" value="$1"');

fs.writeFileSync('src/app/dashboard/proveedores/page.tsx', p);
console.log('✅ Duplicates fixed');
