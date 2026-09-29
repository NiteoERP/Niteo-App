const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

const s1 = code.indexOf('Procesar');
if (s1 !== -1) {
  console.log(code.substring(s1 - 1000, s1 + 800));
}
