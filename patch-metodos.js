const fs = require('fs');

let code = fs.readFileSync('src/actions/cierres-actions.ts', 'utf-8');

const action = `
// ============================================================================
// OBTENER MÉTODOS CUSTOM HISTÓRICOS DE UNA SEDE
// ============================================================================
export async function getMetodosHistorialSede(sedeId: string) {
  const supabase = await createClient();
  
  // Como no podemos hacer un join fácil y un distinct en PostgREST puro de forma sencilla para esta consulta,
  // y como los cierres por sede tampoco son millones aún, traemos los cierres recientes de esa sede.
  const { data: cierres } = await supabase
    .from('cierres_caja')
    .select('id')
    .eq('sede_id', sedeId)
    .order('created_at', { ascending: false })
    .limit(30); // Miramos los últimos 30 cierres

  if (!cierres || cierres.length === 0) return [];

  const cierreIds = cierres.map(c => c.id);

  const { data: txs } = await supabase
    .from('cierres_transacciones')
    .select('metodo')
    .in('cierre_id', cierreIds);

  if (!txs) return [];

  const uniqueMetodos = [...new Set(txs.map(t => t.metodo))];
  
  // Filtramos los por defecto
  const defaultIds = ['Efectivo', 'Punto de Venta', 'Pago Móvil'];
  return uniqueMetodos.filter(m => !defaultIds.includes(m));
}
`;

code += '\n' + action;

fs.writeFileSync('src/actions/cierres-actions.ts', code);
