const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

const s1 = code.indexOf('handleProcesarVentaFinal');
const s2 = code.lastIndexOf('handleProcesarVentaFinal');
if (s2 !== -1) {
  console.log(code.substring(s2 - 500, s2 + 800));
}
