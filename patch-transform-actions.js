const fs = require('fs');
let code = fs.readFileSync('src/actions/transformaciones-actions.ts', 'utf-8');

code = code.replace("import { getAuthContext } from './auth-actions';", `async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');
  
  const idEmpresa = user.app_metadata?.empresa_id || user.user_metadata?.empresa_id;
  if (!idEmpresa) throw new Error('Sin empresa asignada');
  
  return { supabase, user, idEmpresa };
}`);

fs.writeFileSync('src/actions/transformaciones-actions.ts', code);
