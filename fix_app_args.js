const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/app.go', 'utf8');

code = code.replace(
  `return a.ImprimirPrecuentaRaw(pedidoID, items, totalUSD, conf, clienteNombre, "", meseroNombre, cajeroNombre, tasaEfectiva)`,
  `return a.ImprimirPrecuentaRaw(pedidoID, items, totalUSD, conf, clienteNombre, meseroNombre, cajeroNombre, tasaEfectiva)`
);

code = code.replace(
  `return a.ImprimirReciboRaw(pedidoID, items, totalUSD, conf, clienteNombre, clienteCedula, clienteTelefono, meseroNombre, cajeroNombre, tasaEfectiva)`,
  `return a.ImprimirReciboRaw(pedidoID, items, totalUSD, conf, clienteNombre, clienteCedula, clienteTelefono, meseroNombre, cajeroNombre, tasaEfectiva)`
);

fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/app.go', code);
console.log("Fixed app.go args");
