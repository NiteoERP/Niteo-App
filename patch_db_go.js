const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/database.go', 'utf8');

if (!code.includes('tamano_fuente_cocina')) {
  code = code.replace(
    /tamano_fuente_recibo INTEGER DEFAULT 100/g,
    'tamano_fuente_recibo INTEGER DEFAULT 100,\n\t\ttamano_fuente_cocina INTEGER DEFAULT 100'
  );
  
  code = code.replace(
    /return db, nil/,
    `db.Exec("ALTER TABLE Configuracion_Local ADD COLUMN tamano_fuente_cocina INTEGER DEFAULT 100")\n\treturn db, nil`
  );

  fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/database.go', code);
}
console.log('database.go patched');
