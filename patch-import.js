const fs = require('fs');

let nuevoCode = fs.readFileSync('src/app/dashboard/caja/nuevo/page.tsx', 'utf-8');
nuevoCode = nuevoCode.replace(
  /import \{ Plus, Trash2, Wallet/,
  `import { ArrowLeft, Plus, Trash2, Wallet`
);

fs.writeFileSync('src/app/dashboard/caja/nuevo/page.tsx', nuevoCode);
