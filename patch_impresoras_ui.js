const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/views/Impresoras.tsx', 'utf8');

// 1. Add tamanoCocina state
if (!code.includes('const [tamanoCocina')) {
  code = code.replace(
    /const \[tamanoTexto, setTamanoTexto\] = useState\(100\);/g,
    `const [tamanoTexto, setTamanoTexto] = useState(100);
  const [tamanoCocina, setTamanoCocina] = useState(100);`
  );
  
  // 2. Load it in useEffect
  code = code.replace(
    /setTamanoTexto\(pc\.tamano_fuente_recibo \|\| 100\);/g,
    `setTamanoTexto(pc.tamano_fuente_recibo || 100);
        setTamanoCocina(pc.tamano_fuente_cocina || 100);`
  );
  
  // 3. Save it in guardarConfiguracionLocal
  code = code.replace(
    /tamano_fuente_recibo:\s+tamanoTexto,/g,
    `tamano_fuente_recibo:      tamanoTexto,
        tamano_fuente_cocina:      tamanoCocina,`
  );
  
  // 4. Add UI for Kitchen Size
  const uiTarget = `<div>
              <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">Tamaño de Texto</label>
              <select 
                value={tamanoTexto} 
                onChange={(e) => setTamanoTexto(Number(e.target.value))}
                className="w-full bg-[#111111] border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-300 outline-none focus:border-indigo-500"
              >
                <option value={75}>Pequeño (75%)</option>
                <option value={100}>Normal (100%)</option>
                <option value={120}>Grande (120%)</option>
              </select>
            </div>`;
            
  const newUi = `<div>
              <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">Tamaño (Recibos)</label>
              <select 
                value={tamanoTexto} 
                onChange={(e) => setTamanoTexto(Number(e.target.value))}
                className="w-full bg-[#111111] border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-300 outline-none focus:border-indigo-500"
              >
                <option value={75}>Pequeño (Condensado)</option>
                <option value={100}>Normal</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">Tamaño (Comandas)</label>
              <select 
                value={tamanoCocina} 
                onChange={(e) => setTamanoCocina(Number(e.target.value))}
                className="w-full bg-[#111111] border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-300 outline-none focus:border-indigo-500"
              >
                <option value={75}>Pequeño (Condensado)</option>
                <option value={100}>Normal</option>
              </select>
            </div>`;
            
  code = code.replace(uiTarget, newUi);
  
  // Add tamano_fuente_cocina to PrinterConfig interface
  code = code.replace(
    /tamano_fuente_recibo\?:\s+number;/g,
    `tamano_fuente_recibo?:      number;
  tamano_fuente_cocina?:      number;`
  );
  
  fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/views/Impresoras.tsx', code);
}
console.log('Impresoras UI patched');
