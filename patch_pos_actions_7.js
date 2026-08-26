const fs = require('fs');
let code = fs.readFileSync('src/actions/pos-actions.ts', 'utf8');

code = code.replace(
  "numero_documento: string;",
  "numero_documento: string;\n    numero_orden?: string;"
);

// Map it for getVentasRecientes
code = code.replace(
  "numero_documento: v.numero_documento,",
  "numero_documento: v.numero_documento,\n      numero_orden: v.numero_orden,"
);

// We need to replace ALL occurrences in the map functions
// Wait, regex might be safer
code = code.replace(/numero_documento: v\.numero_documento,/g, "numero_documento: v.numero_documento,\n      numero_orden: v.numero_orden,");

fs.writeFileSync('src/actions/pos-actions.ts', code, 'utf8');
