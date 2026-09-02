const fs = require('fs');

let code = fs.readFileSync('src/components/compras/MobileCompraForm.tsx', 'utf-8');

const oldHeader = `          {/* Factura Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-950/50 p-4 rounded-xl border border-neutral-800/50">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Proveedor / Tienda</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                <input 
                  type="text" 
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  placeholder="Ej. Distribuidora XYZ"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Medio / Moneda de Pago</label>
              <select 
                value={monedaGlobal}
                onChange={(e) => setMonedaGlobal(e.target.value as 'USD'|'VES')}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500"
              >
                <option value="USD">Dlares (USD)</option>
                <option value="VES">Bolvares (VES)</option>
              </select>
            </div>
          </div>`;

const newHeader = `          {/* Factura Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-neutral-950/50 p-4 rounded-xl border border-neutral-800/50">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Proveedor / Tienda</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                <input 
                  type="text" 
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  placeholder="Ej. Distribuidora XYZ"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Moneda</label>
              <select 
                value={monedaGlobal}
                onChange={(e) => setMonedaGlobal(e.target.value as 'USD'|'VES')}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500"
              >
                <option value="USD">Dólares (USD)</option>
                <option value="VES">Bolívares (VES)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Método de Pago</label>
              <select 
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500"
              >
                {metodosDisponibles.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>`;

// Note: special characters like lares might fail literal string match, so I will use regex or index match
const startIndex = code.indexOf('{/* Factura Header */}');
const endIndex = code.indexOf('<hr className="border-neutral-800" />');

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + newHeader + '\\n\\n          ' + code.substring(endIndex);
}

fs.writeFileSync('src/components/compras/MobileCompraForm.tsx', code);
