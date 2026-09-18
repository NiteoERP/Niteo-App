const fs = require('fs');

// 1. Patch HistorialVentas.tsx
let h = fs.readFileSync('src/components/pos/HistorialVentas.tsx', 'utf-8');

h = h.replace(
  `const dateOpts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };`,
  `const dateOpts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', timeZone: 'UTC' };
    const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' };`
);

h = h.replace(
  `const ventaDate = format(parseISO(v.fecha_venta), 'yyyy-MM-dd');`,
  `const ventaDate = v.fecha_venta ? v.fecha_venta.slice(0, 10) : '';`
);

fs.writeFileSync('src/components/pos/HistorialVentas.tsx', h);
console.log('HistorialVentas.tsx patched!');

// 2. Patch LiveSalesFeed.tsx
let l = fs.readFileSync('src/components/pos/LiveSalesFeed.tsx', 'utf-8');

l = l.replace(
  `const dateOpts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };`,
  `const dateOpts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', timeZone: 'UTC' };
    const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' };`
);

fs.writeFileSync('src/components/pos/LiveSalesFeed.tsx', l);
console.log('LiveSalesFeed.tsx patched!');

// 3. Patch pos-actions.ts
let a = fs.readFileSync('src/actions/pos-actions.ts', 'utf-8');

a = a.replace(
  `.gte('fecha_venta', \`\${fechaFiltro}-01T00:00:00-04:00\`)
        .lte('fecha_venta', \`\${fechaFiltro}-31T23:59:59.999-04:00\`)`,
  `.gte('fecha_venta', \`\${fechaFiltro}-01T00:00:00+00:00\`)
        .lte('fecha_venta', \`\${fechaFiltro}-31T23:59:59.999+00:00\`)`
);

a = a.replace(
  `.gte('fecha_venta', \`\${fechaFiltro}T00:00:00-04:00\`)
        .lte('fecha_venta', \`\${fechaFiltro}T23:59:59.999-04:00\`)`,
  `.gte('fecha_venta', \`\${fechaFiltro}T00:00:00+00:00\`)
        .lte('fecha_venta', \`\${fechaFiltro}T23:59:59.999+00:00\`)`
);

fs.writeFileSync('src/actions/pos-actions.ts', a);
console.log('pos-actions.ts patched!');
