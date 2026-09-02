const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/inventario/page.tsx', 'utf-8');

code = code.replace(`  if (currentTab === 'insumos') {`, `  if (currentTab === 'insumos' || currentTab === 'transformaciones') {`);

fs.writeFileSync('src/app/dashboard/inventario/page.tsx', code);
