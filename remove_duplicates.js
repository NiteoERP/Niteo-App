const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

// 1. Remove the extra "F2 Desc." button.
// Look for the specific HTML block and remove it.
const f2DescStr = `<button onClick={abrirModalDescuento} className="flex-1 h-12 rounded-xl text-xs font-bold flex flex-col items-center justify-center bg-neutral-900 border border-neutral-800 hover:bg-amber-500/10 text-neutral-400 hover:text-amber-400 transition-colors">
                  <span className="text-[12px] font-bold uppercase">F2 Desc.</span>
               </button>`;
if (code.includes(f2DescStr)) {
    code = code.replace(f2DescStr, '');
    console.log('Removed duplicate F2 Desc.');
}

// 2. Remove the old "Nueva" button.
// It looks like:
// <button
//   type="button"
//   onClick={() => { limpiarVenta(); setBusqueda(''); }}
//   className="px-2 py-1 bg-neutral-900 border border-neutral-800 text-[11px] font-bold rounded-lg hover:bg-neutral-800 text-neutral-300 transition-colors"
//   title="Iniciar nueva venta vacía"
// >
//   Nueva
// </button>
const nuevaBtnStr = `<button
                  type="button"
                  onClick={() => { limpiarVenta(); setBusqueda(''); }}
                  className="px-2 py-1 bg-neutral-900 border border-neutral-800 text-[11px] font-bold rounded-lg hover:bg-neutral-800 text-neutral-300 transition-colors"
                  title="Iniciar nueva venta vacía"
                >
                  Nueva
                </button>`;
if (code.includes(nuevaBtnStr)) {
    code = code.replace(nuevaBtnStr, '');
    console.log('Removed duplicate Nueva Venta.');
} else {
    // maybe spacing is different, let's use regex
    const regex = /<button[^>]*>\s*Nueva\s*<\/button>/g;
    code = code.replace(regex, '');
    console.log('Removed duplicate Nueva Venta (regex fallback).');
}

fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', code);
