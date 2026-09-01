const fs = require('fs');

let code = fs.readFileSync('src/actions/cierres-actions.ts', 'utf-8');

const newAction = `
export async function getCierreParaEditar(cierreId: string) {
  const supabase = await createClient();
  const { data: cierre, error } = await supabase
    .from('cierres_caja')
    .select('*')
    .eq('id', cierreId)
    .single();

  if (error || !cierre) return null;

  const { data: transacciones } = await supabase
    .from('cierres_transacciones')
    .select('*')
    .eq('cierre_id', cierreId);

  return { cierre, transacciones: transacciones || [] };
}
`;

code += newAction;

fs.writeFileSync('src/actions/cierres-actions.ts', code);
