const fs = require('fs');
const text = fs.readFileSync('src/app/dashboard/proveedores/page.tsx', 'utf8');
const nonAscii = [...new Set(text.match(/[^\x00-\x7F]/g) || [])];
console.log(nonAscii.join(' '));