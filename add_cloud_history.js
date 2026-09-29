const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/app.go', 'utf8');

const newFunctions = `
// ObtenerHistorialNube retorna las últimas ventas de toda la sede desde Supabase
func (a *App) ObtenerHistorialNube() ([]map[string]interface{}, error) {
	dbConf, err := a.GetConfig()
	if err != nil {
		return nil, err
	}
	if dbConf.MasterKey == "" || dbConf.SupabaseURL == "" || dbConf.SedeID == "" {
		return nil, fmt.Errorf("configuración incompleta")
	}

	endpoint := fmt.Sprintf("%s/rest/v1/ventas_facturas?select=id,fecha_venta,cliente_nombre,cajero_nombre,mesero_nombre,total,ventas_pagos(tipo_pago)&sede_id=eq.%s&order=fecha_venta.desc&limit=100", dbConf.SupabaseURL, dbConf.SedeID)
	req, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil { return nil, err }
	req.Header.Set("apikey", dbConf.SupabaseKey)
	req.Header.Set("Authorization", "Bearer "+dbConf.MasterKey)

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil { return nil, err }
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("error de nube: %d", resp.StatusCode)
	}

	var result []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	var lista []map[string]interface{}
	for _, row := range result {
		metodos := []string{}
		if rawPagos, ok := row["ventas_pagos"].([]interface{}); ok {
			for _, p := range rawPagos {
				if pagoMap, ok2 := p.(map[string]interface{}); ok2 {
					if tipo, ok3 := pagoMap["tipo_pago"].(string); ok3 {
						metodos = append(metodos, tipo)
					}
				}
			}
		}

		nombre := "Venta Rápida"
		if cn, ok := row["cliente_nombre"].(string); ok && cn != "" {
			nombre = cn
		}

		cajero := "Cajero"
		if cj, ok := row["cajero_nombre"].(string); ok && cj != "" {
			cajero = cj
		}

		mesero := ""
		if ms, ok := row["mesero_nombre"].(string); ok && ms != "" {
			mesero = ms
		}

		lista = append(lista, map[string]interface{}{
			"id":              row["id"],
			"fecha_creacion":  row["fecha_venta"],
			"nombre_eventual": nombre,
			"mesero_nombre":   mesero,
			"cajero_nombre":   cajero,
			"total":           row["total"],
			"tasa_bcv":        1.0, 
			"metodos_pago":    metodos,
		})
	}
	if lista == nil {
		lista = []map[string]interface{}{}
	}
	return lista, nil
}

// ObtenerDetallesNube retorna los detalles de un pedido consultando Supabase
func (a *App) ObtenerDetallesNube(facturaID string) ([]ItemCarrito, error) {
	dbConf, err := a.GetConfig()
	if err != nil {
		return nil, err
	}
	endpoint := fmt.Sprintf("%s/rest/v1/ventas_detalles?select=producto_id,cantidad,precio_unitario,productos(nombre)&factura_id=eq.%s", dbConf.SupabaseURL, facturaID)
	req, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil { return nil, err }
	req.Header.Set("apikey", dbConf.SupabaseKey)
	req.Header.Set("Authorization", "Bearer "+dbConf.MasterKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil { return nil, err }
	defer resp.Body.Close()

	var result []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	var items []ItemCarrito
	for _, row := range result {
		it := ItemCarrito{}
		if pid, ok := row["producto_id"].(string); ok { it.ProductoID = pid }
		if cant, ok := row["cantidad"].(float64); ok { it.Cantidad = cant }
		if pu, ok := row["precio_unitario"].(float64); ok { it.PrecioUnitario = pu }
		
		if pMap, ok := row["productos"].(map[string]interface{}); ok && pMap != nil {
			if nom, ok2 := pMap["nombre"].(string); ok2 {
				it.Nombre = nom
			}
		}
		if it.Nombre == "" {
			it.Nombre = "Producto S/N"
		}
		items = append(items, it)
	}
	if items == nil {
		items = []ItemCarrito{}
	}
	return items, nil
}
`;

// Insert the new functions before ObtenerHistorialVentas
const insertIdx = code.indexOf('// ObtenerHistorialVentas retorna las últimas ventas registradas localmente');
if (insertIdx !== -1) {
    code = code.substring(0, insertIdx) + newFunctions + "\n" + code.substring(insertIdx);
    fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/app.go', code);
    console.log('Added Cloud History functions to app.go');
} else {
    console.log('Could not find insert index');
}
