const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

const s1 = code.indexOf('{/* Cabecera del carrito */}');
if (s1 !== -1) {
  console.log(code.substring(s1, s1 + 1500));
}
