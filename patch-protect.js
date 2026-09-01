const fs = require('fs');
let code = fs.readFileSync('src/actions/cierres-actions.ts', 'utf-8');

code = code.replace(
  /export async function actualizarCierre[\s\S]*?if \(!user\) return \{ error: "No autenticado" \};/,
  `export async function actualizarCierre(cierreId: string, cierreData: any, transacciones: any[]) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
  if (profile?.rol !== 'MASTER') {
    return { error: 'No tienes permisos para modificar cierres.' };
  }`
);

fs.writeFileSync('src/actions/cierres-actions.ts', code);
