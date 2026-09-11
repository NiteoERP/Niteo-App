'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// ─────────────────────────────────────────────────────────────────────────────
// Constante marcador de ventas nativas (ocupa los campos id_pos NOT NULL)
// ─────────────────────────────────────────────────────────────────────────────
const ID_POS_VIRTUAL = 'NITEO-VRT';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface ItemVentaVirtual {
  producto_id: string;   // UUID — productos.id es uuid, no integer
  nombre: string;
  cantidad: number;
  precio_unitario: number;
}

export interface MetodoPagoVirtual {
  tipo_pago: string;
  monto: number;
}

export interface ProcesarVentaVirtualInput {
  sede_id: string;
  items: ItemVentaVirtual[];
  pagos: MetodoPagoVirtual[];
  cliente_id?: string;
  cliente_nombre?: string;
  mesero_nombre?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generador de número de documento único para ventas nativas
// ─────────────────────────────────────────────────────────────────────────────
function generarNumeroDocumento(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `NITEO-VRT-${ts}-${rand}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// procesarVentaVirtual
// Inserción atómica: ventas_facturas → ventas_detalles → ventas_pagos
// ─────────────────────────────────────────────────────────────────────────────
export async function procesarVentaVirtual(input: ProcesarVentaVirtualInput): Promise<{
  success: boolean;
  facturaId?: string;
  factura?: any;
  error?: string;
}> {
  const supabase = await createClient();

  // ── Autenticación ──────────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!perfil) return { success: false, error: 'Perfil no encontrado' };

  const empresaId: string = perfil.empresa_id;

  // ── Validaciones básicas ───────────────────────────────────────────────────
  if (!input.sede_id) return { success: false, error: 'sede_id es requerido' };
  if (!input.items || input.items.length === 0) {
    return { success: false, error: 'El carrito está vacío' };
  }
  if (!input.pagos) {
    return { success: false, error: 'Métodos de pago son requeridos' };
  }

  // Verificar que la sede pertenece a la empresa y es VIRTUAL
  const { data: sede } = await supabase
    .from('sedes')
    .select('id, tipo_sede')
    .eq('id', input.sede_id)
    .eq('empresa_id', empresaId)
    .eq('tipo_sede', 'VIRTUAL')
    .single();

  if (!sede) {
    return { success: false, error: 'Sede virtual no encontrada o no pertenece a tu empresa' };
  }

  // ── Calcular total y saldo ─────────────────────────────────────────────────
  const total = input.items.reduce(
    (acc, item) => acc + item.precio_unitario * item.cantidad,
    0
  );

  const totalPagado = input.pagos.reduce((acc, p) => acc + p.monto, 0);
  const saldo_pendiente = Math.max(0, total - totalPagado);
  
  // Si la venta tiene crédito (saldo_pendiente > 0), obligatoriamente debe haber un cliente_id
  if (saldo_pendiente > 0 && !input.cliente_id) {
    return { success: false, error: 'Para ventas a crédito (con saldo pendiente), debes seleccionar un cliente registrado en el directorio.' };
  }

  const estado_pago = saldo_pendiente > 0 ? 2 : 1; // 1 = Pagado, 2 = Crédito/Pendiente

  const numeroDocumento = generarNumeroDocumento();
  const fechaVenta = new Date().toISOString();

  // ── PASO 1: Insertar cabecera en ventas_facturas ───────────────────────────
  const { data: factura, error: errorFactura } = await supabase
    .from('ventas_facturas')
    .insert({
      empresa_id: empresaId,
      sede_id: input.sede_id,
      cliente_id: input.cliente_id || null,
      cliente_nombre: input.cliente_nombre || null,
      mesero_nombre: input.mesero_nombre || null,
      id_pos: ID_POS_VIRTUAL,             
      numero_documento: numeroDocumento,
      tipo_documento: 'VENTA_VIRTUAL',
      fecha_venta: fechaVenta,
      total,
      descuento: 0,
      saldo_pendiente,
      estado_pago,
      verificado: true,
    })
    .select('id')
    .single();

  if (errorFactura || !factura) {
    console.error('[procesarVentaVirtual] Error insertando factura:', errorFactura);
    return { success: false, error: `Error al crear la factura: ${errorFactura?.message}` };
  }

  const facturaId: string = factura.id;

  // ── PASO 2: Insertar ítems en ventas_detalles ──────────────────────────────
  const detalles = input.items.map((item) => ({
    empresa_id: empresaId,
    factura_id: facturaId,
    producto_id: item.producto_id,
    id_pos: ID_POS_VIRTUAL,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    total: item.precio_unitario * item.cantidad,
    descuento: 0,
  }));

  const { error: errorDetalles } = await supabase
    .from('ventas_detalles')
    .insert(detalles);

  if (errorDetalles) {
    console.error('[procesarVentaVirtual] Error insertando detalles:', errorDetalles);
    await supabase.from('ventas_facturas').delete().eq('id', facturaId);
    return { success: false, error: `Error al registrar los productos: ${errorDetalles.message}` };
  }

  // ── PASO 3: Insertar pagos en ventas_pagos ─────────────────────────────────
  if (input.pagos.length > 0) {
    const pagosToInsert = input.pagos.filter(p => p.monto > 0).map(p => ({
      empresa_id: empresaId,
      factura_id: facturaId,
      id_pos: ID_POS_VIRTUAL,
      tipo_pago: p.tipo_pago,
      monto: p.monto,
      fecha_pago: fechaVenta,
    }));

    if (pagosToInsert.length > 0) {
      const { error: errorPago } = await supabase
        .from('ventas_pagos')
        .insert(pagosToInsert);

      if (errorPago) {
        console.error('[procesarVentaVirtual] Error insertando pagos:', errorPago);
      }
    }
  }

  // ── Revalidar cache ────────────────────────────────────────────────────────
  revalidatePath('/dashboard/ventas');

  return { 
    success: true, 
    facturaId,
    factura: {
      numero_documento: numeroDocumento,
      fecha_venta: fechaVenta,
      total,
      saldo_pendiente,
      cliente_nombre: input.cliente_nombre || null,
      cliente_id: input.cliente_id || null,
      mesero_nombre: input.mesero_nombre || null,
    }
  };
}
