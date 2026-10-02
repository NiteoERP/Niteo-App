const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/proveedores/page.tsx', 'utf8');

// The file is read as utf8, so the replacement strings should be just whatever is in the text
content = content.replaceAll('Bolvares', 'Bolívares');
content = content.replaceAll('Dlares', 'Dólares');
content = content.replaceAll('%^', '≈');
content = content.replaceAll('N Referencia', 'N° Referencia');

fs.writeFileSync('src/app/dashboard/proveedores/page.tsx', content, 'utf8');
console.log('Fixed literally');