const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');
const lines = code.split('\n');
let mainReturnLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('return') && lines[i+1] && lines[i+1].includes('<div')) {
    mainReturnLine = i;
    break;
  }
}
if (mainReturnLine !== -1) {
  console.log(lines.slice(mainReturnLine, mainReturnLine + 50).join('\n'));
} else {
  console.log("Not found");
}
