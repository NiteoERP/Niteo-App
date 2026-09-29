const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/app.go', 'utf8');

const s1 = code.lastIndexOf('tx.Exec("DELETE FROM Detalles_Pedido WHERE pedido_id = ?", pedidoID)');
console.log(code.substring(s1 - 200, s1 + 800));
