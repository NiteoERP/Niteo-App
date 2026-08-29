const fs = require('fs');
let code = fs.readFileSync('src/actions/compras-actions.ts', 'utf-8');
code = code.replace(
  /estado: 'PROCESADA'\s*\}\)\.select\('id'\)\.single\(\);/,
  `estado: 'PROCESADA',\n      usuario_id: user.id\n    }).select('id').single();`
);
fs.writeFileSync('src/actions/compras-actions.ts', code);
