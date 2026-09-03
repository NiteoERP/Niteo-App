'use server';

import { createClient } from '@/utils/supabase/server';
import { registrarAsiento } from './contabilidad-actions';

export interface VentaPOS {
  verificado?: boolean;
  id_factura: string;
  id_pos: number;
  numero_documento: string;
  numero_orden?: string;
  fecha_venta: string;
  total: number;
  descuento: number;
  tipo_documento: string;
  esta_pagado: boolean;
  cliente_nombre?: string;
  pagos?: { tipo_pago: string, monto: number }[];
  metodo_pago?: string;       // resumen del primer método de pago registrado
  detalles: VentaDetalle[];
}

export interface VentaDetalle {
  id_detalle: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  total: number;
  producto_nombre?: string;
  producto_codigo?: string;
}

export interface ProductoPOS {
  producto_id: number;
  codigo_barras: string;
  nombre: string;
  precio_venta: number;
  costo: number;
}

export async function getVentasRecientes(sedeId: string): Promise<VentaPOS[]> {
  const supabase = await createClient();

  const { data: ventas, error } = await supabase
    .from('ventas_facturas')
    .select(`
      *,
      clientes ( nombre ),
      ventas_pagos ( tipo_pago, monto ),
      ventas_detalles (
        id,
        producto_id,
        cantidad,
        precio_unitario,
        total,
        productos (
          nombre,
          codigo_barras
        )
      )
    `)
    .eq('sede_id', sedeId)
    .neq('numero_documento', 'TEST')
    .order('fecha_venta', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching ventas recientes:', error);
    return [];
  }

  // Mapeamos los datos anidados
  return (ventas || []).map((v: any) => ({
    verificado: v.verificado,
    id_factura: v.id,
    id_pos: v.id_pos,
    numero_documento: v.numero_documento,
    numero_orden: v.numero_orden,
    fecha_venta: v.fecha_venta,
    total: v.total,
    descuento: v.descuento,
    tipo_documento: v.tipo_documento,
    esta_pagado: v.estado_pago === 1,
    cliente_nombre: v.clientes?.nombre,
    pagos: (v.ventas_pagos || []).map((p: any) => ({ tipo_pago: p.tipo_pago, monto: p.monto })),
    metodo_pago: (v.ventas_pagos || [])[0]?.tipo_pago,
    detalles: (v.ventas_detalles || []).map((d: any) => ({

      id_detalle: d.id,
      producto_id: d.producto_id,
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario,
      total: d.total,
      producto_nombre: d.productos?.nombre,
      producto_codigo: d.productos?.codigo_barras,
    }))
  }));
}

export async function getProductosCatalogo(empresaId: string): Promise<ProductoPOS[]> {
  const supabase = await createClient();

  const { data: productos, error } = await supabase
    .from('productos')
    .select('id, codigo_barras, nombre, precio_venta, costo')
    .eq('empresa_id', empresaId)
    .eq('estado_activo', true)
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error fetching productos:', error);
    return [];
  }

  return (productos || []).map((p: any) => ({
    producto_id: p.id,
    codigo_barras: p.codigo_barras,
    nombre: p.nombre,
    precio_venta: p.precio_venta,
    costo: p.costo,
  }));
}

export interface HistorialVentaPOS extends VentaPOS {
  cliente_nombre?: string;
  pagos: { tipo_pago: string; monto: number }[];
}

export async function getHistorialVentasCompleto(sedeId: string, fechaFiltro?: string): Promise<HistorialVentaPOS[]> {
  const supabase = await createClient();

  let query = supabase
    .from('ventas_facturas')
    .select(`
      *,
      clientes ( nombre ),
      ventas_pagos ( tipo_pago, monto ),
      ventas_detalles (
        id, producto_id, cantidad, precio_unitario, total,
        productos ( nombre, codigo_barras )
      )
    `)
    .eq('sede_id', sedeId)
    .neq('numero_documento', 'TEST')
    .order('fecha_venta', { ascending: false });

  if (fechaFiltro) {
    // Filtra exactamente por ese da, usando UTC ya que los datos de Aronium vienen con +00:00
    query = query
      .gte('fecha_venta', `${fechaFiltro}T00:00:00+00:00`)
      .lte('fecha_venta', `${fechaFiltro}T23:59:59.999+00:00`);
  }
  query = query.limit(100);

  const { data: ventas, error } = await query;

  if (error) {
    console.error('Error fetching historial ventas:', error);
    return [];
  }

  return (ventas || []).map((v: any) => ({
    verificado: v.verificado,
    id_factura: v.id,
    id_pos: v.id_pos,
    numero_documento: v.numero_documento,
      numero_orden: v.numero_orden,
    fecha_venta: v.fecha_venta,
    total: v.total,
    descuento: v.descuento,
    tipo_documento: v.tipo_documento,
    esta_pagado: v.estado_pago === 1,
    cliente_nombre: v.clientes?.nombre,
    pagos: (v.ventas_pagos || []).map((p: any) => ({
      tipo_pago: p.tipo_pago,
      monto: p.monto
    })),
    detalles: (v.ventas_detalles || []).map((d: any) => ({
      id_detalle: d.id,
      producto_id: d.producto_id,
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario,
      total: d.total,
      producto_nombre: d.productos?.nombre,
      producto_codigo: d.productos?.codigo_barras,
    }))
  }));
}


export async function toggleVentaVerificada(facturaId: string, verificado: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('ventas_facturas')
    .update({ verificado })
    .eq('id', facturaId);
  
  if (error) {
    console.error('Error toggling verificado:', error);
    return { success: false, error };
  }
  return { success: true };
}


export async function generarAsientoVentaPOS(facturaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Perfil no encontrado' };

  const { data: factura, error: errFac } = await supabase
    .from('ventas_facturas')
    .select('*, ventas_pagos(monto, tipo_pago), ventas_detalles(cantidad, precio_unitario, productos(costo))')
    .eq('id', facturaId)
    .single();

  if (errFac || !factura) return { success: false, error: 'Factura no encontrada' };

  const totalVenta = factura.total || 0;
  
  let costoVentas = 0;
  factura.ventas_detalles?.forEach((d: any) => {
    const costoUnit = d.productos?.costo || 0;
    costoVentas += (costoUnit * d.cantidad);
  });

  const metodoPago = factura.ventas_pagos?.[0]?.tipo_pago || 'Efectivo';
  const isTransferencia = metodoPago.toLowerCase().includes('transferencia') || metodoPago.toLowerCase().includes('zelle') || metodoPago.toLowerCase().includes('pago movil') || metodoPago.toLowerCase().includes('punto');
  const cuentaPago = isTransferencia ? '1.1.02' : '1.1.01';

  try {
    const { success, error, asientoId } = await registrarAsiento(
      profile.empresa_id,
      factura.fecha_venta || new Date().toISOString(),
      `Venta POS - Doc: ${factura.numero_documento}`,
      'venta_pos',
      factura.id,
      user.id,
      [
        { codigo_cuenta: cuentaPago, debe: totalVenta, haber: 0 }, 
        { codigo_cuenta: '4.1.01', debe: 0, haber: totalVenta },   
        { codigo_cuenta: '5.1.01', debe: costoVentas, haber: 0 },  
        { codigo_cuenta: '1.1.04', debe: 0, haber: costoVentas }   
      ]
    );
    if (!success) return { success: false, error };
    return { success: true, asientoId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
