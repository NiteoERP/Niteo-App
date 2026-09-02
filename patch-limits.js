const fs = require('fs');

// Fix creditos page
let code = fs.readFileSync('src/app/dashboard/creditos/page.tsx', 'utf-8');
code = code.replace(`useState<Date>(new Date('2020-01-01'))`, `useState<Date>(new Date('2000-01-01'))`);
code = code.replace(`useState<Date>(new Date())`, `useState<Date>(new Date('2100-01-01'))`);
fs.writeFileSync('src/app/dashboard/creditos/page.tsx', code);

// Fix proveedores actions limit
let provCode = fs.readFileSync('src/app/dashboard/proveedores/actions.ts', 'utf-8');
provCode = provCode.replace(`.limit(10);`, `; // removed limit to show all`);
fs.writeFileSync('src/app/dashboard/proveedores/actions.ts', provCode);
