const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

const targetStr = `(vistaActual === 'cuadre' || vistaActual === 'cierres') ? '!hidden' : ''`;
const replacementStr = `(vistaActual === 'cuadre' || vistaActual === 'cierres' || vistaActual === 'historial' || vistaActual === 'deudas') ? '!hidden' : ''`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', code);
  console.log("Cart hidden for historial view.");
} else {
  console.log("Could not find the class logic.");
}
