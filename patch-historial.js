const fs = require('fs');
let c = fs.readFileSync('src/components/pos/HistorialVentas.tsx', 'utf-8');

c = c.replace(
    /getHistorialVentasCompleto\(sedeId, fechaFiltro \|\| undefined, page, 50\)/g,
    `getHistorialVentasCompleto(sedeId, fechaFiltro || undefined, page, 100)`
);

c = c.replace(
    /ventas\.length < 50/g,
    `ventas.length < 100`
);

c = c.replace(
    /\{d\.producto_nombre \|\| 'Producto'\}/g,
    `{d.producto_nombre || 'Item Desconocido'}`
);

fs.writeFileSync('src/components/pos/HistorialVentas.tsx', c);
