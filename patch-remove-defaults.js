const fs = require('fs');

['src/app/dashboard/caja/nuevo/page.tsx', 'src/app/dashboard/caja/[id]/editar/page.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf-8');

  // Remove the sugerenciasDefault logic if it exists
  code = code.replace(
    /const sugerenciasDefault = \['Banesco', 'Mercantil', 'Provincial', 'Venezuela', 'BNC', 'Bancaribe', 'Zelle', 'Bicentenario', 'Bancamiga', 'Tesoro', 'Exterior'\];\r?\n\s*const bancosList = Array\.from\(new Set\(\[\.\.\.sugerenciasDefault, \.\.\.bancosSugeridos\]\)\)\.sort\(\);/g,
    ''
  );

  fs.writeFileSync(file, code);
});
