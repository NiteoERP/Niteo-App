const fs = require('fs');
let code = fs.readFileSync('src/components/pos/HistorialVentas.tsx', 'utf8');

const regex = /<span className="text-sm font-medium text-white">\{venta\.cliente_nombre \|\| 'Unknown'\}<\/span>/;
const replacement = `<span className="text-sm font-medium text-white">{venta.numero_orden ? \`\${venta.numero_orden}\` : (venta.cliente_nombre || 'Unknown')}</span>`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/components/pos/HistorialVentas.tsx', code, 'utf8');
