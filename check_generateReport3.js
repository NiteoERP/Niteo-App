const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-web/src/hooks/useInformesData.ts', 'utf8');

const s1 = code.lastIndexOf("if (reportId === 'ventas_usuarios') {");
console.log(code.substring(s1 - 200, s1 + 1000));
