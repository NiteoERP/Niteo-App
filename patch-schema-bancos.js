const fs = require('fs');

let code = fs.readFileSync('src/actions/cierres-actions.ts', 'utf-8');

code = code.replace(
  /\.eq\('empresa_id', profile\.empresa_id\)/g,
  ".eq('cierres_caja.empresa_id', profile.empresa_id)"
);
code = code.replace(
  /\.select\('banco, metodo'\)/g,
  ".select('banco, metodo, cierres_caja!inner(empresa_id)')"
);

fs.writeFileSync('src/actions/cierres-actions.ts', code);
