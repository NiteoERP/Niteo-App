const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/schema.sql', 'utf8');

// Find Configuracion_Local table
if (!code.includes('tamano_fuente_cocina')) {
  code = code.replace(
    /tamano_fuente_recibo INTEGER DEFAULT 100/g,
    'tamano_fuente_recibo INTEGER DEFAULT 100,\n    tamano_fuente_cocina INTEGER DEFAULT 100'
  );
  fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/schema.sql', code);
}
console.log("Patched schema.sql");
