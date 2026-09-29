const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

console.log('Modals:');
const lines = code.split('\n');
for (let i=0; i<lines.length; i++) {
  if (lines[i].includes('Modal') && lines[i].includes('/*')) console.log(lines[i].trim());
}
console.log('Search placeholders:');
for (let i=0; i<lines.length; i++) {
  if (lines[i].includes('placeholder=')) console.log(lines[i].trim());
}
console.log('Nueva Venta btn:');
for (let i=0; i<lines.length; i++) {
  if (lines[i].includes('Nueva Orden')) console.log(lines[i].trim());
}
