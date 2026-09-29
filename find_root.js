const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');
const searchIdx = code.indexOf('return (');
console.log(code.substring(searchIdx + 3000, searchIdx + 4000));
