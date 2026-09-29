const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

code = code.replace(
  'title="Guardar Factura como PDF">',
  'title="Ver y Guardar como PDF" onClick={() => { if(historialSeleccionadoID && (window as any).runtime?.BrowserOpenURL) { (window as any).runtime.BrowserOpenURL(\'https://app.niteo.com/dashboard/ventas/\' + historialSeleccionadoID); } else { window.open(\'https://app.niteo.com/dashboard/ventas/\' + historialSeleccionadoID, \'_blank\'); } }}>'
);
fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', code);
