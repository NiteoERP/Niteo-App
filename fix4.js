const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/proveedores/page.tsx', 'utf8');
content = content.replace(/\uFFFD- Total:/g, "- Total:");
content = content.replace(/\uFFFD-/g, "x");
fs.writeFileSync('src/app/dashboard/proveedores/page.tsx', content, 'utf8');