const fs = require('fs');

let code = fs.readFileSync('src/actions/cierres-actions.ts', 'utf-8');

// I will find the precise block of getBancosUtilizados and replace it.
const startStr = "export async function getBancosUtilizados() {";
const endStr = "return bancos;\n}";
const endStr2 = "return bancos;\r\n}";

let startIdx = code.indexOf(startStr);
let endIdx = code.indexOf(endStr, startIdx);
let matchLen = endStr.length;

if (endIdx === -1) {
  endIdx = code.indexOf(endStr2, startIdx);
  matchLen = endStr2.length;
}

if (startIdx !== -1 && endIdx !== -1) {
  const newFunc = `export async function getBancosUtilizados(): Promise<Record<string, string[]>> {
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
}`;

  code = code.slice(0, startIdx) + newFunc + code.slice(endIdx + matchLen);
}

fs.writeFileSync('src/actions/cierres-actions.ts', code);
