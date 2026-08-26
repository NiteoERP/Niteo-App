const fs = require('fs');
let code = fs.readFileSync('src/actions/pos-actions.ts', 'utf8');

// Update to use -04:00 instead of +00:00 so it captures the full day in local time
code = code.replace(
  "query = query.lte('fecha_venta', `${fechaFiltro}T23:59:59.999+00:00`);",
  "query = query.lte('fecha_venta', `${fechaFiltro}T23:59:59.999-04:00`);"
);

fs.writeFileSync('src/actions/pos-actions.ts', code, 'utf8');
