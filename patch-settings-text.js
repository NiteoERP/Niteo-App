const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/configuracion/SettingsForm.tsx', 'utf-8');

code = code.replace(
  "Estos m\u00e9todos aparecer\u00e1n como opciones al registrar compras o gastos.", 
  "Estos m\u00e9todos aparecer\u00e1n como opciones al registrar ventas en el POS."
);

code = code.replace(
  "Estos métodos aparecerán como opciones al registrar compras o gastos.", 
  "Estos métodos aparecerán como opciones al registrar ventas en el POS."
);

fs.writeFileSync('src/app/dashboard/configuracion/SettingsForm.tsx', code);
