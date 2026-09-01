const fs = require('fs');

let code = fs.readFileSync('src/actions/cierres-actions.ts', 'utf-8');

if (!code.includes('@supabase/supabase-js')) {
  code = code.replace(
    /import \{ createClient \} from '@\/utils\/supabase\/server';/,
    `import { createClient } from '@/utils/supabase/server';\nimport { createClient as createAdminClient } from '@supabase/supabase-js';`
  );
}

// In guardarCierre, create admin client
code = code.replace(
  /export async function guardarCierre\(cierreData: any, transacciones: any\[\]\) \{\n  const supabase = await createClient\(\);/,
  `export async function guardarCierre(cierreData: any, transacciones: any[]) {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);`
);

// Use supabaseAdmin for the inserts
code = code.replace(
  /const \{ data: nuevoCierre, error: errorCierre \} = await supabase\n\s*\.from\('cierres_caja'\)/,
  `const { data: nuevoCierre, error: errorCierre } = await supabaseAdmin\n      .from('cierres_caja')`
);

code = code.replace(
  /const \{ error: errorTransacciones \} = await supabase\n\s*\.from\('cierres_transacciones'\)/,
  `const { error: errorTransacciones } = await supabaseAdmin\n        .from('cierres_transacciones')`
);

fs.writeFileSync('src/actions/cierres-actions.ts', code);
