const fs = require('fs');
let content = fs.readFileSync('src/components/compras/MobileCompraForm.tsx', 'utf8');

const regex = /{errorMsg}\r?\n\s*<\/div>\r?\n\s*\)}\r?\n\r?\n\s*{\/\* .*?Cabecera de la factura .*? \*\/}\r?\n\s*<div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-neutral-950\/50 p-4 rounded-xl border border-neutral-800\/50">/;

const replacement = `{errorMsg}
            </div>
          )}

          {/* \u2500 Cabecera de la factura \u2500 */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-neutral-950/50 p-4 rounded-xl border border-neutral-800/50">
            <div className="sm:col-span-4">
              <label className="block text-sm font-medium text-neutral-400 mb-1">
                Fecha de la Factura
              </label>
              <input
                type="date"
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
                className="w-full bg-[#171717] border border-[#262626] text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-neutral-500 mt-1">La tasa de cambio se ajustará a esta fecha automáticamente.</p>
            </div>`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/compras/MobileCompraForm.tsx', content, 'utf8');