const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/configuracion/page.tsx', 'utf-8');

// Add import
code = code.replace(
  "import GlobalTasaManager from '@/components/configuracion/GlobalTasaManager';",
  "import GlobalTasaManager from '@/components/configuracion/GlobalTasaManager';\nimport MetodosComprasForm from '@/components/configuracion/MetodosComprasForm';"
);

// Inject component
code = code.replace(
  "<GlobalTasaManager />",
  "<GlobalTasaManager />\n\n      <MetodosComprasForm />"
);

fs.writeFileSync('src/app/dashboard/configuracion/page.tsx', code);
console.log("Config page patched");
