const fs = require('fs');

let c = fs.readFileSync('src/components/mesas/NuevaComanda.tsx', 'utf8');

c = c.replace(
    "const [catActiva, setCatActiva] = useState<string>('Todos');",
    "const [catActiva, setCatActiva] = useState<string>('Todos');\n  const [busqueda, setBusqueda] = useState('');"
);

c = c.replace(", Minus } from 'lucide-react';", " } from 'lucide-react';");

fs.writeFileSync('src/components/mesas/NuevaComanda.tsx', c);
