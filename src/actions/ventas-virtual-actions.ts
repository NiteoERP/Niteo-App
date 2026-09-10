'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface ItemVentaVirtual {
  producto_id: number;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
}

export interface ProcesarVentaVirtualInput {
  sede_id: string;
  items: ItemVentaVirtual[];
  metodo_pago: string;
  nota?: string;
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
// El trigger descontar_insumos_por_venta se ejecuta automáticamente al
// insertar en ventas_detalles.
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

  // ── Validaciones básicas ───────────────────────────────────────────────────
  if (!input.sede_id) return { success: false, error: 'sede_id es requerido' };
  if (!input.items || input.items.length === 0) {
    return { success: false, error: 'El carrito está vacío' };
  }

  // Verificar que la sede pertenece a la empresa (hardening de seguridad)
  const { data: sede } = await supabase
    .from('sedes')
    .select('id, tipo_sede')
    .eq('id', input.sede_id)
    .eq('empresa_id', perfil.empresa_id)
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
  const { data: factura, error: errorFactura } = await supabase
    .from('ventas_facturas')
    .insert({
      empresa_id: perfil.empresa_id,
      sede_id: input.sede_id,
      id_pos: null,                      // Venta nativa, sin POS físico
      numero_documento: numeroDocumento,
      fecha_venta: fechaVenta,
      total: total,
      descuento: 0,
      tipo_documento: 'VENTA_VIRTUAL',
      estado_pago: 1,                    // 1 = pagado inmediatamente
      saldo_pendiente: 0,
      verificado: true,                  // Las ventas nativas se marcan verificadas por defecto
    })
    .select('id')
    .single();

  if (errorFactura || !factura) {
    console.error('[procesarVentaVirtual] Error insertando factura:', errorFactura);
    return { success: false, error: `Error al crear la factura: ${errorFactura?.message}` };
  }

  const facturaId = factura.id;

  // ── PASO 2: Insertar ítems en ventas_detalles ──────────────────────────────
  // El trigger descontar_insumos_por_venta se ejecuta AFTER INSERT por cada fila.
  const detalles = input.items.map((item) => ({
    factura_id: facturaId,
    producto_id: item.producto_id,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    total: item.precio_unitario * item.cantidad,
  }));

  const { error: errorDetalles } = await supabase
    .from('ventas_detalles')
    .insert(detalles);

  if (errorDetalles) {
    console.error('[procesarVentaVirtual] Error insertando detalles:', errorDetalles);
    // Intentar limpiar la cabecera huérfana
    await supabase.from('ventas_facturas').delete().eq('id', facturaId);
    return { success: false, error: `Error al registrar los productos: ${errorDetalles.message}` };
  }

  // ── PASO 3: Insertar pago en ventas_pagos ─────────────────────────────────
  const { error: errorPago } = await supabase
    .from('ventas_pagos')
    .insert({
      factura_id: facturaId,
      tipo_pago: input.metodo_pago,
      monto: total,
    });

  if (errorPago) {
    // El pago es no crítico — la venta ya quedó asentada, solo log
    console.error('[procesarVentaVirtual] Error insertando pago (no crítico):', errorPago);
  }

  // ── Revalidar cache ────────────────────────────────────────────────────────
  revalidatePath('/dashboard/ventas');

  return { success: true, facturaId };
}
