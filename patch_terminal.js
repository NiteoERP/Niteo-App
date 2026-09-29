const fs = require('fs');
const path = require('path');

const pageFile = path.join(__dirname, 'src', 'app', 'dashboard', 'terminal', 'page.tsx');
let pageCode = fs.readFileSync(pageFile, 'utf8');

if (!pageCode.includes('getListasPrecios')) {
  pageCode = pageCode.replace(
    "import { getSedeVirtualId } from '@/actions/sedes-actions';",
    "import { getSedeVirtualId } from '@/actions/sedes-actions';\nimport { getListasPrecios } from '@/actions/listas-precios-actions';"
  );
  
  pageCode = pageCode.replace(
    "const [catalogoVirtual, sedeVirtualId] = await Promise.all([",
    "const [catalogoVirtual, sedeVirtualId, listasPreciosRes] = await Promise.all([\n    getProductosCatalogoVirtual(perfil.empresa_id),\n    getSedeVirtualId(),\n    getListasPrecios(),\n  ]);\n  const listasPrecios = listasPreciosRes.success ? listasPreciosRes.data?.filter((l: any) => l.estado_activo) || [] : [];\n\n  // Skip original Promise.all\n  const temp = ["
  );
  pageCode = pageCode.replace(
    "getSedeVirtualId(),\n  ]);",
    "getSedeVirtualId(),\n  ]); // end temp"
  );

  pageCode = pageCode.replace(
    "<TerminalVirtual\n          catalogo={catalogoVirtual}",
    "<TerminalVirtual\n          catalogo={catalogoVirtual}\n          listasPrecios={listasPrecios}"
  );
  fs.writeFileSync(pageFile, pageCode);
}
