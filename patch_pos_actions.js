const fs = require('fs');
let code = fs.readFileSync('src/actions/pos-actions.ts', 'utf8');

const newFunction = `
export interface HistorialVentaPOS extends VentaPOS {
  cliente_nombre?: string;
  pagos: { tipo_pago: string; monto: number }[];
}

export async function getHistorialVentasCompleto(sedeId: string, fechaFiltro?: string): Promise<HistorialVentaPOS[]> {
  const supabase = await createClient();

  let query = supabase
    .from('ventas_facturas')
    .select(\`
      *,
      clientes ( nombre ),
      ventas_pagos ( tipo_pago, monto ),
      ventas_detalles (
        id, id_producto, cantidad, precio_unitario, total,
        productos ( nombre, codigo_barras )
      )
    \`)
    .eq('sede_id', sedeId)
    .order('fecha_venta', { ascending: false });

  if (fechaFiltro) {
    // fechaFiltro viene en formato YYYY-MM-DD
    const start = new Date(fechaFiltro + 'T00:00:00');
    const end = new Date(fechaFiltro + 'T23:59:59.999');
    query = query.gte('fecha_venta', start.toISOString()).lte('fecha_venta', end.toISOString());
  } else {
    query = query.limit(100);
  }

  const { data: ventas, error } = await query;

  if (error) {
    console.error('Error fetching historial ventas:', error);
    return [];
  }

  return (ventas || []).map((v: any) => ({
    id_factura: v.id,
    id_pos: v.id_pos,
    numero_documento: v.numero_documento,
    fecha_venta: v.fecha_venta,
    total: v.total,
    descuento: v.descuento,
    tipo_documento: v.tipo_documento,
    esta_pagado: v.estado_pago === 1 || v.estado_pago === 2,
    cliente_nombre: v.clientes?.nombre,
    pagos: (v.ventas_pagos || []).map((p: any) => ({
      tipo_pago: p.tipo_pago,
      monto: p.monto
    })),
    detalles: (v.ventas_detalles || []).map((d: any) => ({
      id_detalle: d.id,
      id_producto: d.id_producto,
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario,
      total: d.total,
      producto_nombre: d.productos?.nombre,
      producto_codigo: d.productos?.codigo_barras,
    }))
  }));
}
`;

code += newFunction;
fs.writeFileSync('src/actions/pos-actions.ts', code, 'utf8');
