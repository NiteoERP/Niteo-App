const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/printer.go', 'utf8');

const s1 = code.indexOf('func (a *App) ImprimirPrecuentaRaw');
const s2 = code.indexOf('func (a *App) ImprimirComandaRaw');

let preCuentaFunc = code.substring(s1, s2);

let reciboFunc = preCuentaFunc.replace('ImprimirPrecuentaRaw', 'ImprimirReciboRaw');
reciboFunc = reciboFunc.replace(
  'if err := printHeader(&b, pc, conf, is58, lineWidth, leftMarginDots, "PRE-CUENTA", pedidoID, clienteNombre, meseroNombre, cajeroNombre); err != nil {',
  'if err := printHeader(&b, pc, conf, is58, lineWidth, leftMarginDots, "RECIBO", pedidoID, clienteNombre, meseroNombre, cajeroNombre); err != nil {'
);
// Print customer data:
const targetHeader = `func printHeader(b *bytes.Buffer, pc PrinterConfig, conf ConfigLocal, is58 bool, lineWidth int, leftMargin int, tipoDocumento string, pedidoID string, clienteNombre string, meseroNombre string, cajeroNombre string) error {`;
const newHeader = `func printHeader(b *bytes.Buffer, pc PrinterConfig, conf ConfigLocal, is58 bool, lineWidth int, leftMargin int, tipoDocumento string, pedidoID string, clienteNombre string, meseroNombre string, cajeroNombre string, clienteCedula string, clienteTelefono string) error {`;

code = code.replace(targetHeader, newHeader);

// Update calls to printHeader
code = code.replace(
  `printHeader(&b, pc, conf, is58, lineWidth, leftMarginDots, "PRE-CUENTA", pedidoID, clienteNombre, meseroNombre, cajeroNombre)`,
  `printHeader(&b, pc, conf, is58, lineWidth, leftMarginDots, "PRE-CUENTA", pedidoID, clienteNombre, meseroNombre, cajeroNombre, "", "")`
);

reciboFunc = reciboFunc.replace(
  `printHeader(&b, pc, conf, is58, lineWidth, leftMarginDots, "RECIBO", pedidoID, clienteNombre, meseroNombre, cajeroNombre)`,
  `printHeader(&b, pc, conf, is58, lineWidth, leftMarginDots, "RECIBO", pedidoID, clienteNombre, meseroNombre, cajeroNombre, clienteCedula, clienteTelefono)`
);

code = code.substring(0, s2) + reciboFunc + code.substring(s2);

// Now update the actual printHeader function to print cedula and telefono if present
const cNameLoc = code.indexOf('// Nombre de cliente');
if (cNameLoc !== -1) {
    const replacement = `// Nombre de cliente
	if pc.ReciboNombre && clienteNombre != "" {
		b.Write([]byte{0x1b, 0x61, 0x00})
		b.WriteString("Cliente: " + substr(clienteNombre, 0, lineWidth-9) + "\n")
		if clienteCedula != "" {
			b.WriteString("CI/RIF: " + substr(clienteCedula, 0, lineWidth-8) + "\n")
		}
		if clienteTelefono != "" {
			b.WriteString("Tlf: " + substr(clienteTelefono, 0, lineWidth-5) + "\n")
		}
	}`;
    const endLoc = code.indexOf('if meseroNombre != "" {', cNameLoc);
    code = code.substring(0, cNameLoc) + replacement + '\n\t' + code.substring(endLoc);
}

fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/printer.go', code);
console.log("Patched printer.go with ImprimirReciboRaw and Header");
