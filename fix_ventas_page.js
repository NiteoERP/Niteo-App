const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/ventas/page.tsx', 'utf8');

code = code.replace("let activeSedeId = activeSedeId;", "let activeSedeId = perfil.sede_id;");

fs.writeFileSync('src/app/dashboard/ventas/page.tsx', code, 'utf8');
