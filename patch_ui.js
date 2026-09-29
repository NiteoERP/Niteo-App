const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

// 1. Fix F8 Nueva Venta logic
// Previous logic: onClick={() => { if(carrito.length > 0) vaciarCarrito(); }}
// New logic: onClick={limpiarVenta}
code = code.replace(
  /onClick=\{\(\) => \{ if\(carrito\.length > 0\) vaciarCarrito\(\); \}\}/g,
  'onClick={limpiarVenta}'
);
code = code.replace(
  /if \(e\.key === 'F8'\) \{\s*\/\/[^\n]*\s*if \(carrito\.length > 0\) \{\s*vaciarCarrito\(\);\s*\}\s*\}/g,
  "if (e.key === 'F8') { limpiarVenta(); }"
);


// 2. Remove Rubro selector
const rubroStart = code.indexOf('{/* Pill selector de rubro interactivo */}');
const rubroEnd = code.indexOf('</button>', rubroStart) + 9;
if (rubroStart !== -1 && rubroEnd !== -1) {
    code = code.substring(0, rubroStart) + code.substring(rubroEnd);
}

// 3. Add "Guardar sin Imprimir" in Checkout Modal
// Find the Confirmar Cobro button and add another button beside it.
const checkoutBtnStr = `<button onClick={handleProcesarVentaFinal} disabled={isPending} className="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50">
                   {isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                   {restante > 0 ? 'Guardar Deuda (Crédito)' : 'Confirmar Cobro'}
                 </button>`;
                 
const newCheckoutBtns = `<div className="flex gap-2 w-full">
                   <button onClick={() => { (window as any)._skipPrint = true; handleProcesarVentaFinal(); }} disabled={isPending} className="w-1/3 h-12 rounded-xl text-xs font-bold flex flex-col items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-50 transition-colors leading-tight">
                     {isPending ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} className="text-neutral-500 opacity-50 mb-0.5" />}
                     Solo Guardar<br/><span className="text-[9px] opacity-70 font-normal">(Sin recibo)</span>
                   </button>
                   <button onClick={() => { (window as any)._skipPrint = false; handleProcesarVentaFinal(); }} disabled={isPending} className="w-2/3 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 shadow-md">
                     {isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                     {restante > 0 ? 'Cobrar y Deuda (Imprimir)' : 'Cobrar e Imprimir (F10)'}
                   </button>
                 </div>`;
                 
code = code.replace(checkoutBtnStr, newCheckoutBtns);

fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', code);
console.log("F8, Rubro, and Save without Print patched in UI");
