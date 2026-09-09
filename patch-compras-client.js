const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/compras/ComprasClient.tsx', 'utf-8');

code = code.replace(/let txt = compra\.detalles \|\| '';/g, "let txt = compra.raw_detalles || compra.detalles || '';");

fs.writeFileSync('src/app/dashboard/compras/ComprasClient.tsx', code);
console.log("Client script patched");
