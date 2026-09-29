const fs = require('fs');
const file = 'c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove Botonera de Accion Rapida from carrito.map
const botoneraStart = code.indexOf('{/* Botonera de Accion Rapida (Estilo Aronium) */}');
if (botoneraStart !== -1) {
  const botoneraEnd = code.indexOf('</div>', botoneraStart + 100) + 6;
  code = code.substring(0, botoneraStart) + code.substring(botoneraEnd);
  console.log('Removed Botonera');
}

// 2. Add Nueva Venta (F8) to the top of Cart Header
const headerEndIdx = code.indexOf('</button>', code.indexOf('cambiarRubro(rubro ==='));
if (headerEndIdx !== -1) {
    const end = headerEndIdx + 9;
    const f8Btn = `\n            <button onClick={() => { if(carrito.length > 0) vaciarCarrito(); }} className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 hover:border-red-500 rounded-lg px-2.5 py-1 text-neutral-400 hover:text-red-400 transition-colors">
               <span className="text-[10px] font-bold uppercase">F8 Nueva Venta</span>
            </button>`;
    code = code.substring(0, end) + f8Btn + code.substring(end);
    console.log('Added F8 to Header');
}

// 3. Add F3 Buscar to the search bar.
const searchInputIdx = code.indexOf('<div className="relative">');
if (searchInputIdx !== -1) {
   // The next line is `<Search`... and then `<input`
   const endSearchDiv = code.indexOf('</div>', searchInputIdx) + 6;
   const f3Btn = `\n                <button onClick={() => { setModalBusquedaAbierto(true); setTimeout(() => busquedaInputRef.current?.focus(), 100); }} className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-neutral-800 border border-neutral-700 hover:border-indigo-500 rounded px-2 py-1.5 text-neutral-400 hover:text-indigo-400 transition-colors shadow-sm">
                   <span className="text-[10px] font-bold uppercase">F3 Buscar</span>
                </button>`;
   const inputEnd = code.indexOf('/>', code.indexOf('<input type="text" ref={searchInputRef}')) + 2;
   code = code.substring(0, inputEnd) + f3Btn + code.substring(inputEnd);
   console.log('Added F3 to Search Bar');
}

// 4. Add F2 Descuento next to F10 Pagar
// Search for "F10: Pagar (solo si hay items)" to see where to place F2. But I want to place it in the UI!
// The UI is `<button ...> <CreditCard size={16} /> Cobrar (F10) </button>`
const cobrarIdx = code.indexOf('Cobrar (F10)');
if (cobrarIdx !== -1) {
   const btnStart = code.lastIndexOf('<button', cobrarIdx);
   const f2Btn = `<button onClick={abrirModalDescuento} className="flex-1 h-12 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 bg-neutral-900 border border-neutral-800 hover:bg-amber-500/10 hover:border-amber-500/30 text-neutral-400 hover:text-amber-400 transition-colors">
                 <span className="text-[11px] font-bold uppercase">F2 Descuento</span>
               </button>\n               `;
   code = code.substring(0, btnStart) + f2Btn + code.substring(btnStart);
   console.log('Added F2 next to Cobrar');
}

// 5. Add ModalDescuento component
const modalStr = '{/* ── Modal: Pago Avanzado';
const modalIndex = code.indexOf(modalStr);
if (modalIndex !== -1 && !code.includes('Modal: Descuento')) {
    const descuentoModal = `
      {/* 💸 Modal: Descuento (F2) */}
      {modalDescuentoAbierto && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden text-neutral-200 font-sans">
             <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50 shrink-0">
               <h3 className="text-lg font-bold text-white flex items-center gap-2">
                 <span className="bg-amber-500/10 text-amber-500 p-1.5 rounded-lg">
                   <Minus size={16} />
                 </span>
                 Descuento General
               </h3>
               <button onClick={() => setModalDescuentoAbierto(false)} className="text-neutral-500 hover:text-white transition-colors">
                 <X size={20} />
               </button>
             </div>
             <div className="p-6 flex flex-col gap-4">
                <p className="text-sm text-neutral-400">Ingrese el porcentaje de descuento a aplicar sobre el subtotal de esta orden.</p>
                <div>
                   <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 block">Porcentaje (%)</label>
                   <input
                     type="number" min="0" max="100" autoFocus
                     value={descuentoTemp} onChange={e => setDescuentoTemp(e.target.value)}
                     className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white text-lg font-mono focus:border-amber-500 focus:outline-none transition-colors text-center"
                     placeholder="Ej. 10"
                     onKeyDown={e => { if(e.key === 'Enter') aplicarDescuentoGlobal(); }}
                   />
                </div>
                <button onClick={aplicarDescuentoGlobal} className="w-full mt-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold py-3 rounded-xl transition-all shadow-lg shadow-amber-500/20">
                   Aplicar Descuento
                </button>
             </div>
          </div>
        </div>
      )}
    `;
    code = code.substring(0, modalIndex) + descuentoModal + '\n      ' + code.substring(modalIndex);
    console.log('Added Descuento Modal');
}

fs.writeFileSync(file, code);
