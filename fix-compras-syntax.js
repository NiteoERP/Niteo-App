const fs = require('fs');

let code = fs.readFileSync('src/actions/compras-actions.ts', 'utf-8');

// Fix the syntax error
code = code.replace("\\Compra de Insumos - Proveedor: \\\\,", "`Compra de Insumos - Proveedor: ${factura.proveedor}`,");

// Add our new functions
const functions = `
export async function getComprasMetodosPago() {
  const { createClient } = require('@/utils/supabase/server');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, data: [] };
  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, data: [] };

  const { data, error } = await supabase
    .from('compras_metodos_pago')
    .select('id, nombre')
    .eq('empresa_id', profile.empresa_id)
    .eq('estado_activo', true)
    .order('nombre');
    
  if (error) return { success: false, data: [] };
  return { success: true, data };
}

export async function addCompraMetodoPago(nombre: string) {
  const { createClient } = require('@/utils/supabase/server');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };
  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Sin perfil' };

  const { data, error } = await supabase
    .from('compras_metodos_pago')
    .insert({ empresa_id: profile.empresa_id, nombre })
    .select('id, nombre')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}
`;

code = code + functions;
fs.writeFileSync('src/actions/compras-actions.ts', code);
console.log("Fixed and appended compras-actions.ts");
