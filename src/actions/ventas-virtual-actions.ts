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
  promo_id?: string;
  combo_items?: any;
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
  cliente_cedula?: string;
  cliente_telefono?: string;
  mesero_nombre?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generador de número de documento único para ventas nativas
// ─────────────────────────────────────────────────────────────────────────────
function generarNumeroDocumento(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
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

  // ── Gestión de Cliente (Eventual / Express o Registrado) ───────────────────
  let finalClienteId = input.cliente_id || null;
  let nombreLimpio = input.cliente_nombre?.trim() || null;
  const cedulaLimpia = input.cliente_cedula?.trim() || null;
  const telefonoLimpio = input.cliente_telefono?.trim() || null;

  // Si enviaron cédula pero no tenemos cliente_id, buscamos o registramos por cédula
  if (!finalClienteId && cedulaLimpia) {
    const { data: existingByCedula } = await supabase
      .from('clientes')
      .select('id, nombre')
      .eq('empresa_id', empresaId)
      .eq('rif_cedula', cedulaLimpia)
      .maybeSingle();

    if (existingByCedula) {
      finalClienteId = existingByCedula.id;
      if (!nombreLimpio) nombreLimpio = existingByCedula.nombre;
    } else if (nombreLimpio) {
      // Solo registramos una nueva ficha en el directorio de clientes si tiene CÉDULA
      const clientPosId = `VRT_CLI_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const { data: newClient, error: errNewClient } = await supabase
        .from('clientes')
        .insert({
          empresa_id: empresaId,
          id_pos: clientPosId,
          nombre: nombreLimpio,
          rif_cedula: cedulaLimpia,
          telefono: telefonoLimpio || null,
          estado_activo: true
        })
        .select('id')
        .single();

      if (newClient) {
        finalClienteId = newClient.id;
      } else if (errNewClient) {
        console.warn('[procesarVentaVirtual] Aviso al crear cliente:', errNewClient.message);
      }
    }
  } else if (finalClienteId && !nombreLimpio) {
    // Si viene ID pero no nombre, obtener el nombre del cliente para la factura
    const { data: clientData } = await supabase
      .from('clientes')
      .select('nombre')
      .eq('id', finalClienteId)
      .maybeSingle();
    if (clientData?.nombre) {
      nombreLimpio = clientData.nombre;
    }
  }

  // NOTA: Si solo enviaron nombre sin cédula y sin cliente_id previo,
  // NO se inserta nada en la tabla 'clientes' para evitar duplicados o ensuciar el directorio.
  // El nombre queda guardado directamente en ventas_facturas.cliente_nombre como cliente eventual.

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
  
  // Si la venta tiene crédito (saldo_pendiente > 0), requiere obligatoriamente cliente con Cédula y Teléfono
  if (saldo_pendiente > 0) {
    if (!finalClienteId && (!nombreLimpio || !cedulaLimpia || !telefonoLimpio)) {
      return { 
        success: false, 
        error: 'Para ventas a crédito (con saldo pendiente), es obligatorio registrar el Nombre, la Cédula y el Teléfono del cliente.' 
      };
    }
  }

  const estado_pago = saldo_pendiente > 0 ? 2 : 1; // 1 = Pagado, 2 = Crédito/Pendiente

  const numeroDocumento = generarNumeroDocumento();
  const fechaVenta = new Date().toISOString();

  // ── PASO 1: Insertar cabecera en ventas_facturas ───────────────────────────
  // NOTA: id_pos DEBE ser único por cada factura para respetar la restricción
  // unique_facturas_id_pos y ventas_facturas_id_pos_unique en la base de datos.
  const { data: factura, error: errorFactura } = await supabase
    .from('ventas_facturas')
    .insert({
      empresa_id: empresaId,
      sede_id: input.sede_id,
      cliente_id: finalClienteId,
      cliente_nombre: nombreLimpio,
      mesero_nombre: input.mesero_nombre?.trim() || null,
      id_pos: numeroDocumento,             
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
  const detalles = input.items.map((item, idx) => ({
    empresa_id: empresaId,
    factura_id: facturaId,
    producto_id: item.producto_id,
    id_pos: `${numeroDocumento}-D${idx + 1}`,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    total: item.precio_unitario * item.cantidad,
    descuento: 0,
    promo_id: item.promo_id || null,
    combo_items: item.combo_items || null,
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
    const pagosToInsert = input.pagos.filter(p => p.monto > 0).map((p, idx) => ({
      empresa_id: empresaId,
      factura_id: facturaId,
      id_pos: `${numeroDocumento}-P${idx + 1}`,
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

  // ── PASO 4: Descontar inventario automáticamente (recetas y suministros) ──
  await descontarInventarioVenta(
    supabase,
    empresaId,
    input.sede_id,
    user.id,
    numeroDocumento,
    input.items,
    fechaVenta
  );

  // ── Revalidar cache ────────────────────────────────────────────────────────
  revalidatePath('/dashboard/ventas');
  revalidatePath('/dashboard/inventario');
  revalidatePath('/dashboard/informes');

  return { 
    success: true, 
    facturaId,
    factura: {
      numero_documento: numeroDocumento,
      fecha_venta: fechaVenta,
      total,
      saldo_pendiente,
      cliente_nombre: nombreLimpio,
      cliente_id: finalClienteId,
      mesero_nombre: input.mesero_nombre?.trim() || null,
    }
  };
}

export async function buscarClientePorCedula(cedula: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!perfil) return null;
  
  const { data: cliente, error } = await supabase
    .from('clientes')
    .select('id, nombre, rif_cedula, telefono')
    .eq('empresa_id', perfil.empresa_id)
    .eq('rif_cedula', cedula)
    .single();
    
  if (error) return null;
  return cliente;
}

export async function buscarClientes(query: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!perfil) return [];

  const q = query.trim();
  if (!q) return [];

  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('id, nombre, rif_cedula, telefono')
    .eq('empresa_id', perfil.empresa_id)
    .or(`nombre.ilike.%${q}%,rif_cedula.ilike.%${q}%`)
    .limit(6);

  if (error || !clientes) return [];
  return clientes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de deducción de inventario para ventas directas y combos/promociones
// ─────────────────────────────────────────────────────────────────────────────

async function descontarInventarioVenta(
  supabase: any,
  empresaId: string,
  sedeId: string,
  userId: string,
  numeroDocumento: string,
  items: ItemVentaVirtual[],
  fechaVenta: string
) {
  try {
    for (const item of items) {
      // Caso 1: Ítem con combo_items (Promoción / Combo)
      if (item.combo_items && Array.isArray(item.combo_items) && item.combo_items.length > 0) {
        for (const sub of item.combo_items) {
          const subProductoId = sub.producto_id;
          if (!subProductoId) continue;
          const subQtyTotal = Number(sub.cantidad || 1) * Number(item.cantidad || 1);
          await procesarDeduccionProducto(
            supabase,
            empresaId,
            sedeId,
            userId,
            subProductoId,
            subQtyTotal,
            numeroDocumento,
            `PROMO: ${item.nombre} -> ${sub.nombre || 'Sub-producto'}`,
            fechaVenta
          );
        }
      } else {
        // Caso 2: Ítem individual estándar
        if (item.producto_id) {
          await procesarDeduccionProducto(
            supabase,
            empresaId,
            sedeId,
            userId,
            item.producto_id,
            Number(item.cantidad || 1),
            numeroDocumento,
            item.nombre,
            fechaVenta
          );
        }
      }
    }
  } catch (err) {
    console.error('[descontarInventarioVenta] Error durante la deducción de inventario:', err);
  }
}

async function procesarDeduccionProducto(
  supabase: any,
  empresaId: string,
  sedeId: string,
  userId: string,
  productoId: string,
  cantidadVendida: number,
  numeroDocumento: string,
  descripcionItem: string,
  fechaVenta: string
) {
  if (cantidadVendida <= 0) return;

  // 1. Buscar si tiene receta(s) en `recetas`
  const { data: recetas, error: errRecetas } = await supabase
    .from('recetas')
    .select('id, insumo_id, subproducto_id, cantidad_necesaria')
    .eq('empresa_id', empresaId)
    .eq('producto_id', productoId);

  if (!errRecetas && recetas && recetas.length > 0) {
    for (const rec of recetas) {
      if (rec.insumo_id) {
        const cantInsumoDescontar = Number(
          (Number(rec.cantidad_necesaria || 0) * cantidadVendida).toFixed(4)
        );
        if (cantInsumoDescontar <= 0) continue;

        await ejecutarSalidaInsumo(
          supabase,
          empresaId,
          sedeId,
          userId,
          rec.insumo_id,
          cantInsumoDescontar,
          numeroDocumento,
          descripcionItem,
          fechaVenta
        );
      } else if (rec.subproducto_id) {
        // Sub-receta anidada
        const subCant = Number(
          (Number(rec.cantidad_necesaria || 0) * cantidadVendida).toFixed(4)
        );
        if (subCant > 0) {
          await procesarDeduccionProducto(
            supabase,
            empresaId,
            sedeId,
            userId,
            rec.subproducto_id,
            subCant,
            numeroDocumento,
            `${descripcionItem} (Sub-receta)`,
            fechaVenta
          );
        }
      }
    }
    return;
  }

  // 2. Si no tiene recetas, verificar si tiene insumo vinculado directamente en `productos`
  const { data: prod } = await supabase
    .from('productos')
    .select('id, id_insumo_vinculado, nombre')
    .eq('id', productoId)
    .maybeSingle();

  if (prod?.id_insumo_vinculado) {
    await ejecutarSalidaInsumo(
      supabase,
      empresaId,
      sedeId,
      userId,
      prod.id_insumo_vinculado,
      cantidadVendida,
      numeroDocumento,
      descripcionItem,
      fechaVenta
    );
  }
}

async function ejecutarSalidaInsumo(
  supabase: any,
  empresaId: string,
  sedeId: string,
  userId: string,
  insumoId: string,
  cantidadDescontar: number,
  numeroDocumento: string,
  motivoDetalle: string,
  fechaVenta: string
) {
  if (cantidadDescontar <= 0) return;

  // 1. Obtener el insumo origen
  const { data: insumoMaster } = await supabase
    .from('inventario_insumos')
    .select('id, nombre, sede_id, cantidad_actual, costo_promedio')
    .eq('id', insumoId)
    .single();

  if (!insumoMaster) return;

  let targetInsumo = insumoMaster;

  // Si el insumo está asociado a otra sede y la venta es en sedeId:
  if (insumoMaster.sede_id && insumoMaster.sede_id !== sedeId) {
    const { data: insumoSede } = await supabase
      .from('inventario_insumos')
      .select('id, nombre, sede_id, cantidad_actual, costo_promedio')
      .eq('empresa_id', empresaId)
      .eq('sede_id', sedeId)
      .ilike('nombre', insumoMaster.nombre)
      .maybeSingle();

    if (insumoSede) {
      targetInsumo = insumoSede;
    }
  }

  // 2. Calcular nueva cantidad
  const cantActual = Number(targetInsumo.cantidad_actual || 0);
  const nuevaCant = Number((cantActual - cantidadDescontar).toFixed(4));

  // 3. Descontar en inventario_insumos
  await supabase
    .from('inventario_insumos')
    .update({
      cantidad_actual: nuevaCant,
    })
    .eq('id', targetInsumo.id);

  // 4. Registrar movimiento en movimientos_inventario
  await supabase
    .from('movimientos_inventario')
    .insert({
      empresa_id: empresaId,
      insumo_id: targetInsumo.id,
      usuario_id: userId,
      tipo_movimiento: 'SALIDA',
      motivo: 'VENTA',
      cantidad: cantidadDescontar,
      costo_perdido: 0,
      notas: `Venta #${numeroDocumento} - ${motivoDetalle}`,
      fecha_movimiento: fechaVenta,
    });
}

