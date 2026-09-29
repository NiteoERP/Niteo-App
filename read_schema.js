const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/schema.sql', 'utf8');
const searchIdx = code.indexOf('CREATE TABLE "public"."ventas_facturas"');
if (searchIdx !== -1) {
  console.log(code.substring(searchIdx, searchIdx + 1200));
}
