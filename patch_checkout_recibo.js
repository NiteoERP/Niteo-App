const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

code = code.replace(
  /wailsApp\.ImprimirPrecuenta\(\n\s*pedidoActualID \|\| '', nombreFinal, meseroNombre \|\| '',\n\s*usuarioActivo\?.nombre \|\| 'Cajero',\n\s*carrito\.map\(i => \(\{\.\.\.i\}\)\), totalUSD, tasaEfectiva\n\s*\);/g,
  `wailsApp.ImprimirRecibo(
                 pedidoActualID || '', nombreFinal, clienteCedula, clienteTelefono, meseroNombre || '',
                 usuarioActivo?.nombre || 'Cajero',
                 carrito.map(i => ({...i})), totalUSD, tasaEfectiva
               );`
);

// We should also ensure we are using wailsApp.ImprimirRecibo instead of ImprimirPrecuenta in the if check:
code = code.replace(/if \(\!\(window as any\)\._skipPrint && wailsApp\.ImprimirPrecuenta\) \{/g, `if (!(window as any)._skipPrint && wailsApp.ImprimirRecibo) {`);

fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', code);
console.log("Patched checkout to call ImprimirRecibo");
