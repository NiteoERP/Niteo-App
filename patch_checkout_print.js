const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

const targetStr = `// Autoguardar cliente si tiene los 3 campos completos
            await autoguardarCliente();
            setResultado({ ok: true, msg: restante > 0 ? 'Venta procesada con CRÉDITO PENDIENTE.' : 'Venta pagada ✓' });`;

const replacementStr = `// Autoguardar cliente si tiene los 3 campos completos
            await autoguardarCliente();
            
            // 🔥 Niteo Print Logic: Solo imprimir si el usuario no usó el botón de "Solo Guardar"
            if (!(window as any)._skipPrint && wailsApp.ImprimirPrecuenta) {
               // Imprimir recibo al finalizar venta (pasamos un booleano especial o el mismo Precuenta)
               await wailsApp.ImprimirPrecuenta(
                 pedidoActualID || '', nombreFinal, meseroNombre || '',
                 usuarioActivo?.nombre || 'Cajero',
                 carrito.map(i => ({...i})), totalUSD, tasaEfectiva
               );
            }
            
            setResultado({ ok: true, msg: restante > 0 ? 'Venta procesada con CRÉDITO PENDIENTE.' : 'Venta pagada ✓' });`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', code);
console.log("Added auto-print to checkout");
