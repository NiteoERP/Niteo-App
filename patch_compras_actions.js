const fs = require('fs');
let code = fs.readFileSync('src/actions/compras-actions.ts', 'utf8');

if (!code.includes("import { cookies } from 'next/headers';")) {
  code = code.replace(
    "import { createClient } from '@/utils/supabase/server';",
    "import { createClient } from '@/utils/supabase/server';\nimport { cookies } from 'next/headers';"
  );
}

// First ensure 'rol' is queried
code = code.replace(
  /\.select\('empresa_id, sede_id'\)/g,
  ".select('empresa_id, sede_id, rol')"
);

// We replace the activeSedeId logic
const regex = /let activeSedeId = profile\.sede_id;\s*if \(!activeSedeId\) \{/g;
const replacement = 
  "const cookieStore = await cookies();\n" +
  "    const activeSedeCookie = cookieStore.get('active_sede')?.value;\n" +
  "    let activeSedeId = profile.sede_id;\n" +
  "    if (profile.rol === 'MASTER' && activeSedeCookie) {\n" +
  "      activeSedeId = activeSedeCookie;\n" +
  "    }\n" +
  "    if (!activeSedeId) {";

code = code.replace(regex, replacement);

fs.writeFileSync('src/actions/compras-actions.ts', code, 'utf8');
