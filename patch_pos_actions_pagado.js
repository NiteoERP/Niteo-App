const fs = require('fs');
let code = fs.readFileSync('src/actions/pos-actions.ts', 'utf8');

code = code.replace(
  'esta_pagado: v.estado_pago === 1 || v.estado_pago === 2,',
  'esta_pagado: v.estado_pago === 1,'
);

fs.writeFileSync('src/actions/pos-actions.ts', code, 'utf8');
