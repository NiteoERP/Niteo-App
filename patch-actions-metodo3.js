const fs = require('fs');

let code = fs.readFileSync('src/actions/cierres-actions.ts', 'utf-8');

const oldBlock = `export async function getBancosUtilizados(): Promise<Record<string, string[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return [];
  
  // Try to get distinct bancos used by this empresa
  // Since Supabase RPC or distinct might not be trivial without a custom function, we just fetch a subset of unique ones via a simple query
  const { data, error } = await supabase
    .from('cierres_transacciones')
    .select('banco')
    .not('banco', 'is', null)
    .eq('empresa_id', profile.empresa_id)
    .limit(100);
    
  if (error || !data) return ['Banesco', 'Mercantil', 'Provincial', 'Venezuela', 'BNC'];
  
  const bancos = Array.from(new Set(data.map(d => d.banco))).filter(Boolean);
  if (bancos.length === 0) return ['Banesco', 'Mercantil', 'Provincial', 'Venezuela', 'BNC'];
  return bancos;
}`;

const newBlock = `export async function getBancosUtilizados(): Promise<Record<string, string[]>> {
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

// I will do line-based replacement to be safe since windows CRLF might mess up the raw string replacement.
const startIdx = code.indexOf('export async function getBancosUtilizados()');
const endIdx = code.indexOf('return bancos;\n  }', startIdx) !== -1 
  ? code.indexOf('return bancos;\n  }', startIdx) + 'return bancos;\n  }'.length
  : code.indexOf('return bancos;\r\n  }', startIdx) + 'return bancos;\r\n  }'.length;

if (startIdx !== -1 && endIdx !== -1) {
  code = code.slice(0, startIdx) + newBlock + code.slice(endIdx);
} else {
  console.log("Could not find block");
}

fs.writeFileSync('src/actions/cierres-actions.ts', code);
