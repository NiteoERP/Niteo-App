const fs = require('fs');
let code = fs.readFileSync('src/components/compras/MobileCompraForm.tsx', 'utf-8');

// Fix the label that says Moneda but actually is Método de Pago
code = code.replace(
  /<label className="block text-sm font-medium text-neutral-400 mb-1">Moneda<\/label>\s*<CreatableSelect\s*options=\{metodosDisponibles/,
  '<label className="block text-sm font-medium text-neutral-400 mb-1">Método de Pago</label>\n                <CreatableSelect\n                  options={metodosDisponibles'
);

// Make the Moneda selectable instead of cursor-not-allowed
code = code.replace(
  /<div className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-neutral-500 cursor-not-allowed">\s*\{monedaGlobal === 'USD' \? '\$ USD' : 'Bs VES'\}\s*<\/div>/,
  `<select
                      value={monedaGlobal}
                      onChange={(e) => setMonedaGlobal(e.target.value as 'USD' | 'VES')}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-indigo-500"
                    >
                      <option value="USD">USD</option>
                      <option value="VES">Bs</option>
                    </select>`
);

fs.writeFileSync('src/components/compras/MobileCompraForm.tsx', code);
console.log("MobileCompraForm patched");
