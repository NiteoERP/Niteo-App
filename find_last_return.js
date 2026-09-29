const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

// Find the last return (
const lastReturn = code.lastIndexOf('return (');
console.log(code.substring(lastReturn, lastReturn + 500));

