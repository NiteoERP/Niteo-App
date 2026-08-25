const fs = require('fs');
let code = fs.readFileSync('src/components/compras/MobileCompraForm.tsx', 'utf8');

code = code.replace(/const \[monedaInput, setMonedaInput\][^\n]+\n/, '');
code = code.replace(/monedaItem:\s*monedaInput/g, 'monedaItem: monedaGlobal');

const originalSelect =                   <select 
                    value={monedaInput}
                    onChange={e => setMonedaInput(e.target.value as 'USD'|'VES')}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-white"
                  >
                    <option value="USD">$</option>
                    <option value="VES">Bs</option>
                  </select>;

const newSelect =                   <div className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl px-3 py-2.5 text-neutral-500 cursor-not-allowed">
                    {monedaGlobal === 'USD' ? '$' : 'Bs'}
                  </div>;

code = code.replace(originalSelect, newSelect);
fs.writeFileSync('src/components/compras/MobileCompraForm.tsx', code, 'utf8');
