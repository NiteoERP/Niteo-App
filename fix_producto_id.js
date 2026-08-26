const fs = require('fs');
let code = fs.readFileSync('src/actions/pos-actions.ts', 'utf8');

code = code.replace(/id_producto/g, 'producto_id');

fs.writeFileSync('src/actions/pos-actions.ts', code, 'utf8');
