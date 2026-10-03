const fs = require('fs');
let content = fs.readFileSync('src/components/compras/MobileCompraForm.tsx', 'utf8');

// 1. Add fechaEmision state
content = content.replace(
  "const [errorMsg, setErrorMsg] = useState('');",
  "const [errorMsg, setErrorMsg] = useState('');\n  const [fechaEmision, setFechaEmision] = useState(() => new Date().toISOString().split('T')[0]);"
);

// 2. Update useEffect to fetch rate based on fechaEmision
content = content.replace(
  "const res = await getTasaDelDia();",
  "const res = await getTasaDelDia(fechaEmision);"
);
// Wait, getTasaDelDia is called inside an init async func. Let's see how it's used: