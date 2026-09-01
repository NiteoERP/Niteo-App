const fs = require('fs');

['src/app/dashboard/caja/nuevo/page.tsx', 'src/app/dashboard/caja/[id]/editar/page.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf-8');

  code = code.replace(
    /defaultMoneda: 'VES',/g,
    `defaultMoneda: 'VES' as Moneda,`
  );

  fs.writeFileSync(file, code);
});
