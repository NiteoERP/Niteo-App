const fs = require('fs');
let content = fs.readFileSync('src/actions/mesas-actions.ts', 'utf-8');

const newAction = `

export async function buscarClientePorCedula(cedula: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const empresaId = user.app_metadata?.empresa_id;
  if (!empresaId) return null;

  const { data } = await supabase
    .from('clientes')
    .select('nombre, telefono')
    .eq('empresa_id', empresaId)
    .eq('rif_cedula', cedula)
    .single();
    
  return data;
}
`;

content += newAction;
fs.writeFileSync('src/actions/mesas-actions.ts', content, 'utf-8');
console.log("Added action");
