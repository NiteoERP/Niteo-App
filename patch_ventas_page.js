const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/ventas/page.tsx', 'utf8');

if (!code.includes("import HistorialVentas")) {
  code = code.replace(
    "import CatalogView from '@/components/pos/CatalogView';",
    "import CatalogView from '@/components/pos/CatalogView';\nimport HistorialVentas from '@/components/pos/HistorialVentas';"
  );
}

// Add the History icon to lucide imports if not there
if (!code.includes("History")) {
  code = code.replace(
    "import { Store, PackageSearch, Users } from 'lucide-react';",
    "import { Store, PackageSearch, Users, History } from 'lucide-react';"
  );
}

// Add the new tab button
const tabLinkRegex = /<a\s*href="\?tab=catalogo"[\s\S]*?<\/a>/;
const newTabLink = `
          <a
            href="?tab=historial"
            className={\`flex flex-1 items-center justify-center gap-2 h-14 px-4 rounded-md text-sm font-medium transition-all whitespace-nowrap shrink-0 \${
              tab === 'historial'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }\`}
          >
            <History size={16} />
            Historial de Ventas
          </a>`;

code = code.replace(tabLinkRegex, (match) => {
  return match + newTabLink;
});

// Add the component rendering
const renderRegex = /\{tab === 'catalogo' && \(\s*<CatalogView catalog=\{catalog\} \/>\s*\)\}/;
const newRender = `
      {tab === 'catalogo' && (
        <CatalogView catalog={catalog} />
      )}
      {tab === 'historial' && (
        <HistorialVentas sedeId={perfil.sede_id} />
      )}
`;

code = code.replace(renderRegex, newRender.trim());

fs.writeFileSync('src/app/dashboard/ventas/page.tsx', code, 'utf8');
