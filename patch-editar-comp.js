const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', 'utf-8');

// I will just download the file, replace it manually, and upload it.
// I can do a very simple string replacement.
code = code.replace(/if \(false\) setSelectedSedeId\(\(cierreRes \|\| \{\}\)\.targetSedeId\);/g, '');
code = code.replace(/if \(\(cierreRes \|\| \{\}\)\.transacciones\?\.length > 0\)/g, 'if (((cierreRes || {}).transacciones || []).length > 0)');

fs.writeFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', code);
