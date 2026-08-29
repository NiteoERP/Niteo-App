const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/creditos/page.tsx', 'utf-8');

const regex = /<select\s+value=\{metodoPago\}\s+onChange=\{\(e\) => setMetodoPago\(e\.target\.value\)\}\s+className="w-full bg-neutral-950 border border-neutral-800 focus:border-neutral-600 text-white font-medium py-3 px-4 rounded-xl outline-none appearance-none"\s*>\s*\{metodosDisponibles\.map\(m => \(\s*<option key=\{m\} value=\{m\}>\{m\}<\/option>\s*\)\)\}\s*<\/select>/g;

const replacement = `<CreatableSelect
                  options={metodosDisponibles.map((m) => ({ value: m, label: m }))}
                  value={{ value: metodoPago, label: metodoPago }}
                  onChange={(selected) => setMetodoPago(selected ? selected.value : '')}
                  placeholder="Escribe o selecciona..."
                  styles={{
                    control: (base) => ({ ...base, backgroundColor: '#0a0a0a', borderColor: '#262626', minHeight: '50px', borderRadius: '0.75rem', color: '#fff' }),
                    menu: (base) => ({ ...base, backgroundColor: '#171717', border: '1px solid #262626', zIndex: 9999 }),
                    option: (base, state) => ({ ...base, backgroundColor: state.isFocused ? '#262626' : '#171717', color: '#fff' }),
                    singleValue: (base) => ({ ...base, color: '#fff' }),
                    input: (base) => ({ ...base, color: '#fff' })
                  }}
                />`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/app/dashboard/creditos/page.tsx', code);
