const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

const s1 = code.indexOf('const guardarComandaAbierta = async ()');

const silentSaveFunc = `  const guardarComandaSilencioso = async () => {
     const wailsApp = (window as any).go?.main?.App;
     if (!wailsApp || !wailsApp.GuardarComandaSinImprimir) {
        return;
     }
     try {
        const nombreFinal = construirNombreCuenta();
        const id = await wailsApp.GuardarComandaSinImprimir(
          pedidoActualID, sedeID, usuarioActivo?.id || 'cajero-1',
          clienteID, nombreFinal,
          clienteCedula, clienteTelefono,
          meseroNombre, carrito, totalUSD
        );
        setResultado({ ok: true, msg: 'Cuenta guardada silenciosamente ✓' });
        limpiarVenta();
        setVistaActual('mesas');
     } catch (e: any) {
        setResultado({ ok: false, msg: e.message });
     }
  };
  
`;

code = code.substring(0, s1) + silentSaveFunc + code.substring(s1);

const comandaBtnStr = `<button
                 type="button"
                 onClick={guardarComandaAbierta}`;

const newComandaBtns = `<button
                 type="button"
                 onClick={guardarComandaSilencioso}
                 disabled={carrito.length === 0}
                 className="flex-1 h-12 rounded-xl text-xs font-bold flex flex-col items-center justify-center bg-neutral-900 border border-neutral-800/50 hover:bg-neutral-800 text-neutral-200 disabled:opacity-40 transition-colors"
                 title="Guardar cuenta sin imprimir comanda"
               >
                 <Cloud size={15} className="mb-0.5 text-neutral-400" /> Guardar
               </button>
               
               <button
                 type="button"
                 onClick={guardarComandaAbierta}`;

code = code.replace(comandaBtnStr, newComandaBtns);

fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', code);
console.log("Added guardarComandaSilencioso to TerminalPOS.tsx");
