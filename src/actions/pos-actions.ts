'use server';

import { createClient } from '@/utils/supabase/server';

export interface VentaPOS {
  id_factura: number;
  id_pos: number;
  numero_documento: string;
  fecha_venta: string;
  total: number;
  descuento: number;
  tipo_documento: string;
  esta_pagado: boolean;
  detalles: VentaDetalle[];
}

export interface VentaDetalle {
  id_detalle: number;
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
  total: number;
  producto_nombre?: string;
  producto_codigo?: string;
}

export interface ProductoPOS {
  id_producto: number;
  codigo_barras: string;
  nombre: string;
  precio_venta: number;
  costo: number;
}

export async function getVentasRecientes(sedeId: string): Promise<VentaPOS[]> {
  const supabase = await createClient();

  // Obtenemos inicio del día actual (opcional, si se quiere todo el historial quitar el gte)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: ventas, error } = await supabase
    .from('ventas_facturas')
    .select(`
      *,
      ventas_detalles (
        id,
        id_producto,
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
    .gte('fecha_venta', today.toISOString())
    .order('fecha_venta', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching ventas recientes:', error);
    return [];
  }

  // Mapeamos los datos anidados
  return (ventas || []).map((v: any) => ({
    id_factura: v.id,
    id_pos: v.id_pos,
    numero_documento: v.numero_documento,
    fecha_venta: v.fecha_venta,
    total: v.total,
    descuento: v.descuento,
    tipo_documento: v.tipo_documento,
    esta_pagado: v.estado_pago === 1,
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
    id_producto: p.id,
    codigo_barras: p.codigo_barras,
    nombre: p.nombre,
    precio_venta: p.precio_venta,
    costo: p.costo,
  }));
}
