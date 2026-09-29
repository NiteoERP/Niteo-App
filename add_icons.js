const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');
const lucideIdx = code.indexOf("} from 'lucide-react'");
let toAdd = [];
if (!code.substring(lucideIdx - 200, lucideIdx).includes('Users')) toAdd.push('Users');
if (!code.substring(lucideIdx - 200, lucideIdx).includes('Printer')) toAdd.push('Printer');
if (!code.substring(lucideIdx - 200, lucideIdx).includes('Receipt')) toAdd.push('Receipt');

if (toAdd.length > 0) {
  code = code.substring(0, lucideIdx) + ", " + toAdd.join(', ') + code.substring(lucideIdx);
  fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', code);
}
console.log('Imports added: ' + toAdd.join(', '));
