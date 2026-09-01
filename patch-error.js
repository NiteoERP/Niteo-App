const fs = require('fs');

let code = fs.readFileSync('src/actions/cierres-actions.ts', 'utf-8');

code = code.replace(
  /return \{ error: 'Error al registrar el resumen del cierre\.' \};/g,
  `return { error: 'Error al registrar el resumen del cierre. Detalles: ' + errorCierre.message + ' ' + (errorCierre.details || '') };`
);

fs.writeFileSync('src/actions/cierres-actions.ts', code);
