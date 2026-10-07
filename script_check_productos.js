const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(process.env.APPDATA, 'NiteoPOS', 'niteo_pos.db');

const db = new sqlite3.Database(dbPath, (err) => {
  db.all("SELECT id, entidad, estado, error_ultimo FROM Sync_Outbox WHERE entidad='productos'", [], (err, rows) => {
    console.log("PRODUCT SYNC STATES:", rows);
    db.close();
  });
});
