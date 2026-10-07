const fs = require('fs');
const filePath = 'src/actions/cierres-actions.ts';
let content = fs.readFileSync(filePath, 'utf8');

const replacement1 = `export async function getCierreParaEditar(cierreId: string) {
  const supabase = await createClient();
  const { data: cierre, error } = await supabase
    .from('cierres_caja')
    .select('*')
    .eq('id', cierreId)
    .single();

  if (error || !cierre) return null;

  try {
    const { data: empData } = await supabase
      .from('empresas')
      .select('zona_horaria')
      .eq('id', cierre.empresa_id)
      .maybeSingle();

    const timeZone = empData?.zona_horaria || DEFAULT_TIMEZONE;
    const tzOffset = getTimezoneOffsetString(timeZone);

    const { data: ventasData } = await supabase
      .from('ventas_facturas')
      .select('total, tipo_documento, numero_orden, ventas_pagos (tipo_pago, monto)')
      .eq('estado_activo', true)
      .eq('sede_id', cierre.sede_id)
      .gte('fecha_venta', \`\${cierre.fecha_cierre}T00:00:00\${tzOffset}\`)
      .lte('fecha_venta', \`\${cierre.fecha_cierre}T23:59:59.999\${tzOffset}\`);

    const esperadoPorMetodo: Record<string, number> = {};
    const ventasTotales = ventasData ? ventasData.reduce((acc, curr) => {
      const isCortesia = curr.ventas_pagos?.some((p) => {
        const tp = (p.tipo_pago || '').toLowerCase();
        return tp.includes('cortes') || tp.includes('regal');
      }) ||
      (curr.tipo_documento && curr.tipo_documento.toLowerCase().includes('cortes')) ||
      (curr.numero_orden && curr.numero_orden.toLowerCase().includes('cortes'));

      if (isCortesia) return acc;
      
      const isRefund = curr.tipo_documento && (curr.tipo_documento.toLowerCase().includes('refund') || curr.tipo_documento.toLowerCase().includes('devolucion'));
      let montoDoc = Number(curr.total || 0);
      if (isRefund && montoDoc > 0) montoDoc = -montoDoc;

      if (curr.ventas_pagos && Array.isArray(curr.ventas_pagos)) {
        curr.ventas_pagos.forEach((p) => {
          const tp = p.tipo_pago || 'Desconocido';
          if (tp.toLowerCase().includes('credit') || tp.toLowerCase().includes('crédit')) return;
          let montoPago = Number(p.monto || 0);
          if (isRefund && montoPago > 0) montoPago = -montoPago;
          esperadoPorMetodo[tp] = (esperadoPorMetodo[tp] || 0) + montoPago;
        });
      }

      return acc + montoDoc;
    }, 0) : 0;

    const { data: gastosData } = await supabase
      .from('gastos_sede')
      .select('monto')
      .eq('estado_activo', true)
      .eq('sede_id', cierre.sede_id)
      .gte('fecha_gasto', \`\${cierre.fecha_cierre}T00:00:00\${tzOffset}\`)
      .lte('fecha_gasto', \`\${cierre.fecha_cierre}T23:59:59.999\${tzOffset}\`);
    
    const gastosTotales = gastosData ? gastosData.reduce((acc, curr) => acc + Number(curr.monto), 0) : 0;
    const totalEsperado = ventasTotales - gastosTotales;

    cierre.sistema_total_esperado = totalEsperado;
    cierre.sistema_ventas_brutas = ventasTotales;
    cierre.sistema_gastos_operativos = gastosTotales;
    cierre.esperadoPorMetodo = esperadoPorMetodo;
  } catch (e) {
    console.error('Error recalculando cierre previo para edicion:', e);
  }

  const { data: transacciones } = await supabase
    .from('cierres_transacciones')
    .select('*')
    .eq('cierre_id', cierreId);

  return { cierre, transacciones: transacciones || [] };
}`;
content = content.replace(/export async function getCierreParaEditar[\s\S]*?return \{ cierre, transacciones: transacciones \|\| \[\] \};\s*\}/, replacement1);

fs.writeFileSync(filePath, content);
console.log('Done');