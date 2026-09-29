const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-web/src/app/dashboard/informes/page.tsx', 'utf8');

const s1 = code.indexOf('const REPORT_CATALOG');
const s2 = code.indexOf('// ─── Componente Principal');
console.log(code.substring(s1, s2));
