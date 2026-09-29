const fs = require('fs');
const file = 'c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/views/Impresoras.tsx';
let code = fs.readFileSync(file, 'utf8');

const idx = code.indexOf("setConfigurando('cocina')");
if (idx !== -1) {
  const btnStart = code.lastIndexOf('<button', idx);
  const btnEnd = code.indexOf('</button>', idx) + 9;
  code = code.substring(0, btnStart) + code.substring(btnEnd);
  console.log('Removed Configurar Cocina button');
}

// Replace "Impresora de {configurando === 'recibo' ? 'recibos' : 'cocina'}" with just "Ajustes de Formato (Tickets)"
code = code.replace("Impresora de {configurando === 'recibo' ? 'recibos' : 'cocina'}", "Ajustes de Formato (Tickets)");

fs.writeFileSync(file, code);
