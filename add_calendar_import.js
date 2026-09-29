const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

const importStr = "import {";
const lucideEnd = code.indexOf("} from 'lucide-react'");
if (lucideEnd !== -1) {
    const lucideStart = code.lastIndexOf(importStr, lucideEnd);
    const lucideImports = code.substring(lucideStart, lucideEnd);
    if (!lucideImports.includes('Calendar')) {
        code = code.substring(0, lucideEnd) + ", Calendar" + code.substring(lucideEnd);
        fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', code);
        console.log("Added Calendar to lucide-react imports");
    } else {
        console.log("Calendar already imported");
    }
}
