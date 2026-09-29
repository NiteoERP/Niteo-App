const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/printer.go', 'utf8');

const s1 = code.indexOf('func (a *App) ImprimirComandaCancelacion');
const nextFunc = code.indexOf('func (a *App)', s1 + 10);
const s2 = nextFunc !== -1 ? nextFunc : code.length;

let funcBody = code.substring(s1, s2);
funcBody = funcBody.replace(/if ronda == 0 \{\s*b\.Write\(\[\]byte\(fmt\.Sprintf\("Reimpres: %s %s\\n", nowKitchenTime\.Format\("02\/01\/06"\), nowKitchenTime\.Format\("03:04 PM"\)\)\)\)\s*\}/g, '');
code = code.substring(0, s1) + funcBody + code.substring(s2);

fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/printer.go', code);
console.log("Fixed ronda == 0");
