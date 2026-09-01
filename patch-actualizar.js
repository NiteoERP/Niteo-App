const fs = require('fs');

let code = fs.readFileSync('src/actions/cierres-actions.ts', 'utf-8');

const updateAction = `
// ============================================================================
// ACTUALIZAR CIERRE EXISTENTE
// ============================================================================
export async function actualizarCierre(cierreId: string, cierreData: any, transacciones: any[]) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // 1. Actualizar la Tabla Maestra (cierres_caja)
  const { error: errorCierre } = await supabase
    .from('cierres_caja')
    .update({
      real_efectivo_bs: cierreData.real_efectivo_bs,
      real_efectivo_usd: cierreData.real_efectivo_usd,
      real_bancos_bs: cierreData.real_bancos_bs,
      real_bancos_usd: cierreData.real_bancos_usd,
      diferencia_total: cierreData.diferencia_total
    })
    .eq('id', cierreId);

  if (errorCierre) {
    console.error('Error actualizando cierre:', errorCierre);
    return { error: 'Error al actualizar el resumen del cierre. Detalles: ' + errorCierre.message };
  }

  // 2. Eliminar transacciones anteriores
  const { error: errorDel } = await supabase
    .from('cierres_transacciones')
    .delete()
    .eq('cierre_id', cierreId);

  if (errorDel) {
    console.error('Error eliminando transacciones viejas:', errorDel);
    return { error: 'Error al limpiar transacciones antiguas.' };
  }

  // 3. Insertar nuevas transacciones
  if (transacciones.length > 0) {
    const transaccionesConId = transacciones.map(t => ({
      cierre_id: cierreId,
      metodo: t.metodo,
      banco: t.banco,
      referencia: t.referencia,
      monto: t.monto,
      moneda: t.moneda
    }));

    const { error: errorTransacciones } = await supabase
      .from('cierres_transacciones')
      .insert(transaccionesConId);

    if (errorTransacciones) {
      console.error('Error insertando transacciones:', errorTransacciones);
      return { error: 'El cierre se actualizó a medias (error en los bancos). Detalles: ' + errorTransacciones.message };
    }
  }

  revalidatePath('/dashboard/caja');
  revalidatePath(\`/dashboard/caja/\${cierreId}\`);
  return { success: true };
}
`;

code += '\n' + updateAction;

fs.writeFileSync('src/actions/cierres-actions.ts', code);
