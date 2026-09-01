const fs = require('fs');
let code = fs.readFileSync('src/actions/cierres-actions.ts', 'utf-8');

// We need to add verifySupervisor. We must import cookies from next/headers.
// Check if cookies is imported:
if (!code.includes("import { cookies } from 'next/headers'")) {
  code = code.replace(
    /import \{ createClient \} from '@\/utils\/supabase\/server';/,
    `import { createClient } from '@/utils/supabase/server';\nimport { cookies } from 'next/headers';\nimport { createClient as createSupabaseClient } from '@supabase/supabase-js';`
  );
}

const verifyAction = `
// ============================================================================
// VERIFICAR SUPERVISOR (Para permitir a cajeros editar)
// ============================================================================
export async function verifySupervisor(password: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { error: "Perfil no encontrado" };

  // Buscar el email del MASTER de esta empresa
  const { data: masterProfile } = await supabase
    .from('perfiles')
    .select('id, rol')
    .eq('empresa_id', profile.empresa_id)
    .eq('rol', 'MASTER')
    .single();

  if (!masterProfile) return { error: "No se encontró un MASTER para esta empresa." };

  // Para obtener el email del MASTER necesitamos permisos de admin, 
  // pero podemos usar una llamada RPC o buscar en auth.users si tuviéramos acceso.
  // En Niteo, los usuarios normales no pueden leer auth.users.
  // ALTERNATIVA: Usar la clave de servicio para obtener el email del MASTER.
  const supabaseAdmin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: masterUser, error: adminErr } = await supabaseAdmin.auth.admin.getUserById(masterProfile.id);
  
  if (adminErr || !masterUser?.user?.email) {
    return { error: "No se pudo resolver el correo del MASTER." };
  }

  // Ahora intentamos hacer login temporal sin afectar la sesión actual
  const tempClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false }
  });

  const { error: loginError } = await tempClient.auth.signInWithPassword({
    email: masterUser.user.email,
    password: password
  });

  if (loginError) {
    return { error: "Contraseña incorrecta." };
  }

  // Si fue exitoso, creamos una cookie de permiso temporal por 15 minutos
  cookies().set('supervisor_override', 'true', { maxAge: 15 * 60, path: '/' });
  return { success: true };
}
`;

code += '\n' + verifyAction;

// Update actualizarCierre to check the cookie
code = code.replace(
  /if \(profile\?\.rol !== 'MASTER'\) \{\n\s*return \{ error: 'No tienes permisos para modificar cierres\.' \};\n\s*\}/,
  `const hasOverride = cookies().get('supervisor_override')?.value === 'true';
  if (profile?.rol !== 'MASTER' && !hasOverride) {
    return { error: 'No tienes permisos para modificar cierres.' };
  }
  // Si usó el override, lo consumimos (borramos la cookie) para que no quede abierta
  if (hasOverride && profile?.rol !== 'MASTER') {
    cookies().delete('supervisor_override');
  }`
);

fs.writeFileSync('src/actions/cierres-actions.ts', code);
