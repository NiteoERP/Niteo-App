const fs = require('fs');
let c = fs.readFileSync('src/components/pos/HistorialVentas.tsx', 'utf-8');

c = c.replace(
    /setVentas\(data\);/,
    `setVentas(prev => page === 1 ? data : [...prev, ...data]);`
);

fs.writeFileSync('src/components/pos/HistorialVentas.tsx', c);
