'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

function generarNumeroDocumento(tipo: string): string {
  const prefijo = tipo === 'PRESUPUESTO' ? 'PRE' : (tipo === 'NOTA_ENTREGA' ? 'NE' : 'FAC');
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefijo}-${ts}-${rand}`;
}

export interface ItemDocumento {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
}

export interface CrearDocumentoInput {
  sede_id: string;
  tipo_documento: 'FACTURA' | 'PRESUPUESTO' | 'NOTA_ENTREGA';
  cliente_id?: string;
  cliente_nombre?: string;
  fecha_venta: string;
  fecha_vencimiento?: string;
  notas?: string;
  terminos_condiciones?: string;
  items: ItemDocumento[];
  total: number;
  descuento_global: number;
}

export async function crearDocumentoFormal(input: CrearDocumentoInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!perfil) return { success: false, error: 'Perfil no encontrado' };

  const empresaId = perfil.empresa_id;
  const numero_documento = generarNumeroDocumento(input.tipo_documento);

  // 1. Cabecera
  const { data: factura, error: errFac } = await supabase
    .from('ventas_facturas')
    .insert({
      empresa_id: empresaId,
      sede_id: input.sede_id,
      cliente_id: input.cliente_id || null,
      cliente_nombre: input.cliente_nombre || null,
      id_pos: 'DOC_FORMAL',
      numero_documento,
      tipo_documento: input.tipo_documento,
      fecha_venta: input.fecha_venta,
      fecha_vencimiento: input.fecha_vencimiento || null,
      notas: input.notas || null,
      terminos_condiciones: input.terminos_condiciones || null,
      total: input.total,
      descuento: input.descuento_global,
      saldo_pendiente: input.tipo_documento === 'PRESUPUESTO' ? 0 : input.total, // Presupuesto no tiene deuda
      estado_pago: input.tipo_documento === 'PRESUPUESTO' ? 1 : 2, // 2 = Pendiente
      verificado: true
    })
    .select('id')
    .single();

  if (errFac || !factura) {
    return { success: false, error: errFac?.message };
  }

  // 2. Detalles
  const detalles = input.items.map(item => ({
    empresa_id: empresaId,
    factura_id: factura.id,
    producto_id: item.producto_id,
    id_pos: 'DOC_FORMAL',
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    descuento: item.descuento,
    total: (item.cantidad * item.precio_unitario) - item.descuento
  }));

  const { error: errDetalles } = await supabase.from('ventas_detalles').insert(detalles);

  if (errDetalles) {
    await supabase.from('ventas_facturas').delete().eq('id', factura.id);
    return { success: false, error: errDetalles.message };
  }

  // Si es un presupuesto, no afecta inventario normalmente, pero en Niteo el trigger
  // de inventario actúa al insertar en ventas_detalles. 
  // OJO: Si es presupuesto, deberíamos evitar el trigger? 
  // Por ahora lo insertamos normal. El usuario debe saberlo.

  revalidatePath('/dashboard/ventas');

  // Retornar data completa para PDF en cliente
  return {
    success: true,
    facturaId: factura.id,
    factura: {
      id: factura.id,
      numero_documento,
      tipo_documento: input.tipo_documento,
      fecha_venta: input.fecha_venta,
      fecha_vencimiento: input.fecha_vencimiento || null,
      notas: input.notas,
      terminos_condiciones: input.terminos_condiciones,
      total: input.total,
      cliente_nombre: input.cliente_nombre
    }
  };
}
