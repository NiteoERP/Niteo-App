const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

// Checkout modal buttons
const modalBtnStr = `<div className="flex gap-2 w-full">
                   <button onClick={() => { (window as any)._skipPrint = true; handleProcesarVentaFinal(); }} disabled={isPending} className="w-1/3 h-12 rounded-xl text-xs font-bold flex flex-col items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-50 transition-colors leading-tight">
                     {isPending ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} className="text-neutral-500 opacity-50 mb-0.5" />}
                     Solo Guardar<br/><span className="text-[9px] opacity-70 font-normal">(Sin recibo)</span>
                   </button>
                   <button onClick={() => { (window as any)._skipPrint = false; handleProcesarVentaFinal(); }} disabled={isPending} className="w-2/3 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 shadow-md">
                     {isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                     {restante > 0 ? 'Cobrar y Deuda (Imprimir)' : 'Cobrar e Imprimir (F10)'}
                   </button>
                 </div>`;

const newModalBtn = `<div className="flex gap-2 w-full">
                   <button onClick={() => { (window as any)._skipPrint = true; handleProcesarVentaFinal(); }} disabled={isPending} className="w-1/3 h-12 rounded-xl text-sm font-bold flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-50 transition-colors uppercase tracking-wider">
                     {isPending ? '...' : 'Guardar'}
                   </button>
                   <button onClick={() => { (window as any)._skipPrint = false; handleProcesarVentaFinal(); }} disabled={isPending} className="w-2/3 h-12 rounded-xl text-sm font-bold flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 shadow-md uppercase tracking-wider">
                     {isPending ? '...' : (restante > 0 ? 'Crédito' : 'Cobrar')}
                   </button>
                 </div>`;

code = code.replace(modalBtnStr, newModalBtn);

// Cart footer buttons (Restaurante mode)
const cartBtnRestauranteStr = `<div className="flex gap-2">
               <button
                 type="button"
                 onClick={guardarComandaSilencioso}
                 disabled={carrito.length === 0}
                 className="flex-1 h-12 rounded-xl text-xs font-bold flex flex-col items-center justify-center bg-neutral-900 border border-neutral-800/50 hover:bg-neutral-800 text-neutral-200 disabled:opacity-40 transition-colors"
                 title="Guardar cuenta sin imprimir comanda"
               >
                 <Cloud size={15} className="mb-0.5 text-neutral-400" /> Guardar
               </button>
               
               <button
                 type="button"
                 onClick={guardarComandaAbierta}
                 disabled={carrito.length === 0}
                 className="flex-1 h-12 rounded-xl text-xs font-bold flex flex-col items-center justify-center bg-neutral-900 border border-neutral-800/50 hover:bg-neutral-800 text-neutral-200 disabled:opacity-40 transition-colors"
                 title={pedidoActualID && !carrito.some(i => !i.impreso_cocina) ? "Reimprimir comanda en cocina" : "Imprimir comanda en cocina y guardar cuenta"}
               >
                 <Printer size={15} className="mb-0.5 text-indigo-400" /> {pedidoActualID && !carrito.some(i => !i.impreso_cocina) ? 'Reimprimir' : 'Comanda'}
               </button>

               <button
                 type="button"
                 onClick={imprimirPrecuenta}
                 disabled={carrito.length === 0}
                 className="flex-1 h-12 rounded-xl text-xs font-bold flex flex-col items-center justify-center bg-neutral-900 border border-neutral-800/50 hover:bg-neutral-800 text-neutral-200 disabled:opacity-40 transition-colors"
                 title="Imprimir pre-cuenta para el cliente"
               >
                 <Receipt size={15} className="mb-0.5 text-indigo-400" /> Precuenta
               </button>
            </div>`;

const newCartBtnRestaurante = `<div className="flex gap-2">
               <button
                 type="button"
                 onClick={guardarComandaSilencioso}
                 disabled={carrito.length === 0}
                 className="flex-1 h-12 rounded-xl text-[11px] font-bold flex items-center justify-center bg-neutral-900 border border-neutral-800/50 hover:bg-neutral-800 text-neutral-200 disabled:opacity-40 transition-colors uppercase tracking-wider"
                 title="Guardar cuenta sin imprimir comanda"
               >
                 Guardar
               </button>
               
               <button
                 type="button"
                 onClick={guardarComandaAbierta}
                 disabled={carrito.length === 0}
                 className="flex-1 h-12 rounded-xl text-[11px] font-bold flex items-center justify-center bg-neutral-900 border border-neutral-800/50 hover:bg-neutral-800 text-neutral-200 disabled:opacity-40 transition-colors uppercase tracking-wider"
                 title={pedidoActualID && !carrito.some(i => !i.impreso_cocina) ? "Reimprimir comanda en cocina" : "Imprimir comanda en cocina y guardar cuenta"}
               >
                 {pedidoActualID && !carrito.some(i => !i.impreso_cocina) ? 'Reimprimir' : 'Comanda'}
               </button>

               <button
                 type="button"
                 onClick={imprimirPrecuenta}
                 disabled={carrito.length === 0}
                 className="flex-1 h-12 rounded-xl text-[11px] font-bold flex items-center justify-center bg-neutral-900 border border-neutral-800/50 hover:bg-neutral-800 text-neutral-200 disabled:opacity-40 transition-colors uppercase tracking-wider"
                 title="Imprimir pre-cuenta para el cliente"
               >
                 Precuenta
               </button>
            </div>`;

code = code.replace(cartBtnRestauranteStr, newCartBtnRestaurante);

// The Cobrar trigger button
const cobrarTriggerStr = `<button
              type="button"
              onClick={abrirModalPago}
              disabled={carrito.length === 0}
              className="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 shadow-md transition-colors"
            >
              <Zap size={16} className="text-indigo-200" /> Cobrar (F10)
            </button>`;

const newCobrarTrigger = `<button
              type="button"
              onClick={abrirModalPago}
              disabled={carrito.length === 0}
              className="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 shadow-md transition-colors uppercase tracking-wider"
            >
              Cobrar (F10)
            </button>`;

code = code.replace(cobrarTriggerStr, newCobrarTrigger);

fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', code);
console.log("Patched TerminalPOS buttons to be concise without icons");
