const fs = require('fs');
let code = fs.readFileSync('src/components/compras/MobileCompraForm.tsx', 'utf-8');

// 1. Add state
code = code.replace(
  "const [metodoPago, setMetodoPago] = useState('Efectivo USD');",
  "const [metodoPago, setMetodoPago] = useState('Efectivo USD');\n  const [descripcion, setDescripcion] = useState('');"
);

// 2. Add parameter to registrarFacturaInsumos
code = code.replace(
  "metodo_pago: metodoPago,",
  "metodo_pago: metodoPago,\n          descripcion: descripcion,"
);

// 3. Clear state on success
code = code.replace(
  "setProveedor('');",
  "setProveedor('');\n        setDescripcion('');"
);

// 4. Add UI field
const correctBlock = `<div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-neutral-950/50 p-4 rounded-xl border border-neutral-800/50">
            <div className="sm:col-span-2">
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
            
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-neutral-400 mb-1">Concepto / Descripción (Opcional)</label>
              <input 
                type="text" 
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej. Compra semanal..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-neutral-400 mb-1">Moneda Global</label>
              <select 
                value={monedaGlobal}
                onChange={(e) => setMonedaGlobal(e.target.value as 'USD' | 'VES')}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500"
              >
                <option value="USD">USD</option>
                <option value="VES">VES</option>
              </select>
            </div>
            <div className="sm:col-span-2">
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
          </div>`;

code = code.replace(
  /<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-neutral-950\/50 p-4 rounded-xl border border-neutral-800\/50">[\s\S]*?<\/div>\s*<hr className="border-neutral-800" \/>/,
  correctBlock + '\n          <hr className="border-neutral-800" />'
);

fs.writeFileSync('src/components/compras/MobileCompraForm.tsx', code);
console.log('MobileCompraForm patched for description');
