const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/compras/page.tsx', 'utf8');

// 1. Add monedaGasto state
code = code.replace(
  "const [gasto, setGasto] = useState(initialGasto);",
  "const [gasto, setGasto] = useState(initialGasto);\n  const [monedaGasto, setMonedaGasto] = useState<'USD'|'VES'>('USD');"
);

// 2. Add handleMontoChange and handleMonedaChange
const handlers =   const handleMontoChange = (val: string) => {
    const num = Number(val) || 0;
    const numTasa = Number(gasto.tasaCambio) || 0;
    
    if (monedaGasto === 'USD') {
      const numBs = num * numTasa;
      setGasto({ ...gasto, montoDivisas: val, montoBs: num > 0 ? numBs.toFixed(2) : '' });
    } else {
      const numDiv = numTasa > 0 ? (num / numTasa) : 0;
      setGasto({ ...gasto, montoBs: val, montoDivisas: num > 0 ? numDiv.toFixed(2) : '' });
    }
  };

  const handleMonedaChange = (nuevaMoneda: 'USD' | 'VES') => {
    setMonedaGasto(nuevaMoneda);
  };;

code = code.replace(
  "// Lógica Matemática Bidireccional",
  "// Lógica Matemática Bidireccional\n" + handlers
);

// 3. Replace the old UI fields with the new ones
// The original UI has:
// <div>
//   <label className="block text-sm font-medium text-neutral-300 mb-1.5">Monto (Divisas $) *</label>
//   ...
// </div>
// <div> ... Tasa ... </div>
// <div> ... Monto (Bolívares Bs) ... </div>

// We need to carefully replace this block.
// We can use a regex or string replacement for the specific blocks.
const searchHtml =             <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Monto (Divisas $) *</label>
              <input type="number" value={gasto.montoDivisas} onChange={e => handleMontoDivisasChange(e.target.value)} placeholder="0.00" className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5 flex items-center justify-between">
                Tasa de Cambio (Bs) * 
                <Lock size={12} className="text-indigo-400" />
              </label>
              <input type="number" value={gasto.tasaCambio} onChange={e => handleTasaChange(e.target.value)} placeholder="Ej: 36.50" className="w-full bg-indigo-900/10 border border-indigo-500/30 text-indigo-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors" />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Monto (Bolívares Bs)</label>
              <input type="number" value={gasto.montoBs} onChange={e => handleMontoBsChange(e.target.value)} placeholder="0.00" className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>;

const searchHtml2 = searchHtml.replace('Lógica Matemática', 'Lgica Matemtica'); // just in case

const replacementHtml =             <div className="grid grid-cols-2 gap-4 col-span-1 lg:col-span-1">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Monto *</label>
                <input type="number" value={monedaGasto === 'USD' ? gasto.montoDivisas : gasto.montoBs} onChange={e => handleMontoChange(e.target.value)} placeholder="0.00" className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <p className="text-xs text-neutral-500 mt-1 pl-1">
                  ˜ {monedaGasto === 'USD' ? (gasto.montoBs ? gasto.montoBs + ' Bs' : '0.00 Bs') : (gasto.montoDivisas ? '$' + gasto.montoDivisas : '.00')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Moneda</label>
                <select value={monedaGasto} onChange={e => handleMonedaChange(e.target.value as 'USD'|'VES')} className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="USD">USD ($)</option>
                  <option value="VES">VES (Bs)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5 flex items-center justify-between">
                Tasa de Cambio (Bs) * 
                <Lock size={12} className="text-indigo-400" />
              </label>
              <input type="number" value={gasto.tasaCambio} onChange={e => {
                // handleTasaChange modificado en linea
                const val = e.target.value;
                const numTasa = Number(val);
                if (monedaGasto === 'USD') {
                  const numDiv = Number(gasto.montoDivisas);
                  setGasto({ ...gasto, tasaCambio: val, montoBs: numDiv > 0 ? (numDiv * numTasa).toFixed(2) : '' });
                } else {
                  const numBs = Number(gasto.montoBs);
                  const numDiv = numTasa > 0 ? (numBs / numTasa) : 0;
                  setGasto({ ...gasto, tasaCambio: val, montoDivisas: numBs > 0 ? numDiv.toFixed(2) : '' });
                }
              }} placeholder="Ej: 36.50" className="w-full bg-indigo-900/10 border border-indigo-500/30 text-indigo-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors" />
            </div>;

// Use replace carefully
let hasReplaced = false;
const cleanCode = code.replace(searchHtml, () => { hasReplaced = true; return replacementHtml; });

if (!hasReplaced) {
    // If not found, let's find indices and splice
    const startIdx = code.indexOf('<label className="block text-sm font-medium text-neutral-300 mb-1.5">Monto (Divisas $) *</label>');
    const endStr = 'Monto (Bolívares Bs)</label>';
    const endIdx = code.indexOf(endStr);
    
    if (startIdx !== -1 && endIdx !== -1) {
        // Find the div wrapper starts and ends
        const blockStart = code.lastIndexOf('<div>', startIdx);
        let blockEnd = code.indexOf('</div>', endIdx);
        blockEnd = code.indexOf('</div>', blockEnd + 1); // skip to next closing div or something?
        // Actually, let's just let it be if it fails and I'll use index based splice
    }
} else {
    fs.writeFileSync('src/app/dashboard/compras/page.tsx', cleanCode, 'utf8');
}
console.log("Success: " + hasReplaced);
