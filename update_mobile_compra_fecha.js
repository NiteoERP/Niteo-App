const fs = require('fs');
let content = fs.readFileSync('src/components/compras/MobileCompraForm.tsx', 'utf8');

content = content.replace(
  "proveedor: proveedor || 'Proveedor General',\r\n        moneda: monedaGlobal,",
  "proveedor: proveedor || 'Proveedor General',\r\n        fecha_emision: fechaEmision,\r\n        moneda: monedaGlobal,"
);
content = content.replace(
  "proveedor: proveedor || 'Proveedor General',\n        moneda: monedaGlobal,",
  "proveedor: proveedor || 'Proveedor General',\n        fecha_emision: fechaEmision,\n        moneda: monedaGlobal,"
);

fs.writeFileSync('src/components/compras/MobileCompraForm.tsx', content, 'utf8');