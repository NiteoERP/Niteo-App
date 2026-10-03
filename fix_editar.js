const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', 'utf8');
content = content.replace(/Ã³/g, 'ó')
                 .replace(/Ã¡/g, 'á')
                 .replace(/Ã©/g, 'é')
                 .replace(/Ã­/g, 'í')
                 .replace(/Ãº/g, 'ú')
                 .replace(/Ã‰/g, 'É')
                 .replace(/â‰ˆ/g, '≈')
                 .replace(/â”€/g, '─');
fs.writeFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', content, 'utf8');
