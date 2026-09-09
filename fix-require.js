const fs = require('fs');
let code = fs.readFileSync('src/actions/compras-actions.ts', 'utf-8');

code = code.replace(/const \{ createClient \} = require\('@\/utils\/supabase\/server'\);\s*/g, '');

fs.writeFileSync('src/actions/compras-actions.ts', code);
console.log("Fixed require in compras-actions.ts");
