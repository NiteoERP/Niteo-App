const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/ventas/page.tsx', 'utf8');

// 1. Add SedeSelector and cookies imports
if (!code.includes("import SedeSelector")) {
  code = code.replace(
    "import HistorialVentas from '@/components/pos/HistorialVentas';",
    "import HistorialVentas from '@/components/pos/HistorialVentas';\nimport SedeSelector from '@/components/inventario/SedeSelector';\nimport { cookies } from 'next/headers';"
  );
}

// 2. Change select query to include rol
code = code.replace(
  ".select('empresa_id, sede_id')",
  ".select('empresa_id, sede_id, rol')"
);

// 3. Add logic to fetch sedes and active_sede
const logicToInsert = `
  // Fetch sedes
  const { data: sedes } = await supabase
    .from('sedes')
    .select('id, nombre_sede')
    .eq('empresa_id', perfil.empresa_id)
    .order('nombre_sede');

  const cookieStore = await cookies();
  const activeSedeCookie = cookieStore.get('active_sede')?.value;
  
  let activeSedeId = perfil.sede_id;
  if (perfil.rol === 'MASTER' && activeSedeCookie) {
    activeSedeId = activeSedeCookie;
  }
  if (!activeSedeId && sedes && sedes.length > 0) {
    activeSedeId = sedes[0].id;
  }
`;

code = code.replace(
  "if (!perfil) {\n    return <div>Error: Perfil no encontrado</div>;\n  }",
  "if (!perfil) {\n    return <div>Error: Perfil no encontrado</div>;\n  }\n" + logicToInsert
);

// 4. Replace perfil.sede_id with activeSedeId everywhere below
code = code.replace(/perfil\.sede_id/g, "activeSedeId");

// 5. Add SedeSelector to UI
const uiToInsert = `
        </div>
        {perfil?.rol === "MASTER" && activeSedeId && (
          <div className="mt-4 md:mt-0">
            <SedeSelector sedes={sedes || []} activeSedeId={activeSedeId} />
          </div>
        )}
`;

code = code.replace(
  "          </p>\n        </div>",
  "          </p>\n" + uiToInsert
);

fs.writeFileSync('src/app/dashboard/ventas/page.tsx', code, 'utf8');
