const fs = require('fs');

let code = fs.readFileSync('src/components/configuracion/GlobalTasaManager.tsx', 'utf-8');

code = code.replace(/className=\{\\`flex-1/g, "className={`flex-1");
code = code.replace(/\\`\}/g, "`}");
fs.writeFileSync('src/components/configuracion/GlobalTasaManager.tsx', code);
console.log("Fixed backticks");
