const fs = require('fs');
let content = fs.readFileSync('src/components/compras/MobileCompraForm.tsx', 'utf8');

content = content.replace(
  "  const [fechaEmision, setFechaEmision] = useState(() => new Date().toISOString().split('T')[0]);",
  ""
);

content = content.replace(
  "export default function MobileCompraForm() {\r\n  const [insumos, setInsumos] = useState<Insumo[]>([]);",
  "export default function MobileCompraForm() {\r\n  const [fechaEmision, setFechaEmision] = useState(() => new Date().toISOString().split('T')[0]);\r\n  const [insumos, setInsumos] = useState<Insumo[]>([]);"
);

content = content.replace(
  "export default function MobileCompraForm() {\n  const [insumos, setInsumos] = useState<Insumo[]>([]);",
  "export default function MobileCompraForm() {\n  const [fechaEmision, setFechaEmision] = useState(() => new Date().toISOString().split('T')[0]);\n  const [insumos, setInsumos] = useState<Insumo[]>([]);"
);

fs.writeFileSync('src/components/compras/MobileCompraForm.tsx', content, 'utf8');