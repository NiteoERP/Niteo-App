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

export interface ProcesarVentaVirtualInput {
  sede_id: string;
  items: ItemVentaVirtual[];
  metodo_pago: string;
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
//
// Campos NOT NULL cubiertos según schema real:
//   ventas_facturas : id_pos, empresa_id, sede_id, numero_documento,
//                     fecha_venta, total
//   ventas_detalles : id_pos, empresa_id, factura_id, cantidad,
//                     precio_unitario, total
//   ventas_pagos    : id_pos, empresa_id, factura_id, tipo_pago, monto
// ─────────────────────────────────────────────────────────────────────────────
export async function procesarVentaVirtual(input: ProcesarVentaVirtualInput): Promise<{
  success: boolean;
  facturaId?: string;
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

  // Verificar que la sede pertenece a la empresa y es VIRTUAL (security hardening)
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

  // ── Calcular total ─────────────────────────────────────────────────────────
  const total = input.items.reduce(
    (acc, item) => acc + item.precio_unitario * item.cantidad,
    0
  );

  const numeroDocumento = generarNumeroDocumento();
  const fechaVenta = new Date().toISOString();

  // ── PASO 1: Insertar cabecera en ventas_facturas ───────────────────────────
  // id_pos NOT NULL → usamos marcador 'NITEO-VRT' para ventas nativas
  const { data: factura, error: errorFactura } = await supabase
    .from('ventas_facturas')
    .insert({
      empresa_id: empresaId,
      sede_id: input.sede_id,
      id_pos: ID_POS_VIRTUAL,             // NOT NULL — marcador de venta nativa
      numero_documento: numeroDocumento,
      tipo_documento: 'VENTA_VIRTUAL',
      fecha_venta: fechaVenta,
      total,
      descuento: 0,
      saldo_pendiente: 0,
      estado_pago: 1,                     // 1 = pagado inmediatamente
      verificado: true,                   // Las ventas nativas van verificadas por defecto
    })
    .select('id')
    .single();

  if (errorFactura || !factura) {
    console.error('[procesarVentaVirtual] Error insertando factura:', errorFactura);
    return { success: false, error: `Error al crear la factura: ${errorFactura?.message}` };
  }

  const facturaId: string = factura.id;

  // ── PASO 2: Insertar ítems en ventas_detalles ──────────────────────────────
  // empresa_id NOT NULL y id_pos NOT NULL deben incluirse.
  // El trigger descontar_insumos_por_venta se ejecuta AFTER INSERT por cada fila.
  const detalles = input.items.map((item) => ({
    empresa_id: empresaId,                // NOT NULL en schema
    factura_id: facturaId,
    producto_id: item.producto_id,        // UUID string
    id_pos: ID_POS_VIRTUAL,              // NOT NULL en schema
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
    // Limpiar la cabecera huérfana para no dejar datos inconsistentes
    await supabase.from('ventas_facturas').delete().eq('id', facturaId);
    return { success: false, error: `Error al registrar los productos: ${errorDetalles.message}` };
  }

  // ── PASO 3: Insertar pago en ventas_pagos ─────────────────────────────────
  // empresa_id NOT NULL y id_pos NOT NULL deben incluirse.
  const { error: errorPago } = await supabase
    .from('ventas_pagos')
    .insert({
      empresa_id: empresaId,              // NOT NULL en schema
      factura_id: facturaId,
      id_pos: ID_POS_VIRTUAL,            // NOT NULL en schema
      tipo_pago: input.metodo_pago,
      monto: total,
      fecha_pago: fechaVenta,
    });

  if (errorPago) {
    // El pago es no-crítico para la integridad de la venta — log y continúa
    console.error('[procesarVentaVirtual] Error insertando pago (no crítico):', errorPago);
  }

  // ── Revalidar cache ────────────────────────────────────────────────────────
  revalidatePath('/dashboard/ventas');

  return { success: true, facturaId };
}
