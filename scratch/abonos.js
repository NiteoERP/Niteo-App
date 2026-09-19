
export async function getHistorialAbonosGlobales(proveedorId: string, sedeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  let query = supabase.from('compras_pagos')
    .select(`
      id,
      monto,
      metodo_pago,
      referencia,
      banco_origen,
      fecha_pago,
      factura_id,
      compras_facturas!inner (
        numero_factura,
        proveedor_id,
        sede_id
      )
    `)
    .eq('compras_facturas.proveedor_id', proveedorId)
    .order('fecha_pago', { ascending: false });

  if (sedeId && sedeId !== 'ALL') {
    query = query.eq('compras_facturas.sede_id', sedeId);
  }

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };

  // Group by (fecha_pago + metodo_pago + referencia)
  const grouped = new Map<string, any>();
  for (const pago of (data || [])) {
    const cf = pago.compras_facturas as any;
    // Creamos una clave unica para agrupar (idealmente los pagos del abono global tienen la misma fecha_pago exacta)
    const ref = pago.referencia || '';
    const dateStr = pago.fecha_pago || '';
    const key = `${dateStr}_${pago.metodo_pago}_${ref}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        fecha_pago: pago.fecha_pago,
        metodo_pago: pago.metodo_pago,
        referencia: pago.referencia,
        banco_origen: pago.banco_origen,
        monto_total: 0,
        cantidad_facturas: 0,
        facturas_afectadas: []
      });
    }

    const group = grouped.get(key);
    group.monto_total += Number(pago.monto);
    group.cantidad_facturas += 1;
    group.facturas_afectadas.push({
      factura_id: pago.factura_id,
      numero_factura: cf.numero_factura,
      monto_aplicado: pago.monto
    });
  }

  const result = Array.from(grouped.values());
  // Sort descending by fecha_pago again just in case
  result.sort((a, b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime());

  return { success: true, data: result };
}
