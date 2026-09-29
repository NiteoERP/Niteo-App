const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

// 1. Add states
const stateInsert = `const [modoHistorial, setModoHistorial] = useState<'local' | 'sede'>('local');`;
if (code.includes(stateInsert) && !code.includes('fechaInicioHistorial')) {
    code = code.replace(stateInsert, `const [modoHistorial, setModoHistorial] = useState<'local' | 'sede'>('local');
  const [fechaInicioHistorial, setFechaInicioHistorial] = useState(new Date().toISOString().split('T')[0]);
  const [fechaFinHistorial, setFechaFinHistorial] = useState(new Date().toISOString().split('T')[0]);`);
}

// 2. Modificar cargarHistorial
const cargarOld = `const cargarHistorial = async (modo = modoHistorial) => {
     const wailsApp = (window as any).go?.main?.App;
     try {
       if (modo === 'sede' && wailsApp?.ObtenerHistorialNube) {
         setListaHistorial(await wailsApp.ObtenerHistorialNube() || []);
       } else if (wailsApp?.ObtenerHistorialVentas) {
         setListaHistorial(await wailsApp.ObtenerHistorialVentas() || []);
       }`;

const cargarNew = `const cargarHistorial = async (modo = modoHistorial, fi = fechaInicioHistorial, ff = fechaFinHistorial) => {
     const wailsApp = (window as any).go?.main?.App;
     try {
       if (modo === 'sede' && wailsApp?.ObtenerHistorialNube) {
         setListaHistorial(await wailsApp.ObtenerHistorialNube(fi, ff) || []);
       } else if (wailsApp?.ObtenerHistorialVentas) {
         setListaHistorial(await wailsApp.ObtenerHistorialVentas(fi, ff) || []);
       }`;

code = code.replace(cargarOld, cargarNew);


// 3. Modificar useEffect to depend on dates
const effectOld = `useEffect(() => {
     if (vistaActual === 'historial') {
        cargarHistorial(modoHistorial);
     }
  }, [vistaActual, modoHistorial]);`;
const effectNew = `useEffect(() => {
     if (vistaActual === 'historial') {
        cargarHistorial(modoHistorial, fechaInicioHistorial, fechaFinHistorial);
     }
  }, [vistaActual, modoHistorial, fechaInicioHistorial, fechaFinHistorial]);`;
code = code.replace(effectOld, effectNew);


// 4. Update the UI
const headerOld = `<div className="flex items-center justify-between shrink-0">
               <div className="flex items-center gap-4">
                 <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Últimas {listaHistorial.length} ventas</h3>
                 <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800">
                    <button onClick={() => setModoHistorial('local')} className={\`px-3 py-1 text-xs font-bold rounded-md transition-colors \${modoHistorial === 'local' ? 'bg-indigo-600 text-white' : 'text-neutral-500 hover:text-white'}\`}>Local (Esta Caja)</button>
                    <button onClick={() => setModoHistorial('sede')} className={\`px-3 py-1 text-xs font-bold rounded-md transition-colors \${modoHistorial === 'sede' ? 'bg-emerald-600 text-white' : 'text-neutral-500 hover:text-white'}\`}>Sede (Nube)</button>
                 </div>
               </div>
               <button onClick={() => cargarHistorial(modoHistorial)} className="flex items-center gap-1 text-xs text-neutral-500 hover:text-white px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-800 transition-colors">
                 <RefreshCw size={12} /> Actualizar
               </button>
             </div>`;
             
const headerNew = `<div className="flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-3">
               <div className="flex flex-wrap items-center gap-4">
                 <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Últimas {listaHistorial.length} ventas</h3>
                 <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800">
                    <button onClick={() => setModoHistorial('local')} className={\`px-3 py-1 text-xs font-bold rounded-md transition-colors \${modoHistorial === 'local' ? 'bg-indigo-600 text-white' : 'text-neutral-500 hover:text-white'}\`}>Local (Esta Caja)</button>
                    <button onClick={() => setModoHistorial('sede')} className={\`px-3 py-1 text-xs font-bold rounded-md transition-colors \${modoHistorial === 'sede' ? 'bg-emerald-600 text-white' : 'text-neutral-500 hover:text-white'}\`}>Sede (Nube)</button>
                 </div>
               </div>
               
               <div className="flex items-center gap-3">
                 <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1">
                   <Calendar size={14} className="text-neutral-500" />
                   <input 
                     type="date" 
                     value={fechaInicioHistorial} 
                     onChange={e => setFechaInicioHistorial(e.target.value)} 
                     className="bg-transparent text-xs text-neutral-300 outline-none"
                   />
                   <span className="text-neutral-600">-</span>
                   <input 
                     type="date" 
                     value={fechaFinHistorial} 
                     onChange={e => setFechaFinHistorial(e.target.value)} 
                     className="bg-transparent text-xs text-neutral-300 outline-none"
                   />
                 </div>
                 <button onClick={() => cargarHistorial(modoHistorial, fechaInicioHistorial, fechaFinHistorial)} className="flex items-center gap-1 text-xs text-neutral-500 hover:text-white px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 transition-colors">
                   <RefreshCw size={12} /> Actualizar
                 </button>
               </div>
             </div>`;

code = code.replace(headerOld, headerNew);

fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', code);
console.log("Patched UI");
