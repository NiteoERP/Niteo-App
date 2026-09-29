const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/printer.go', 'utf8');

const s1 = code.indexOf('func (a *App) ImprimirComandaRawRonda');
const s2 = code.indexOf('// ImprimirPrecuentaRaw imprime');

let funcBody = code.substring(s1, s2);

let cancelFunc = funcBody.replace('ImprimirComandaRawRonda', 'ImprimirComandaCancelacion');
cancelFunc = cancelFunc.replace(', ronda int', '');
cancelFunc = cancelFunc.replace(
    'tipoDoc := "COMANDA"',
    'tipoDoc := "*** CANCELACION ***"'
);
cancelFunc = cancelFunc.replace(
    /if ronda > 0 \{[\s\S]*?\}\n/g,
    ''
);

// We need to negate the quantities printed
cancelFunc = cancelFunc.replace(
    `cantStr := fmt.Sprintf("%g", item.Cantidad)`,
    `cantStr := fmt.Sprintf("-%g", item.Cantidad)`
);

code = code.substring(0, s2) + cancelFunc + '\n\n' + code.substring(s2);

fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/printer.go', code);
console.log("Patched printer.go with ImprimirComandaCancelacion");
