const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/app.go', 'utf8');

// Fix Supabase Query Date Filtering
const oldSupaDate = `baseURL += fmt.Sprintf("&fecha_venta=gte.%sT00:00:00Z&fecha_venta=lte.%sT23:59:59Z", fechaInicio, fechaFin)`;
const newSupaDate = `
		// Obtenemos el offset local para que coincida con el día del cliente
		offset := time.Now().Format("-07:00")
		baseURL += fmt.Sprintf("&fecha_venta=gte.%sT00:00:00%s&fecha_venta=lte.%sT23:59:59%s", fechaInicio, offset, fechaFin, offset)
`;
code = code.replace(oldSupaDate, newSupaDate);

// Fix SQLite Query Date Filtering
const oldSqlDate = `query += fmt.Sprintf(" AND p.fecha_creacion >= '%s 00:00:00' AND p.fecha_creacion <= '%s 23:59:59'", fechaInicio, fechaFin)`;
const newSqlDate = `query += fmt.Sprintf(" AND date(p.fecha_creacion, 'localtime') >= '%s' AND date(p.fecha_creacion, 'localtime') <= '%s'", fechaInicio, fechaFin)`;
code = code.replace(oldSqlDate, newSqlDate);

fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/app.go', code);
console.log("Patched app.go dates");
