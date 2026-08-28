const fs = require('fs');
let code = fs.readFileSync('src/components/pos/HistorialVentas.tsx', 'utf8');

const oldClientRender = "{venta.cliente_nombre || 'Consumidor Final'}";
const newClientRender = "{venta.numero_orden ? venta.numero_orden : (venta.cliente_nombre && venta.cliente_nombre !== 'Unknown' ? venta.cliente_nombre : 'Consumidor Final')}";

code = code.replace(oldClientRender, newClientRender);

fs.writeFileSync('src/components/pos/HistorialVentas.tsx', code, 'utf8');
