const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

const regex = /<div className="[^"]*w-\[\d+px\][^"]*"/g;
let match;
while ((match = regex.exec(code)) !== null) {
  console.log(code.substring(match.index - 50, match.index + 150));
}

const asideRegex = /<aside/g;
while ((match = asideRegex.exec(code)) !== null) {
  console.log(code.substring(match.index - 50, match.index + 150));
}
