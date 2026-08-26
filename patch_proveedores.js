const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/proveedores/page.tsx', 'utf8');

code = code.replace(
  /<button\s+onClick=\{\(\) => setIsCreatingFac\(true\)\}[\s\S]*?Registrar Deuda \/ Gasto\s*<\/button>/,
  '<a href="/dashboard/compras?tab=factura" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-emerald-900/20 flex items-center gap-2">\n            <PlusCircle size={18} /> Registrar Factura de Proveedor\n          </a>'
);

const modalStart = code.indexOf('{isCreatingFac && (');
if (modalStart !== -1) {
  let depth = 0;
  let i = modalStart;
  let foundStart = false;
  
  for (; i < code.length; i++) {
    if (code[i] === '{') {
      depth++;
      foundStart = true;
    } else if (code[i] === '}') {
      depth--;
    }
    
    if (foundStart && depth === 0) {
      code = code.substring(0, modalStart) + code.substring(i + 1);
      break;
    }
  }
}

fs.writeFileSync('src/app/dashboard/proveedores/page.tsx', code, 'utf8');
