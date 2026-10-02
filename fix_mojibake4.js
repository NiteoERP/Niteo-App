const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/proveedores/page.tsx', 'utf8');

content = content.replace(/Bol\ufffdvares/g, 'Bolívares');
content = content.replace(/D\ufffdlares/g, 'Dólares');
content = content.replace(/N\ufffd Referencia/g, 'N° Referencia');
content = content.replace(/\ufffd%\^/g, '≈');

fs.writeFileSync('src/app/dashboard/proveedores/page.tsx', content, 'utf8');
console.log('Fixed more ufffd');