const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/app.go', 'utf8');

// 1. Modificar ObtenerHistorialNube
const nubeOld = `func (a *App) ObtenerHistorialNube() ([]map[string]interface{}, error) {`;
const nubeNew = `func (a *App) ObtenerHistorialNube(fechaInicio string, fechaFin string) ([]map[string]interface{}, error) {`;
code = code.replace(nubeOld, nubeNew);

const endpointOld = `endpoint := fmt.Sprintf("%s/rest/v1/ventas_facturas?select=id,fecha_venta,cliente_nombre,cajero_nombre,mesero_nombre,total,ventas_pagos(tipo_pago)&sede_id=eq.%s&order=fecha_venta.desc&limit=100", dbConf.SupabaseURL, dbConf.SedeID)`;
const endpointNew = `
	baseURL := fmt.Sprintf("%s/rest/v1/ventas_facturas?select=id,fecha_venta,cliente_nombre,cajero_nombre,mesero_nombre,total,ventas_pagos(tipo_pago)&sede_id=eq.%s", dbConf.SupabaseURL, dbConf.SedeID)
	
	if fechaInicio != "" && fechaFin != "" {
		baseURL += fmt.Sprintf("&fecha_venta=gte.%sT00:00:00Z&fecha_venta=lte.%sT23:59:59Z", fechaInicio, fechaFin)
	}
	baseURL += "&order=fecha_venta.desc&limit=1000"
	endpoint := baseURL
`;
code = code.replace(endpointOld, endpointNew);


// 2. Modificar ObtenerHistorialVentas (Local)
const localOld = `func (a *App) ObtenerHistorialVentas() ([]map[string]interface{}, error) {
	rows, err := a.db.Query(\`
		SELECT p.id, p.fecha_creacion, IFNULL(p.nombre_eventual, ''), IFNULL(p.mesero_nombre, ''), 
		       p.total, IFNULL(p.tasa_bcv, 1.0)
		FROM Pedidos p
		WHERE p.estado != 'abierto'
		ORDER BY p.fecha_creacion DESC LIMIT 100
	\`)`;

const localNew = `func (a *App) ObtenerHistorialVentas(fechaInicio string, fechaFin string) ([]map[string]interface{}, error) {
	query := \`
		SELECT p.id, p.fecha_creacion, IFNULL(p.nombre_eventual, ''), IFNULL(p.mesero_nombre, ''), 
		       p.total, IFNULL(p.tasa_bcv, 1.0)
		FROM Pedidos p
		WHERE p.estado != 'abierto'
	\`
	
	if fechaInicio != "" && fechaFin != "" {
		query += fmt.Sprintf(" AND p.fecha_creacion >= '%s 00:00:00' AND p.fecha_creacion <= '%s 23:59:59'", fechaInicio, fechaFin)
	}
	
	query += " ORDER BY p.fecha_creacion DESC LIMIT 1000"

	rows, err := a.db.Query(query)`;
code = code.replace(localOld, localNew);

fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/app.go', code);
console.log("Patched app.go");
