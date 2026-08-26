const fs = require('fs');
let code = fs.readFileSync('src/actions/cierres-actions.ts', 'utf8');
const newFunc = \
// ============================================================================
// 3. OBTENER HISTORIAL DE CIERRES
// ============================================================================
export async function getHistorialCierres(sedeId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase.from('perfiles').select('empresa_id, sede_id, rol').eq('id', user.id).single();
  if (!profile) return [];

  let query = supabase
    .from('cierres_caja')
    .select('*, sedes(nombre_sede), usuarios(nombre)')
    .eq('empresa_id', profile.empresa_id)
    .order('fecha_cierre', { ascending: false });

  // Si no es MASTER, forzar su sede
  if (profile.rol !== 'MASTER') {
    query = query.eq('sede_id', profile.sede_id);
  } else if (sedeId && sedeId !== 'ALL') {
    query = query.eq('sede_id', sedeId);
  }

  const { data, error } = await query;
  if (error) {
    console.error(error);
    return [];
  }
  return data || [];
}
\;
code += newFunc;
fs.writeFileSync('src/actions/cierres-actions.ts', code);
