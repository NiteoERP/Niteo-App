const fs = require('fs');
let code = fs.readFileSync('src/components/pos/LiveSalesFeed.tsx', 'utf8');

code = code.replace(/id_producto/g, 'producto_id');

fs.writeFileSync('src/components/pos/LiveSalesFeed.tsx', code, 'utf8');
