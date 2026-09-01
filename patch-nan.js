const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/caja/page.tsx', 'utf-8');

code = code.replace(
  /\$\{Number\(c\.total_esperado_usd\)\.toFixed\(2\)\}/g,
  `\${Number(c.sistema_total_esperado || 0).toFixed(2)}`
);

code = code.replace(
  /\$\{Number\(c\.total_fisico_usd\)\.toFixed\(2\)\}/g,
  `\${Number((c.real_efectivo_usd || 0) + (c.real_bancos_usd || 0) + ((c.real_efectivo_bs || 0) / (c.tasa_cambio || 1)) + ((c.real_bancos_bs || 0) / (c.tasa_cambio || 1))).toFixed(2)}`
);

fs.writeFileSync('src/app/dashboard/caja/page.tsx', code);
