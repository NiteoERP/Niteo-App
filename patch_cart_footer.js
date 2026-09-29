const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

// Replace the entire flex gap-2 container for the cart buttons
const s1 = code.indexOf('/* Modo Restaurante: Comanda + Precuenta + Cobrar */');
const endMarker = ' {/* Fila inferior principal */}';
const s2 = code.indexOf(endMarker, s1);

if (s1 !== -1 && s2 !== -1) {
    const replacement = `/* Modo Restaurante: Comanda + Precuenta + Cobrar */
            <div className="flex gap-2">
               <button
                 type="button"
                 onClick={guardarComandaSilencioso}
                 disabled={carrito.length === 0}
                 className="flex-1 h-12 rounded-xl text-xs font-bold flex items-center justify-center bg-neutral-900 border border-neutral-800/50 hover:bg-neutral-800 text-neutral-200 disabled:opacity-40 transition-colors uppercase tracking-wider"
               >
                 Guardar
               </button>
               
               <button
                 type="button"
                 onClick={guardarComandaAbierta}
                 disabled={carrito.length === 0}
                 className="flex-1 h-12 rounded-xl text-xs font-bold flex items-center justify-center bg-neutral-900 border border-neutral-800/50 hover:bg-neutral-800 text-neutral-200 disabled:opacity-40 transition-colors uppercase tracking-wider"
               >
                 {pedidoActualID && !carrito.some(i => !i.impreso_cocina) ? 'Reimprimir' : 'Comanda'}
               </button>

               <button
                 type="button"
                 onClick={imprimirPrecuenta}
                 disabled={carrito.length === 0}
                 className="flex-1 h-12 rounded-xl text-xs font-bold flex items-center justify-center bg-neutral-900 border border-neutral-800/50 hover:bg-neutral-800 text-neutral-200 disabled:opacity-40 transition-colors uppercase tracking-wider"
               >
                 Precuenta
               </button>
            </div>
          ) : (
            /* Modo General: Precuenta + Cobrar */
            <div className="flex gap-2">
               <button
                 type="button"
                 onClick={imprimirPrecuenta}
                 disabled={carrito.length === 0}
                 className="flex-1 h-12 rounded-xl text-xs font-bold flex items-center justify-center bg-neutral-900 border border-neutral-800/50 hover:bg-neutral-800 text-neutral-200 disabled:opacity-40 transition-colors uppercase tracking-wider"
               >
                 Precuenta
               </button>
            </div>
          )}

         `;
    
    // We only replace from s1 to the end of the mode toggle, which ends at } before {/* Fila inferior
    const toggleEnd = code.lastIndexOf('}', s2) + 1;
    code = code.substring(0, s1) + replacement + code.substring(toggleEnd);
}

// Remove Zap icon from Cobrar button
code = code.replace(
  /<Zap size=\{16\} className="text-indigo-200" \/>\s*Cobrar \(F10\)/g,
  'COBRAR (F10)'
);
code = code.replace(
  /<CreditCard size=\{16\} \/>Cobrar \(F10\)/g,
  'COBRAR (F10)'
);

fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', code);
console.log("Cart footer buttons patched perfectly");
