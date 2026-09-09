const fs = require('fs');
let code = fs.readFileSync('src/components/compras/MobileCompraForm.tsx', 'utf-8');

const regex = /<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-neutral-950\/50 p-4 rounded-xl border border-neutral-800\/50">[\s\S]*?<\/div>\s*<hr className="border-neutral-800" \/>/;

const correctBlock = `<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-neutral-950/50 p-4 rounded-xl border border-neutral-800/50">
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
              <label className="block text-sm font-medium text-neutral-400 mb-1">Moneda Global</label>
              <select 
                value={monedaGlobal}
                onChange={(e) => setMonedaGlobal(e.target.value as 'USD' | 'VES')}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500"
              >
                <option value="USD">Dólar ($ USD)</option>
                <option value="VES">Bolívar (Bs VES)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Método de Pago</label>
              <CreatableSelect
                options={metodosDisponibles.map(m => ({value: m, label: m}))}
                value={{value: metodoPago, label: metodoPago}}
                onChange={(s) => setMetodoPago(s ? s.value : '')}
                onCreateOption={async (val) => {
                  const res = await addCompraMetodoPago(val);
                  if (res.success && res.data) {
                    setDbMetodos([...dbMetodos, res.data]);
                    setMetodoPago(res.data.nombre);
                  }
                }}
                placeholder="Selecciona o crea..."
                styles={{
                  control: (base) => ({
                    ...base,
                    backgroundColor: '#171717',
                    borderColor: '#262626',
                    borderRadius: '0.75rem',
                    padding: '2px',
                    color: 'white',
                    boxShadow: 'none',
                    '&:hover': { borderColor: '#4F46E5' }
                  }),
                  singleValue: (base) => ({ ...base, color: 'white' }),
                  input: (base) => ({ ...base, color: 'white' }),
                  menu: (base) => ({ ...base, backgroundColor: '#171717', border: '1px solid #262626' }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isFocused ? '#262626' : '#171717',
                    color: 'white',
                    '&:active': { backgroundColor: '#4F46E5' }
                  })
                }}
              />
            </div>
          </div>
          <hr className="border-neutral-800" />`;

code = code.replace(regex, correctBlock);

// Also fix the cursor-not-allowed field in the item form below so it reflects this new currency selection
code = code.replace(
  /<select\s*value=\{monedaGlobal\}\s*onChange=\{\(e\) => setMonedaGlobal\(e.target.value as 'USD' \| 'VES'\)\}\s*className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2\.5 text-white outline-none focus:border-indigo-500"\s*>\s*<option value="USD">USD<\/option>\s*<option value="VES">Bs<\/option>\s*<\/select>/,
  `<div className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-neutral-500 cursor-not-allowed">
                      {monedaGlobal === 'USD' ? '$ USD' : 'Bs VES'}
                    </div>`
);


fs.writeFileSync('src/components/compras/MobileCompraForm.tsx', code);
console.log("MobileCompraForm UI layout patched completely");
