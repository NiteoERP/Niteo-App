const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

// 1. Add state for column filters
const stateInsert = `const [fechaInicioHistorial, setFechaInicioHistorial] = useState(new Date().toISOString().split('T')[0]);`;
if (code.includes(stateInsert) && !code.includes('filtrosHistorial')) {
    code = code.replace(stateInsert, `const [fechaInicioHistorial, setFechaInicioHistorial] = useState(new Date().toISOString().split('T')[0]);\n  const [filtrosHistorial, setFiltrosHistorial] = useState({ id: '', cajero: '', cliente: '', metodo: '' });`);
}

// 2. Filter logic before mapping
const mapStart = `{listaHistorial.map(v => {`;
const newMapStart = `{listaHistorial.filter(v => {
                         if (filtrosHistorial.id && !v.id.toLowerCase().includes(filtrosHistorial.id.toLowerCase())) return false;
                         if (filtrosHistorial.cajero && !(v.cajero_nombre || '').toLowerCase().includes(filtrosHistorial.cajero.toLowerCase())) return false;
                         if (filtrosHistorial.cliente && !(v.nombre_eventual || '').toLowerCase().includes(filtrosHistorial.cliente.toLowerCase())) return false;
                         if (filtrosHistorial.metodo) {
                            const mt = v.metodos_pago ? v.metodos_pago.join(', ').toLowerCase() : '';
                            if (!mt.includes(filtrosHistorial.metodo.toLowerCase())) return false;
                         }
                         return true;
                       }).map(v => {`;
if (code.includes(mapStart)) {
    code = code.replace(mapStart, newMapStart);
}

// 3. Update the thead to include inputs
const theadCode = `<thead className="sticky top-0 bg-neutral-900 text-neutral-400 border-b border-neutral-800">`;
const theadEnd = `</thead>`;
const theadIdx = code.indexOf(theadCode);
if (theadIdx !== -1) {
    const endIdx = code.indexOf(theadEnd, theadIdx);
    const oldThead = code.substring(theadIdx, endIdx + 8);
    
    const newThead = `<thead className="sticky top-0 bg-neutral-900 text-neutral-400 z-10">
                       <tr>
                         <th className="px-3 py-2 font-semibold border-b border-neutral-800">ID</th>
                         <th className="px-3 py-2 font-semibold border-b border-neutral-800">Tipo</th>
                         <th className="px-3 py-2 font-semibold border-b border-neutral-800">Usuario (Cajero)</th>
                         <th className="px-3 py-2 font-semibold border-b border-neutral-800">Cliente</th>
                         <th className="px-3 py-2 font-semibold border-b border-neutral-800">Fecha</th>
                         <th className="px-3 py-2 font-semibold border-b border-neutral-800">Tipo de pago</th>
                         <th className="px-3 py-2 font-semibold border-b border-neutral-800 text-right">Total Bs</th>
                         <th className="px-3 py-2 font-semibold border-b border-neutral-800 text-right">Total USD</th>
                       </tr>
                       <tr className="bg-neutral-950 border-b border-neutral-800">
                         <th className="px-2 py-1"><input type="text" placeholder="Filtrar ID..." value={filtrosHistorial.id} onChange={e => setFiltrosHistorial({...filtrosHistorial, id: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-0.5 text-[10px] text-neutral-300 outline-none focus:border-indigo-500 font-normal" /></th>
                         <th className="px-2 py-1"></th>
                         <th className="px-2 py-1"><input type="text" placeholder="Buscar usuario..." value={filtrosHistorial.cajero} onChange={e => setFiltrosHistorial({...filtrosHistorial, cajero: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-0.5 text-[10px] text-neutral-300 outline-none focus:border-indigo-500 font-normal" /></th>
                         <th className="px-2 py-1"><input type="text" placeholder="Buscar cliente..." value={filtrosHistorial.cliente} onChange={e => setFiltrosHistorial({...filtrosHistorial, cliente: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-0.5 text-[10px] text-neutral-300 outline-none focus:border-indigo-500 font-normal" /></th>
                         <th className="px-2 py-1"></th>
                         <th className="px-2 py-1"><input type="text" placeholder="Método..." value={filtrosHistorial.metodo} onChange={e => setFiltrosHistorial({...filtrosHistorial, metodo: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-0.5 text-[10px] text-neutral-300 outline-none focus:border-indigo-500 font-normal" /></th>
                         <th className="px-2 py-1"></th>
                         <th className="px-2 py-1"></th>
                       </tr>
                     </thead>`;
    code = code.replace(oldThead, newThead);
}

// 4. Update the footer stats to count only filtered items.
const footerStart = code.indexOf('{/* FOOTER STATS */}');
if (footerStart !== -1) {
  let footerSection = code.substring(footerStart, footerStart + 600);
  
  const filterLogic = `.filter(v => (!filtrosHistorial.id || v.id.toLowerCase().includes(filtrosHistorial.id.toLowerCase())) && (!filtrosHistorial.cajero || (v.cajero_nombre||'').toLowerCase().includes(filtrosHistorial.cajero.toLowerCase())) && (!filtrosHistorial.cliente || (v.nombre_eventual||'').toLowerCase().includes(filtrosHistorial.cliente.toLowerCase())) && (!filtrosHistorial.metodo || (v.metodos_pago?v.metodos_pago.join(', ').toLowerCase():'').includes(filtrosHistorial.metodo.toLowerCase())))`;
  
  footerSection = footerSection.replace(/listaHistorial\.length/g, `listaHistorial${filterLogic}.length`);
  footerSection = footerSection.replace(/listaHistorial\.reduce/g, `listaHistorial${filterLogic}.reduce`);
  
  code = code.substring(0, footerStart) + footerSection + code.substring(footerStart + 600);
}

fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', code);
console.log('Added column filters');
