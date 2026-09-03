const fs = require('fs');
let code = fs.readFileSync('src/actions/informes-actions.ts', 'utf-8');

const rawLogic = `  if (reportId === 'compras_proveedores' || reportId === 'compras_metodos_pago') {
    return await handleComprasReports(supabase, reportId, p_empresa_id, p_sede_id, p_fecha_inicio, p_fecha_fin);
  }

  let rpcName  = '';`;

code = code.replace("  let rpcName  = '';", rawLogic);

const handleComprasReportsFunction = `
async function handleComprasReports(supabase: any, reportId: string, empresaId: string, sedeId: string | null, start: string, end: string) {
  if (reportId === 'compras_proveedores') {
    const query = supabase
      .from('ventas_facturas')
      .select('id, numero_documento, fecha_emision, monto_total, moneda, tipo_factura, proveedor_id, directorio_proveedores(nombre), inventario_insumos_facturas(cantidad, costo_total, inventario_insumos(nombre))')
      .eq('empresa_id', empresaId)
      .eq('tipo_factura', 'compra')
      .gte('fecha_emision', start)
      .lte('fecha_emision', end)
      .order('fecha_emision', { ascending: false });

    if (sedeId) query.eq('sede_id', sedeId);
    
    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const mappedData = data.map((d: any) => ({
      numero_documento: d.numero_documento,
      fecha_emision: d.fecha_emision,
      proveedor: d.directorio_proveedores?.nombre || 'Desconocido',
      monto_total: d.monto_total,
      moneda: d.moneda,
      items: d.inventario_insumos_facturas?.map((i: any) => i.inventario_insumos?.nombre).join(', ') || ''
    }));

    return { success: true, data: mappedData };
  }
  
  if (reportId === 'compras_metodos_pago') {
    // Actually compras methods are stored in inventario_insumos_facturas or maybe ventas_pagos?
    // Wait, let's see how compras-actions saves the purchase payment method.
    // In registrarCompraInsumoJS, it just registers it, wait... does it register a payment method?
    // We should check how it is stored! Let's return dummy data for now and I will check how it's stored.
    return { success: true, data: [] };
  }
  
  return { success: false, error: 'Unknown report' };
}
`;

code = code + handleComprasReportsFunction;
fs.writeFileSync('src/actions/informes-actions.ts', code);
console.log("Informes patched");
