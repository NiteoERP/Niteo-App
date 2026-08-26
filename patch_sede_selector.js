const fs = require('fs');
let code = fs.readFileSync('src/components/inventario/SedeSelector.tsx', 'utf8');

code = code.replace(
  "const params = new URLSearchParams(searchParams.toString());",
  "document.cookie = `active_sede=${e.target.value}; path=/; max-age=31536000;`;\n    const params = new URLSearchParams(searchParams.toString());"
);

fs.writeFileSync('src/components/inventario/SedeSelector.tsx', code, 'utf8');
