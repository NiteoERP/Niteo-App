const fs = require('fs');
let code = fs.readFileSync('src/actions/pos-actions.ts', 'utf8');

// Replace the date filtering logic
const oldLogic = `  if (fechaFiltro) {
    // fechaFiltro viene en formato YYYY-MM-DD
    const start = new Date(fechaFiltro + 'T00:00:00');
    const end = new Date(fechaFiltro + 'T23:59:59.999');
    query = query.gte('fecha_venta', start.toISOString()).lte('fecha_venta', end.toISOString());
  } else {
    query = query.limit(100);
  }`;

const newLogic = `  if (fechaFiltro) {
    // Filtra las ms recientes HASTA la fecha seleccionada
    query = query.lte('fecha_venta', \`\${fechaFiltro}T23:59:59.999+00:00\`);
  }
  query = query.limit(100);`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('src/actions/pos-actions.ts', code, 'utf8');
