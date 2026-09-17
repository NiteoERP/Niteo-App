const fs = require('fs');
let c = fs.readFileSync('src/actions/pos-actions.ts', 'utf-8');

c = c.replace(
    /gte\('fecha_venta', `\$\{fechaFiltro\}-01T00:00:00\+00:00`\)/g,
    `gte('fecha_venta', \`\${fechaFiltro}-01T00:00:00-04:00\`)`
);
c = c.replace(
    /lte\('fecha_venta', `\$\{fechaFiltro\}-31T23:59:59\.999\+00:00`\)/g,
    `lte('fecha_venta', \`\${fechaFiltro}-31T23:59:59.999-04:00\`)`
);
c = c.replace(
    /gte\('fecha_venta', `\$\{fechaFiltro\}T00:00:00\+00:00`\)/g,
    `gte('fecha_venta', \`\${fechaFiltro}T00:00:00-04:00\`)`
);
c = c.replace(
    /lte\('fecha_venta', `\$\{fechaFiltro\}T23:59:59\.999\+00:00`\)/g,
    `lte('fecha_venta', \`\${fechaFiltro}T23:59:59.999-04:00\`)`
);

c = c.replace(
    /producto_nombre: d\.productos\?\.nombre,/g,
    `producto_nombre: d.productos?.nombre || 'Desconocido',`
);

fs.writeFileSync('src/actions/pos-actions.ts', c);
