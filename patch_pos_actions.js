const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'actions', 'pos-actions.ts');
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'precio_modificable?: boolean;\n}',
  'precio_modificable?: boolean;\n  precios_dinamicos?: Record<string, number>;\n}'
);

code = code.replace(
  ".select('id, codigo_barras, nombre, precio_venta, costo, precio_modificable')",
  ".select('id, codigo_barras, nombre, precio_venta, costo, precio_modificable, productos_precios(lista_precio_id, precio)')"
);

code = code.replace(
  /return \(productos \|\| \[\]\)\.map\(\(p: any\) => \(\{\n\s*producto_id: p\.id,\n\s*codigo_barras: p\.codigo_barras,\n\s*nombre: p\.nombre,\n\s*precio_venta: p\.precio_venta,\n\s*costo: p\.costo,\n\s*precio_modificable: p\.precio_modificable,\n\s*\}\)\);/,
  `return (productos || []).map((p: any) => {
    const pd: Record<string, number> = {};
    if (p.productos_precios && Array.isArray(p.productos_precios)) {
      p.productos_precios.forEach((pp: any) => {
        pd[pp.lista_precio_id] = pp.precio;
      });
    }
    return {
      producto_id: p.id,
      codigo_barras: p.codigo_barras,
      nombre: p.nombre,
      precio_venta: p.precio_venta,
      costo: p.costo,
      precio_modificable: p.precio_modificable,
      precios_dinamicos: pd
    };
  });`
);

fs.writeFileSync(file, code);
