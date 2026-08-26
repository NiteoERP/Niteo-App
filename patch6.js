const fs = require('fs');
let code = fs.readFileSync('src/actions/cierres-actions.ts', 'utf8');

code = code.replace(/\.select\('id_empresa, id_sede'\)/g, ".select('empresa_id, sede_id')");
code = code.replace(/profile\.id_empresa/g, "profile.empresa_id");
code = code.replace(/profile\.id_sede/g, "profile.sede_id");

fs.writeFileSync('src/actions/cierres-actions.ts', code, 'utf8');
