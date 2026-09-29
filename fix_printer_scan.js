const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/printer.go', 'utf8');

code = code.replace(
  /&fuente, &tamano,/g,
  '&fuente, &tamano, &tamanoCocina,'
);

code = code.replace(
  /pc\.TamanoFuente    = int\(tamano\.Int64\)/g,
  'pc.TamanoFuente    = int(tamano.Int64)\n\tpc.TamanoFuenteCocina = int(tamanoCocina.Int64)'
);

fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/printer.go', code);
console.log("Fixed printer.go scan and assign");
