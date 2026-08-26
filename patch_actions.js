const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/compras/actions.ts', 'utf8');

if (!code.includes("import { cookies } from 'next/headers';")) {
  code = code.replace(
    "import { createClient } from '@/utils/supabase/server';",
    "import { createClient } from '@/utils/supabase/server';\nimport { cookies } from 'next/headers';"
  );
}

const originalAuthContext = /async function getAuthContext\(\) \{[\s\S]*?return \{/m;
const newAuthContext = \sync function getAuthContext() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('No autorizado');

  const { data: perfil, error: perfErr } = await supabase
    .from('perfiles')
    .select('empresa_id, sede_id, permisos, rol, nombre_completo')
    .eq('id', user.id)
    .single();

  if (perfErr || !perfil) throw new Error('Perfil no encontrado');

  const cookieStore = await cookies();
  const activeSedeCookie = cookieStore.get('active_sede')?.value;

  let idSede = perfil.sede_id;
  if (perfil.rol === 'MASTER' && activeSedeCookie) {
    idSede = activeSedeCookie;
  }

  const userRole = perfil.rol;
  const userName = perfil.nombre_completo || user.email?.split('@')[0] || 'Usuario';

  return {\;

code = code.replace(originalAuthContext, newAuthContext);

fs.writeFileSync('src/app/dashboard/compras/actions.ts', code, 'utf8');
