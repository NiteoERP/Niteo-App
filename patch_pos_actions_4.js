const fs = require('fs');
let code = fs.readFileSync('src/actions/pos-actions.ts', 'utf8');

const oldLogic = `  if (fechaFiltro) {
    // Filtra las ms recientes HASTA la fecha seleccionada
    query = query.lte('fecha_venta', \`\${fechaFiltro}T23:59:59.999-04:00\`);
  }`;

const newLogic = `  if (fechaFiltro) {
    // Filtra exactamente por ese da, usando UTC ya que los datos de Aronium vienen con +00:00
    query = query
      .gte('fecha_venta', \`\${fechaFiltro}T00:00:00+00:00\`)
      .lte('fecha_venta', \`\${fechaFiltro}T23:59:59.999+00:00\`);
  }`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('src/actions/pos-actions.ts', code, 'utf8');
