const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');
const lucideIdx = code.indexOf("} from 'lucide-react'");
if (!code.substring(lucideIdx - 200, lucideIdx).includes('FileText')) {
  code = code.substring(0, lucideIdx) + ", FileText, Undo2" + code.substring(lucideIdx);
  fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', code);
}
console.log('Imports added');
