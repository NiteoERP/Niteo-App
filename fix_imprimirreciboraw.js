const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/printer.go', 'utf8');

code = code.replace(
  `func (a *App) ImprimirReciboRaw(pedidoID string, items []ItemCarrito, totalUSD float64, conf ConfigLocal, clienteNombre string, clienteCedula string, meseroNombre string, cajeroNombre string, tasaEfectiva float64) error {`,
  `func (a *App) ImprimirReciboRaw(pedidoID string, items []ItemCarrito, totalUSD float64, conf ConfigLocal, clienteNombre string, clienteCedula string, clienteTelefono string, meseroNombre string, cajeroNombre string, tasaEfectiva float64) error {`
);

fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/printer.go', code);
console.log("Fixed printer.go ImprimirReciboRaw signature");
