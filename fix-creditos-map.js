const fs = require('fs');
let code = fs.readFileSync('src/actions/creditos-actions.ts', 'utf-8');
code = code.replace(
  /return \{ success: true, data, totalCount: count \|\| 0 \};/,
  `const mappedData = (data || []).map(cli => ({
    id_cliente: cli.cliente_id || cli.id_cliente,
    nombre_cliente: cli.nombre_cliente,
    sedes_involucradas: cli.nombre_sede || cli.sedes_involucradas,
    monto_adeudado: cli.total_deuda || cli.monto_adeudado,
    ultima_compra: cli.ultima_compra || null
  }));
  return { success: true, data: mappedData, totalCount: count || 0 };`
);
fs.writeFileSync('src/actions/creditos-actions.ts', code);
