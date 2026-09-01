const fs = require('fs');

let code = fs.readFileSync('src/actions/cierres-actions.ts', 'utf-8');

code = code.replace(
  /export async function getBancosUtilizados\(\) \{[\s\S]*?return bancos;\r?\n  \}/,
  `export async function getBancosUtilizados() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};
  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return {};
  
  const { data, error } = await supabase
    .from('cierres_transacciones')
    .select('banco, metodo')
    .not('banco', 'is', null)
    .neq('banco', 'N/A')
    .eq('empresa_id', profile.empresa_id)
    .limit(500);
    
  if (error || !data) return {};
  
  const map: Record<string, Set<string>> = {};
  for (const d of data) {
    if (!d.banco || !d.metodo) continue;
    const b = d.banco.trim();
    if (b === '' || b === 'N/A') continue;
    if (!map[d.metodo]) map[d.metodo] = new Set();
    map[d.metodo].add(b);
  }

  const result: Record<string, string[]> = {};
  for (const [m, set] of Object.entries(map)) {
    result[m] = Array.from(set).sort();
  }

  return result;
}`
);

fs.writeFileSync('src/actions/cierres-actions.ts', code);
