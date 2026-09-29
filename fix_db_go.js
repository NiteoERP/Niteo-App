const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/database.go', 'utf8');

code = code.replace(
  `db.Exec("ALTER TABLE Configuracion_Local ADD COLUMN tamano_fuente_recibo INTEGER DEFAULT 100,\n\t\ttamano_fuente_cocina INTEGER DEFAULT 100")`,
  `db.Exec("ALTER TABLE Configuracion_Local ADD COLUMN tamano_fuente_recibo INTEGER DEFAULT 100")`
);

fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/database.go', code);
console.log("Fixed database.go");
