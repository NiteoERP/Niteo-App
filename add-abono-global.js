const fs = require('fs');
let code = fs.readFileSync('src/actions/creditos-actions.ts', 'utf-8');
code += `

export async function registrarAbonoGlobal(clienteId: string, sedeId: string, monto: number, metodoPago: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  let query = supabase.from('ventas_facturas')
    .select('id, saldo_pendiente, total, cliente_id, sede_id')
    .eq('cliente_id', clienteId)
    .gt('saldo_pendiente', 0)
    .order('fecha_venta', { ascending: true });
    
  if (sedeId && sedeId !== 'ALL') {
    query = query.eq('sede_id', sedeId);
  }

  const { data: facturas, error } = await query;
  
  if (error) return { success: false, error: error.message };
  if (!facturas || facturas.length === 0) return { success: false, error: 'No hay facturas pendientes' };

  let montoRestante = monto;
  let abonosRegistrados = 0;

  for (const fac of facturas) {
    if (montoRestante <= 0) break;
    
    const montoAbonar = Math.min(Number(fac.saldo_pendiente), montoRestante);
    const { error: rpcErr } = await supabase.rpc('registrar_abono_factura', {
      p_factura_id: fac.id,
      p_usuario_id: user.id,
      p_monto: montoAbonar,
      p_metodo_pago: metodoPago
    });
    
    if (rpcErr) {
      console.error(rpcErr);
      return { success: false, error: rpcErr.message };
    }
    
    montoRestante -= montoAbonar;
    abonosRegistrados++;
  }

  return { success: true, restante: montoRestante, facturasPagadas: abonosRegistrados };
}
`;
fs.writeFileSync('src/actions/creditos-actions.ts', code);
