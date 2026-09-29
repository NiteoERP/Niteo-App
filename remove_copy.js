const fs = require('fs');
let c = fs.readFileSync('src/app/dashboard/catalogo/CatalogoClient.tsx', 'utf8');
const lines = c.split('\n');
const newLines = lines.filter((line, index) => !(index === 7 && line.includes('Copy'))); // line 8 is index 7
fs.writeFileSync('src/app/dashboard/catalogo/CatalogoClient.tsx', newLines.join('\n'), 'utf8');
