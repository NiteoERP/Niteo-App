const fs = require('fs');

let code = fs.readFileSync('src/actions/pos-actions.ts', 'utf-8');

// Replace the limit logic
const target = `    if (fechaFiltro) {
      // Filtra exactamente por ese da, usando UTC ya que los datos de Aronium vienen con +00:00
      query = query
        .gte('fecha_venta', \`\${fechaFiltro}T00:00:00+00:00\`)
        .lte('fecha_venta', \`\${fechaFiltro}T23:59:59.999+00:00\`);
    }
    query = query.limit(100);`;

const newCode = `    if (fechaFiltro) {
      if (fechaFiltro.length === 7) {
        // Formato YYYY-MM
        const [year, month] = fechaFiltro.split('-');
        const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
        query = query
          .gte('fecha_venta', \`\${fechaFiltro}-01T00:00:00+00:00\`)
          .lte('fecha_venta', \`\${fechaFiltro}-\${daysInMonth}T23:59:59.999+00:00\`);
      } else {
        // Filtra exactamente por ese da
        query = query
          .gte('fecha_venta', \`\${fechaFiltro}T00:00:00+00:00\`)
          .lte('fecha_venta', \`\${fechaFiltro}T23:59:59.999+00:00\`);
      }
    } else {
      query = query.limit(100);
    }`;

code = code.replace(target, newCode);
fs.writeFileSync('src/actions/pos-actions.ts', code);
