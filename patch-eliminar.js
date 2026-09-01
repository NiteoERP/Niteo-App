const fs = require('fs');

let code = fs.readFileSync('src/actions/cierres-actions.ts', 'utf-8');

const deleteAction = `
// ============================================================================
// ELIMINAR CIERRE (Solo MASTER)
// ============================================================================
export async function eliminarCierre(cierreId: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
  if (profile?.rol !== 'MASTER') {
    return { error: 'No tienes permisos para eliminar cierres.' };
  }

  // 1. Eliminar transacciones (On Delete Cascade suele estar, pero por si acaso lo hacemos manual)
  await supabase.from('cierres_transacciones').delete().eq('cierre_id', cierreId);

  // 2. Eliminar el Cierre
  const { error } = await supabase.from('cierres_caja').delete().eq('id', cierreId);

  if (error) {
    console.error('Error eliminando cierre:', error);
    return { error: 'Ocurrió un error al intentar eliminar el cierre. Detalles: ' + error.message };
  }

  revalidatePath('/dashboard/caja');
  return { success: true };
}
`;

code += '\n' + deleteAction;
fs.writeFileSync('src/actions/cierres-actions.ts', code);
