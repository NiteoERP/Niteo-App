const fs = require('fs');

let code = fs.readFileSync('src/actions/compras-actions.ts', 'utf-8');

// Patch registrarFacturaInsumos signature
code = code.replace(
  /metodo_pago: string;\s*items: Array<\{/g,
  `metodo_pago: string;\n  descripcion?: string;\n  items: Array<{`
);

// Patch registrarFacturaInsumos insert
code = code.replace(
  /detalles: JSON\.stringify\(\{ texto: \`Compra Insumos - \$\{factura\.items\.length\} items\`, is_insumos: true, items: factura\.items \}\),/g,
  `detalles: JSON.stringify({ texto: factura.descripcion?.trim() ? factura.descripcion : \`Compra Insumos - \${factura.items.length} items\`, is_insumos: true, items: factura.items }),`
);

// Patch editarFacturaInsumos signature
code = code.replace(
  /metodo_pago: string;\s*items_viejos: Array<\{/g,
  `metodo_pago: string;\n    descripcion?: string;\n    items_viejos: Array<{`
);

// Patch editarFacturaInsumos update
code = code.replace(
  /detalles: JSON\.stringify\(\{\s*texto: \`Compra Insumos - \$\{factura\.items_nuevos\.length\} items\`,\s*is_insumos: true,\s*items: factura\.items_nuevos\s*\}\)/g,
  `detalles: JSON.stringify({ texto: factura.descripcion?.trim() ? factura.descripcion : \`Compra Insumos - \${factura.items_nuevos.length} items\`, is_insumos: true, items: factura.items_nuevos })`
);

fs.writeFileSync('src/actions/compras-actions.ts', code);
console.log('compras-actions.ts patched');
