const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/proveedores/page.tsx', 'utf8');

content = content.replace(/\uFFFD%/g, "≈");
content = content.replace(/%\^/g, "≈");
content = content.replace(/N\uFFFD Referencia/g, "N° Referencia");
content = content.replace(/Bol\uFFFDvares/g, "Bolívares");
content = content.replace(/D\uFFFDa/g, "Dóla");
content = content.replace(/D\uFFFDlares/g, "Dólares");

fs.writeFileSync('src/app/dashboard/proveedores/page.tsx', content, 'utf8');
console.log('Fixed U+FFFD');