const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/proveedores/page.tsx', 'utf8');

const search = '<h2 className=\"text-xl font-black text-white mb-6 flex items-center gap-2\"><PlusCircle className=\"text-emerald-400\" /> Registrar Deuda / Gasto</h2>';
const replace = search + "\n              <div className=\"mb-5 bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-xl flex flex-col gap-2\">\n                <p className=\"text-sm text-indigo-300 leading-relaxed\">\n                  <strong>¿El proveedor trajo insumos o mercancía?</strong><br/>Si necesitas ingresar productos al inventario, debes registrar esta factura en el módulo de Compras.\n                </p>\n                <a href=\"/dashboard/compras\" className=\"text-sm font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 w-fit mt-1\">\n                  Ir a Ingreso de Mercancía &rarr;\n                </a>\n              </div>";

code = code.replace(search, replace);
fs.writeFileSync('src/app/dashboard/proveedores/page.tsx', code, 'utf8');
