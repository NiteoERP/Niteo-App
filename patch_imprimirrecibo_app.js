const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/app.go', 'utf8');

const targetStr = `func (a *App) ImprimirPrecuenta(pedidoID string, clienteNombre string, meseroNombre string, cajeroNombre string, items []ItemCarrito, totalUSD float64, tasaEfectiva float64) error {
	conf, err := a.GetConfig()
	if err != nil {
		return err
	}
	return a.ImprimirPrecuentaRaw(pedidoID, items, totalUSD, conf, clienteNombre, "", meseroNombre, cajeroNombre, tasaEfectiva)
}`;

const replacementStr = targetStr + `

// ImprimirRecibo imprime el recibo final con los datos completos del cliente.
func (a *App) ImprimirRecibo(pedidoID string, clienteNombre string, clienteCedula string, clienteTelefono string, meseroNombre string, cajeroNombre string, items []ItemCarrito, totalUSD float64, tasaEfectiva float64) error {
	conf, err := a.GetConfig()
	if err != nil {
		return err
	}
	return a.ImprimirReciboRaw(pedidoID, items, totalUSD, conf, clienteNombre, clienteCedula, clienteTelefono, meseroNombre, cajeroNombre, tasaEfectiva)
}`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/app.go', code);
console.log("Added ImprimirRecibo to app.go");
