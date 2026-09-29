const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

const searchIdx = code.indexOf('<!-- Panel Izquierdo');
if (searchIdx !== -1) {
  console.log(code.substring(searchIdx - 200, searchIdx + 400));
} else {
  // Let's find the main left panel container
  const mainIdx = code.indexOf('flex-1 flex flex-col min-w-0 bg-[#0F0F0F] p-4 lg:p-6 pb-24 lg:pb-6 relative');
  if (mainIdx !== -1) {
    console.log(code.substring(mainIdx - 50, mainIdx + 150));
  } else {
    // Just find the return
    const pos = code.indexOf('<div className="min-h-screen flex flex-col items-center justify-center');
    // Wait, the POS is NOT the setup view. Let's find the POS layout start.
    const setupEnd = code.indexOf('Bienvenido a Niteo POS');
    // ...
  }
}

