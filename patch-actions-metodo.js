const fs = require('fs');

let code = fs.readFileSync('src/actions/cierres-actions.ts', 'utf-8');

code = code.replace(
  /export async function getBancosUtilizados\(\) \{[\s\S]*?return unique;\r?\n\}/,
  `export async function getBancosUtilizados() {
  const supabase = await createClient();
  
  const { data } = await supabase
    .from('cierres_transacciones')
    .select('banco, metodo')
    .neq('banco', 'N/A');

  if (!data) return {};

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
