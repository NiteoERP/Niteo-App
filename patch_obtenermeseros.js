const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/app.go', 'utf8');

const s1 = code.indexOf('func (a *App) ObtenerMeseros() ([]string, error) {');
const nextFunc = code.indexOf('func (a *App)', s1 + 10);
const s2 = nextFunc !== -1 ? nextFunc : code.length;

const replacement = `func (a *App) ObtenerMeseros() ([]string, error) {
	rows, err := a.db.Query(\`
		SELECT DISTINCT nombre FROM Usuarios WHERE rol IN ('mesero', 'vendedor') AND nombre IS NOT NULL AND nombre != ''
		UNION
		SELECT DISTINCT mesero_nombre FROM Pedidos WHERE mesero_nombre IS NOT NULL AND mesero_nombre != ''
	\`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var meseros []string
	for rows.Next() {
		var m string
		if err := rows.Scan(&m); err == nil && m != "" {
			meseros = append(meseros, m)
		}
	}
	if meseros == nil {
		meseros = []string{}
	}
	return meseros, nil
}

`;

code = code.substring(0, s1) + replacement + code.substring(s2);

fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/app.go', code);
console.log("Patched ObtenerMeseros to include Usuarios");
