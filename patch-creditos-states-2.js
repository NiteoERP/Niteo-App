const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/creditos/page.tsx', 'utf-8');

code = code.replace('const [metodoPago, setMetodoPago] = useState("Efectivo");', 'const [metodoPago, setMetodoPago] = useState("Efectivo");\n  const [fechaPago, setFechaPago] = useState("");\n  const [referencia, setReferencia] = useState("");');

fs.writeFileSync('src/app/dashboard/creditos/page.tsx', code);
