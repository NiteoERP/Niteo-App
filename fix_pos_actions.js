const fs = require('fs');
let code = fs.readFileSync('src/actions/pos-actions.ts', 'utf8');

code = code.replace(/numero_orden: v\.numero_orden,\s*numero_orden: v\.numero_orden,/g, "numero_orden: v.numero_orden,");

fs.writeFileSync('src/actions/pos-actions.ts', code, 'utf8');
