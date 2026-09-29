const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');
const searchIdx = code.indexOf('Nueva Orden');
if (searchIdx !== -1) {
  console.log(code.substring(searchIdx - 200, searchIdx + 400));
}
