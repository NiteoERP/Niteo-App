const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/app.go', 'utf8');

// I will insert a helper function in app.go that calculates the diff and prints it
const helperFunc = `
func (a *App) procesarCancelacionesComanda(tx *sql.Tx, pedidoID string, nuevosItems []ItemCarrito, clienteNombre, meseroNombre string) {
	// Obtener items existentes que ya fueron impresos
	rows, err := tx.Query("SELECT dp.producto_id, dp.cantidad, p.nombre FROM Detalles_Pedido dp LEFT JOIN Productos p ON p.id = dp.producto_id WHERE dp.pedido_id = ? AND dp.impreso_cocina > 0", pedidoID)
	if err != nil {
		return
	}
	defer rows.Close()

	type ItemEx struct {
		ProductoID string
		Nombre     string
		Cantidad   float64
	}
	existentes := make(map[string]ItemEx)
	for rows.Next() {
		var it ItemEx
		var nombre sql.NullString
		rows.Scan(&it.ProductoID, &it.Cantidad, &nombre)
		it.Nombre = nombre.String
		
		if val, ok := existentes[it.ProductoID]; ok {
		    val.Cantidad += it.Cantidad
		    existentes[it.ProductoID] = val
		} else {
		    existentes[it.ProductoID] = it
		}
	}

	// Restar las cantidades de los nuevos items
	for _, ni := range nuevosItems {
		if val, ok := existentes[ni.ProductoID]; ok {
			val.Cantidad -= ni.Cantidad
			existentes[ni.ProductoID] = val
		}
	}

	// Las cantidades que queden > 0 son cancelaciones
	var cancelados []ItemCarrito
	for _, val := range existentes {
		if val.Cantidad > 0 {
			cancelados = append(cancelados, ItemCarrito{
				ProductoID: val.ProductoID,
				Nombre:     val.Nombre,
				Cantidad:   val.Cantidad,
				Comentario: "CANCELADO",
			})
		}
	}

	if len(cancelados) > 0 {
		go a.ImprimirComandaCancelacion(pedidoID, cancelados, clienteNombre, meseroNombre)
	}
}
`;

if (!code.includes('procesarCancelacionesComanda')) {
    code += helperFunc;
}

// Now insert calls to procesarCancelacionesComanda before the DELETE statements
code = code.replace(
  /tx\.Exec\("DELETE FROM Detalles_Pedido WHERE pedido_id = \?", pedidoID\)/g,
  `a.procesarCancelacionesComanda(tx, pedidoID, items, nombreEventual, meseroNombre)\n\ttx.Exec("DELETE FROM Detalles_Pedido WHERE pedido_id = ?", pedidoID)`
);

fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/app.go', code);
console.log("Patched app.go with procesarCancelacionesComanda");
