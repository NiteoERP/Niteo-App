const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

// 1. Add modoHistorial state
const stateInsert = `const [listaHistorial, setListaHistorial] = useState<any[]>([]);`;
if (code.includes(stateInsert) && !code.includes('modoHistorial')) {
    code = code.replace(stateInsert, `const [listaHistorial, setListaHistorial] = useState<any[]>([]);\n  const [modoHistorial, setModoHistorial] = useState<'local' | 'sede'>('local');`);
}

// 2. Modify cargarHistorial
const cargarHistorialCode = `const cargarHistorial = async () => {
     const wailsApp = (window as any).go?.main?.App;
     if (wailsApp && wailsApp.ObtenerHistorialVentas) {
        setListaHistorial(await wailsApp.ObtenerHistorialVentas() || []);
     }
  };`;
const newCargarHistorial = `const cargarHistorial = async (modo = modoHistorial) => {
     const wailsApp = (window as any).go?.main?.App;
     try {
       if (modo === 'sede' && wailsApp?.ObtenerHistorialNube) {
         setListaHistorial(await wailsApp.ObtenerHistorialNube() || []);
       } else if (wailsApp?.ObtenerHistorialVentas) {
         setListaHistorial(await wailsApp.ObtenerHistorialVentas() || []);
       }
     } catch (e) {
       console.error(e);
       showToast("Error al cargar historial: " + (e.message || e), 'error');
     }
  };`;
if (code.includes(cargarHistorialCode)) {
    code = code.replace(cargarHistorialCode, newCargarHistorial);
}

// 2b. Add effect dependency for modoHistorial
const effectSearch = `useEffect(() => {
     if (vistaActual === 'historial') {
        cargarHistorial();
     }
  }, [vistaActual]);`;
if (code.includes(effectSearch)) {
    code = code.replace(effectSearch, `useEffect(() => {
     if (vistaActual === 'historial') {
        cargarHistorial(modoHistorial);
     }
  }, [vistaActual, modoHistorial]);`);
}

// 3. Modify verDetalleVenta
const verDetalleVentaCode = `const verDetalleVenta = async (venta: any) => {
    setModalHistorialDetalle(venta);
    const wailsApp = (window as any).go?.main?.App;
    if (wailsApp && wailsApp.ObtenerDetallesPedido) {
      const items = await wailsApp.ObtenerDetallesPedido(venta.id);
      setDetallesVenta(items || []);
    }
  };`;
const newVerDetalleVenta = `const verDetalleVenta = async (venta: any) => {
    setModalHistorialDetalle(venta);
    const wailsApp = (window as any).go?.main?.App;
    try {
      if (modoHistorial === 'sede' && wailsApp?.ObtenerDetallesNube) {
        const items = await wailsApp.ObtenerDetallesNube(venta.id);
        setDetallesVenta(items || []);
      } else if (wailsApp?.ObtenerDetallesPedido) {
        const items = await wailsApp.ObtenerDetallesPedido(venta.id);
        setDetallesVenta(items || []);
      }
    } catch(e) {
      console.error(e);
      showToast("Error cargando detalles", 'error');
    }
  };`;
if (code.includes(verDetalleVentaCode)) {
    code = code.replace(verDetalleVentaCode, newVerDetalleVenta);
}

// 4. Update Header UI
const headerCode = `<div className="flex items-center justify-between shrink-0">
               <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Últimas {listaHistorial.length} ventas</h3>
               <button onClick={cargarHistorial} className="flex items-center gap-1 text-xs text-neutral-500 hover:text-white px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-800 transition-colors">
                 <RefreshCw size={12} /> Actualizar
               </button>
             </div>`;
const newHeaderCode = `<div className="flex items-center justify-between shrink-0">
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
if (code.includes(headerCode)) {
    code = code.replace(headerCode, newHeaderCode);
}

// 5. Update render loop to show Cajero
const renderCode = `{v.mesero_nombre && <span className="text-xs text-neutral-600">· {v.mesero_nombre}</span>}`;
const newRenderCode = `{v.mesero_nombre && <span className="text-xs text-neutral-600">· Mesero: {v.mesero_nombre}</span>}
                           {v.cajero_nombre && <span className="text-xs text-amber-500/70">· Cajero: {v.cajero_nombre}</span>}`;
if (code.includes(renderCode)) {
    code = code.replace(renderCode, newRenderCode);
}

// 6. Reprint button uses the loaded detallesVenta? 
// Wait, when they open ModalHistorialDetalle, there's a reprint button in that modal.
// Let's check how reimprimirVenta in modal is defined.
fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', code);
console.log("Patched TerminalPOS.tsx");
