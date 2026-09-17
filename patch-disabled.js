const fs = require('fs');
let c = fs.readFileSync('src/components/pos/HistorialVentas.tsx', 'utf-8');

c = c.replace(
    /disabled=\{ventas\.length < 100 \|\| loading\}/g,
    `disabled={ventas.length < page * 100 || loading}`
);

fs.writeFileSync('src/components/pos/HistorialVentas.tsx', c);
