const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('c:/Users/Usuario/Documents/Niteo App/niteo-pos/niteo_pos.db');
db.get("SELECT fecha_creacion FROM Pedidos LIMIT 1", (err, row) => {
  console.log(row);
});
