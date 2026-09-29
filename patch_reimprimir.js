const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

const oldReimprimirCode = `const reimprimirVenta = async () => {
     if (!historialSeleccionadoID) return;
     const venta = listaHistorial.find(v => v.id === historialSeleccionadoID);
     if (!venta) return;
     
     try {
        const wailsApp = (window as any).go?.main?.App;
        if (wailsApp && wailsApp.ImprimirPrecuenta) {
           await wailsApp.ImprimirPrecuenta(
              venta.id, 
              venta.nombre_eventual || 'Venta Rapida', 
              venta.mesero_nombre || '', 
              usuarioActivo?.nombre || 'Cajero', 
              historialDetalles, 
              venta.total, 
              tasaEfectiva
           );
           setResultado({ ok: true, msg: 'Reimprimiendo ticket...' });
        }
     } catch(e: any) {
        setResultado({ ok: false, msg: e.message });
     }
  };`;

const newReimprimirCode = `const reimprimirVenta = async () => {
     if (!historialSeleccionadoID) return;
     const venta = listaHistorial.find(v => v.id === historialSeleccionadoID);
     if (!venta) return;
     
     try {
        const wailsApp = (window as any).go?.main?.App;
        if (wailsApp && wailsApp.ImprimirPrecuenta) {
           await wailsApp.ImprimirPrecuenta(
              venta.id, 
              venta.nombre_eventual || 'Venta Rapida', 
              venta.mesero_nombre || '', 
              venta.cajero_nombre || usuarioActivo?.nombre || 'Cajero', 
              historialDetalles, 
              venta.total, 
              tasaEfectiva
           );
           setResultado({ ok: true, msg: 'Reimprimiendo ticket...' });
        }
     } catch(e: any) {
        setResultado({ ok: false, msg: e.message });
     }
  };`;

if (code.includes(oldReimprimirCode)) {
    code = code.replace(oldReimprimirCode, newReimprimirCode);
} else {
    // maybe spacing issue
    console.log("Could not find reimprimirVenta exact match");
}

fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', code);
