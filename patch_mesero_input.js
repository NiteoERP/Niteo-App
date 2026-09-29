const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

const s1 = code.indexOf('<input');
const s2 = code.indexOf('</datalist>', s1) + 11;
// Wait, we need the exact block:
const searchBlock = `<input
                type="text"
                list="datalist-meseros"
                placeholder={rubro === 'restaurante' ? "Mesero (opcional)" : "Vendedor (opcional)"}
                value={meseroNombre}
                onChange={e => setMeseroNombre(e.target.value)}
                className="bg-transparent text-xs text-white placeholder:text-neutral-500 focus:outline-none w-full"
              />
              <datalist id="datalist-meseros">
                {listaMeseros.map(m => <option key={m} value={m} />)}
              </datalist>`;

const replacement = `{listaMeseros.length > 0 ? (
                <select
                  value={meseroNombre}
                  onChange={e => setMeseroNombre(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none w-full appearance-none"
                >
                  <option value="">{rubro === 'restaurante' ? "Sin mesero" : "Sin vendedor"}</option>
                  {listaMeseros.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder={rubro === 'restaurante' ? "Mesero (opcional)" : "Vendedor (opcional)"}
                  value={meseroNombre}
                  onChange={e => setMeseroNombre(e.target.value)}
                  className="bg-transparent text-xs text-white placeholder:text-neutral-500 focus:outline-none w-full"
                />
              )}`;

code = code.replace(searchBlock, replacement);
fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', code);
console.log("Patched TerminalPOS.tsx mesero input");
