const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/inventario/page.tsx', 'utf8');

// Add import
code = code.replace(
  "import { Package, Beaker, FileBox } from 'lucide-react';",
  "import { Package, Beaker, FileBox } from 'lucide-react';\nimport SedeSelector from '@/components/inventario/SedeSelector';"
);

// Update searchParams type
code = code.replace(
  "export default async function InventarioPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {",
  "export default async function InventarioPage({ searchParams }: { searchParams: Promise<{ tab?: string, sede?: string }> }) {"
);

// Fetch sedes & activeSede
const profileLogic = \
  const { data: profile } = await supabase.from('perfiles').select('sede_id, rol').eq('id', user?.id).single();
  const { data: sedesDb } = await supabase.from('sedes').select('id, nombre_sede').eq('empresa_id', empresaId);
  const sedes = sedesDb || [];
  
  let activeSedeId = profile?.sede_id;
  if (profile?.rol === 'MASTER' && params.sede) {
    activeSedeId = params.sede;
  } else if (!activeSedeId && sedes.length > 0) {
    activeSedeId = sedes[0].id;
  }

  const currentTab = params.tab || 'insumos';
\;

code = code.replace(
  "const currentTab = params.tab || 'insumos';",
  profileLogic.trim()
);

// Replace old query logic 1
code = code.replace(
  "const { data: profile } = await supabase.from('perfiles').select('sede_id').eq('id', user?.id).single();",
  ""
);
code = code.replace(
  "if (profile?.sede_id) {",
  "if (activeSedeId) {"
);
code = code.replace(
  "query = query.eq('sede_id', profile.sede_id);",
  "query = query.eq('sede_id', activeSedeId);"
);

// Replace old query logic 2
code = code.replace(
  "const { data: profile } = await supabase.from('perfiles').select('sede_id').eq('id', user?.id).single();",
  ""
);
code = code.replace(
  "if (profile?.sede_id) insumosQuery = insumosQuery.eq('sede_id', profile.sede_id);",
  "if (activeSedeId) insumosQuery = insumosQuery.eq('sede_id', activeSedeId);"
);

// Pass to components
code = code.replace(
  "<InsumosManager initialInsumos={insumos} empresaId={empresaId} />",
  "<InsumosManager initialInsumos={insumos} empresaId={empresaId} sedeId={activeSedeId} />"
);

// Insert UI
code = code.replace(
  "Controla tu materia prima y disea el escandallo de tus productos.</p>",
  "Controla tu materia prima y diseña el escandallo de tus productos.</p>\n        <div className=\"mt-4\">\n          <SedeSelector sedes={sedes} activeSedeId={activeSedeId} />\n        </div>"
);

fs.writeFileSync('src/app/dashboard/inventario/page.tsx', code, 'utf8');
