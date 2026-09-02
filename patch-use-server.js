const fs = require('fs');

let code = fs.readFileSync('src/actions/informes-actions.ts', 'utf-8');

code = code.replace("import { getResumenPagos } from './cierres-actions';\\n'use server';", "'use server';\\nimport { getResumenPagos } from './cierres-actions';");

// Just in case it has \r\n
code = code.replace("import { getResumenPagos } from './cierres-actions';\r\n'use server';", "'use server';\r\nimport { getResumenPagos } from './cierres-actions';");

// Fallback if the previous didn't work exactly
if (code.startsWith("import { getResumenPagos }")) {
  code = "'use server';\n" + code.replace("'use server';", "");
}

fs.writeFileSync('src/actions/informes-actions.ts', code);
