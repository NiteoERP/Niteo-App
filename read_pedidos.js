const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('c:/Users/Usuario/Documents/Niteo App/niteo-pos/niteo_pos.db');
db.all("PRAGMA table_info('Pedidos')", (err, rows) => {
  console.log(rows);
});
