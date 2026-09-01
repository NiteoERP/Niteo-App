const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/caja/[id]/page.tsx', 'utf-8');

// We need to fetch the user's role
code = code.replace(
  /const \{ data: \{ user \} \} = await supabase\.auth\.getUser\(\);\n\s*if \(\!user\) redirect\('\/login'\);/,
  `const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  
  const { data: profile } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
  const isMaster = profile?.rol === 'MASTER';`
);

// We need to add a Delete button (which triggers a client component or server action).
// Wait, the details page is a Server Component, so we can't easily use onClick directly without a Client Component wrapper.
// So we can extract the Buttons into a Client Component `CierreBotonesControl.tsx`
code = code.replace(
  /<Link href=\{\`\/dashboard\/caja\/\$\{cierre\.id\}\/editar\`\} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl flex items-center gap-2">\n\s*<Edit size=\{16\} \/> Editar\n\s*<\/Link>/,
  `<CierreBotonesControl cierreId={cierre.id} isMaster={isMaster} />`
);

// Need to import the new client component
code = code.replace(
  /import \{ createClient \} from '@\/utils\/supabase\/server';/,
  `import { createClient } from '@/utils/supabase/server';\nimport { CierreBotonesControl } from './CierreBotonesControl';`
);

fs.writeFileSync('src/app/dashboard/caja/[id]/page.tsx', code);
