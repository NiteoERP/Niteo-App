const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'components', 'pos', 'TerminalVirtual.tsx');
let code = fs.readFileSync(file, 'utf8');

// 1. Update Props
if (!code.includes('listasPrecios?: any[];')) {
  code = code.replace(
    "empresaNombre?: string;",
    "empresaNombre?: string;\n  listasPrecios?: any[];"
  );
  code = code.replace(
    "licencia,",
    "licencia,\n    listasPrecios = [],"
  );
}

// 2. Add global price list state
if (!code.includes('const [globalListaPrecio')) {
  code = code.replace(
    "const [busqueda, setBusqueda] = useState('');",
    "const [busqueda, setBusqueda] = useState('');\n  const [globalListaPrecio, setGlobalListaPrecio] = useState('base');"
  );
}

// 3. Update ItemCarrito Interface
if (!code.includes('lista_precio_id?: string;')) {
  code = code.replace(
    "precio_modificable?: boolean;",
    "precio_modificable?: boolean;\n  lista_precio_id?: string;\n  producto_original?: any;"
  );
}

fs.writeFileSync(file, code);
