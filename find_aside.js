const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');
const searchIdx = code.indexOf('<aside');
if (searchIdx !== -1) {
  let depth = 0;
  let end = -1;
  for (let i = searchIdx; i < code.length; i++) {
    if (code.substring(i, i+6) === '<aside') depth++;
    else if (code.substring(i, i+8) === '</aside>') {
      depth--;
      if (depth === 0) { end = i + 8; break; }
    }
  }
  console.log("Cart code size: " + (end - searchIdx));
  console.log(code.substring(searchIdx, searchIdx + 200));
}
