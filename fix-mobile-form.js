const fs = require('fs');
let code = fs.readFileSync('src/components/compras/MobileCompraForm.tsx', 'utf-8');

// Add React Select import
if (!code.includes("import CreatableSelect")) {
  code = code.replace(
    /import \{ Loader2, CheckCircle2, ShoppingCart, Search, Plus, Trash2, Building2 \} from 'lucide-react';/,
    `import { Loader2, CheckCircle2, ShoppingCart, Search, Plus, Trash2, Building2 } from 'lucide-react';\nimport CreatableSelect from 'react-select/creatable';`
  );
}

// Add state for metodoPago
code = code.replace(
  /const \[monedaGlobal, setMonedaGlobal\] = useState<'USD'\|'VES'>\('USD'\);/,
  `const [monedaGlobal, setMonedaGlobal] = useState<'USD'|'VES'>('USD');
  const [metodoPago, setMetodoPago] = useState('Efectivo USD');
  const metodosDisponibles = ['Efectivo USD', 'Efectivo Bs', 'Pago Móvil', 'Zelle', 'Punto de Venta'];`
);

// Add to payload
code = code.replace(
  /moneda: monedaGlobal,\s+tasa: tasaDelDia,/,
  `moneda: monedaGlobal,
          tasa: tasaDelDia,
          metodo_pago: metodoPago,`
);

// Add the selector in the UI
code = code.replace(
  /<select \n\s*value=\{monedaGlobal\}\n\s*onChange=\{\(e\) => setMonedaGlobal\(e\.target\.value as 'USD'\|'VES'\)\}\n\s*className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2\.5 text-white outline-none focus:border-indigo-500"\n\s*>\n\s*<option value="USD">Dólares \(USD\)<\/option>\n\s*<option value="VES">Bolívares \(VES\)<\/option>\n\s*<\/select>/,
  `<div className="flex gap-2">
                  <select 
                    value={monedaGlobal}
                    onChange={(e) => setMonedaGlobal(e.target.value as 'USD'|'VES')}
                    className="w-32 bg-neutral-900 border border-neutral-800 rounded-xl px-2 py-2.5 text-white outline-none focus:border-indigo-500"
                  >
                    <option value="USD">USD</option>
                    <option value="VES">Bs</option>
                  </select>
                  <div className="flex-1">
                    <CreatableSelect
                      options={metodosDisponibles.map((m) => ({ value: m, label: m }))}
                      value={{ value: metodoPago, label: metodoPago }}
                      onChange={(selected) => setMetodoPago(selected ? selected.value : '')}
                      placeholder="Ej. Zelle"
                      styles={{
                        control: (base) => ({ ...base, backgroundColor: '#171717', borderColor: '#262626', minHeight: '46px', borderRadius: '0.75rem', color: '#fff' }),
                        menu: (base) => ({ ...base, backgroundColor: '#171717', border: '1px solid #262626' }),
                        option: (base, state) => ({ ...base, backgroundColor: state.isFocused ? '#262626' : '#171717', color: '#fff' }),
                        singleValue: (base) => ({ ...base, color: '#fff' }),
                        input: (base) => ({ ...base, color: '#fff' })
                      }}
                    />
                  </div>
                </div>`
);

fs.writeFileSync('src/components/compras/MobileCompraForm.tsx', code);
