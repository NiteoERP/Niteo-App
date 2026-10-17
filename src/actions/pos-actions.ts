'use server';

import { createClient } from '@/utils/supabase/server';
import { registrarAsiento } from './contabilidad-actions';
import { DEFAULT_TIMEZONE, getTimezoneOffsetString, getLocalDayRange, toLocalDateKey } from '@/utils/date-utils';

export interface ModificacionVentaLog {
  id_log: string;
  fecha: string;
  factura_id: string;
  id_pos?: string;
  numero_orden?: string;
  gerente_id: string;
  gerente_nombre: string;
  gerente_rol: string;
  motivo: string;
  total_anterior: number;
  total_nuevo: number;
  descuento_anterior: number;
  descuento_nuevo: number;
  detalles_anteriores: { producto_id: string; producto_nombre: string; cantidad: number; precio_unitario: number; total: number }[];
  detalles_nuevos: { producto_id: string; producto_nombre: string; cantidad: number; precio_unitario: number; total: number }[];
  pagos_anteriores: { tipo_pago: string; monto: number }[];
  pagos_nuevos: { tipo_pago: string; monto: number }[];
  resumen_cambios: string[];
}

export interface VentaPOS {
  verificado?: boolean;
  id_factura: string;
  id_pos: string;
  numero_documento: string;
  numero_orden?: string;
  fecha_venta: string;
  total: number;
  descuento: number;
  tipo_documento: string;
  esta_pagado: boolean;
  cliente_nombre?: string;
  cajero_nombre?: string;
  mesero_nombre?: string;
  propina?: number;
  pagos?: { tipo_pago: string, monto: number }[];
  metodo_pago?: string;       // resumen del primer método de pago registrado
  detalles: VentaDetalle[];
  modificaciones?: ModificacionVentaLog[];
}

export interface VentaDetalle {
  id_detalle: string;    // uuid en schema real
  producto_id: string;   // productos.id es uuid, no integer
  cantidad: number;
  precio_unitario: number;
  total: number;
  producto_nombre?: string;
  producto_codigo?: string;
  promo_id?: string;
  combo_items?: any[];
}

export interface ProductoPOS {
  producto_id: string;   // productos.id es uuid, no integer
  codigo_barras: string;
  nombre: string;
  precio_venta: number;
  costo: number;
  categoria_id?: string;
  precio_modificable?: boolean;
  aplica_listas_precios?: boolean;
  precios_dinamicos?: Record<string, number>;
}

export async function getVentasRecientes(sedeId?: string): Promise<VentaPOS[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  let empresaId: string | undefined;
  if (user) {
    const { data: perf } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
    empresaId = perf?.empresa_id;
  }

  let query = supabase
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
        promo_id,
        combo_items,
        productos (
          nombre,
          codigo_barras
        )
      )
    `)
    .neq('numero_documento', 'TEST')
    .order('fecha_venta', { ascending: false })
    .limit(100);

  if (empresaId) {
    query = query.eq('empresa_id', empresaId);
  }

  if (sedeId && sedeId !== 'ALL') {
    query = query.eq('sede_id', sedeId);
  }

  const { data: ventas, error } = await query;
  if (error) {
    console.error('Error fetching ventas recientes:', error);
    return [];
  }

  const facturaIds = (ventas || []).map((v: any) => v.id);
  const modsMap = await obtenerModificacionesFacturas(supabase, facturaIds);

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
    cliente_nombre: v.cliente_nombre || v.clientes?.nombre,
    cajero_nombre: v.cajero_nombre,
    mesero_nombre: v.mesero_nombre,
    propina: v.propina,
    pagos: (v.ventas_pagos || []).map((p: any) => ({ tipo_pago: p.tipo_pago, monto: p.monto })),
    metodo_pago: (v.ventas_pagos || [])[0]?.tipo_pago,
    modificaciones: modsMap[v.id] || [],
    detalles: (v.ventas_detalles || []).map((d: any) => ({
      id_detalle: d.id,
      producto_id: d.producto_id,
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario,
      total: d.total,
      promo_id: d.promo_id,
      combo_items: d.combo_items,
      producto_nombre: d.productos?.nombre || 'Desconocido',
      producto_codigo: d.productos?.codigo_barras,
    }))
  }));
}

async function obtenerModificacionesFacturas(supabase: any, facturaIds: string[]): Promise<Record<string, ModificacionVentaLog[]>> {
  const modsMap: Record<string, ModificacionVentaLog[]> = {};
  if (!facturaIds || facturaIds.length === 0) return modsMap;

  try {
    const { createAdminClient } = await import('@/utils/supabase/admin');
    const admin = createAdminClient();
    const { data: logsAudit, error } = await admin
      .from('auditoria_pos')
      .select('id, fecha, detalle, created_at')
      .eq('accion', 'Modificación de Pedido (Web)')
      .order('created_at', { ascending: false });

    if (!error && logsAudit) {
      const idsSet = new Set(facturaIds);
      logsAudit.forEach((log: any) => {
        try {
          const parsed = JSON.parse(log.detalle);
          if (parsed && parsed.factura_id && idsSet.has(parsed.factura_id)) {
            if (!modsMap[parsed.factura_id]) modsMap[parsed.factura_id] = [];
            modsMap[parsed.factura_id].push({
              ...parsed,
              id_log: log.id,
              fecha: log.fecha || log.created_at || parsed.fecha,
            });
          }
        } catch (_) {}
      });
    }
  } catch (err) {
    console.warn('Error cargando modificaciones de auditoria_pos:', err);
  }

  return modsMap;
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

/**
 * CatÃ¡logo filtrado para el Terminal Virtual de Niteo.
 * Solo incluye productos con canal_venta = 'SOLO_NITEO' o 'AMBOS'.
 */
export async function getProductosCatalogoVirtual(empresaId: string): Promise<ProductoPOS[]> {
  const supabase = await createClient();

  const { data: productos, error } = await supabase
    .from('productos')
    .select('id, codigo_barras, nombre, precio_venta, costo, categoria_id, precio_modificable, productos_precios(lista_precio_id, precio)')
    .eq('empresa_id', empresaId)
    .eq('estado_activo', true)
    .in('canal_venta', ['SOLO_NITEO', 'AMBOS'])
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error fetching productos para terminal virtual:', error);
    return [];
  }

  return (productos || []).map((p: any) => {
    const pd: Record<string, number> = {};
    if (p.productos_precios && Array.isArray(p.productos_precios)) {
      p.productos_precios.forEach((pp: any) => {
        pd[pp.lista_precio_id] = pp.precio;
      });
    }
    return {
      producto_id: p.id,
      codigo_barras: p.codigo_barras,
      nombre: p.nombre,
      precio_venta: p.precio_venta,
      costo: p.costo,
      categoria_id: p.categoria_id,
      precio_modificable: p.precio_modificable,
      aplica_listas_precios: p.aplica_listas_precios,
      precios_dinamicos: pd
    };
  });
}

export interface HistorialVentaPOS extends VentaPOS {
  cajero_nombre?: string;
  mesero_nombre?: string;
  propina?: number;
  cliente_nombre?: string;
  pagos: { tipo_pago: string; monto: number }[];
  estado_activo: boolean;
}

export async function getHistorialVentasCompleto(
  sedeId: string,
  fechaFiltro?: string,
  page: number = 1,
  limit: number = 50,
  clientTimeZone?: string,
  busqueda?: string
): Promise<HistorialVentaPOS[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  let empresaId: string | undefined;
  if (user) {
    const { data: perf } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
    empresaId = perf?.empresa_id;
  }

  let timeZone = clientTimeZone;
  if (!timeZone) {
    if (sedeId && sedeId !== 'ALL') {
      const { data: sede } = await supabase
        .from('sedes')
        .select('empresas(zona_horaria)')
        .eq('id', sedeId)
        .maybeSingle();
      timeZone = (sede as any)?.empresas?.zona_horaria || DEFAULT_TIMEZONE;
    } else {
      timeZone = DEFAULT_TIMEZONE;
    }
  }

  let query = supabase
    .from('ventas_facturas')
    .select(`
      *,
      clientes ( nombre ),
      ventas_pagos ( tipo_pago, monto ),
      ventas_detalles (
        id, producto_id, cantidad, precio_unitario, total, promo_id, combo_items,
        productos ( nombre, codigo_barras )
      )
    `)
    .neq('numero_documento', 'TEST')
    .order('fecha_venta', { ascending: false });

  if (empresaId) {
    query = query.eq('empresa_id', empresaId);
  }

  if (sedeId && sedeId !== 'ALL') {
    query = query.eq('sede_id', sedeId);
  }

  if (busqueda && busqueda.trim()) {
    const b = busqueda.trim().replace(/\*/g, '');
    query = query.or(`cliente_nombre.ilike.*${b}*,numero_orden.ilike.*${b}*,numero_documento.ilike.*${b}*,id_pos.ilike.*${b}*`);
  }

  if (fechaFiltro) {
    const range = getLocalDayRange(fechaFiltro, timeZone);
    query = query
      .gte('fecha_venta', range.start)
      .lte('fecha_venta', range.end);
  }
  
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data: ventas, error } = await query;

  if (error) {
    console.error('Error fetching historial ventas:', error);
    return [];
  }

  const facturaIds = (ventas || []).map((v: any) => v.id);
  const modsMap = await obtenerModificacionesFacturas(supabase, facturaIds);

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
    estado_activo: v.estado_activo,
    esta_pagado: v.estado_pago === 1,
    cliente_nombre: v.clientes?.nombre || v.cliente_nombre || v.numero_orden || 'Venta Rápida',
    cajero_nombre: v.cajero_nombre,
    mesero_nombre: v.mesero_nombre,
    propina: v.propina,
    pagos: (v.ventas_pagos || []).map((p: any) => ({
      tipo_pago: p.tipo_pago,
      monto: p.monto
    })),
    modificaciones: modsMap[v.id] || [],
    detalles: (v.ventas_detalles || []).map((d: any) => ({
      id_detalle: d.id,
      producto_id: d.producto_id,
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario,
      total: d.total,
      promo_id: d.promo_id,
      combo_items: d.combo_items,
      producto_nombre: d.productos?.nombre || 'Desconocido',
      producto_codigo: d.productos?.codigo_barras,
    }))
  }));
}

export async function getResumenVerificacionMes(
  sedeId: string,
  yearMonth: string,
  clientTimeZone?: string
) {
  const supabase = await createClient();

  let timeZone = clientTimeZone;
  if (!timeZone) {
    if (sedeId && sedeId !== 'ALL') {
      const { data: sede } = await supabase
        .from('sedes')
        .select('empresas(zona_horaria)')
        .eq('id', sedeId)
        .maybeSingle();
      timeZone = (sede as any)?.empresas?.zona_horaria || DEFAULT_TIMEZONE;
    } else {
      timeZone = DEFAULT_TIMEZONE;
    }
  }

  const range = getLocalDayRange(yearMonth, timeZone);

  let query = supabase
    .from('ventas_facturas')
    .select('fecha_venta, verificado')
    .neq('numero_documento', 'TEST')
    .eq('estado_activo', true)
    .gte('fecha_venta', range.start)
    .lte('fecha_venta', range.end);

  if (sedeId && sedeId !== 'ALL') {
    query = query.eq('sede_id', sedeId);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('Error fetching monthly verification summary:', error);
    return {};
  }

  const summary: Record<string, { total: number; verified: number }> = {};
  for (const row of data) {
    if (!row.fecha_venta) continue;
    // Agrupar por la fecha exacta en la zona horaria de la empresa
    const dateKey = toLocalDateKey(row.fecha_venta, timeZone);
    if (!summary[dateKey]) {
      summary[dateKey] = { total: 0, verified: 0 };
    }
    summary[dateKey].total++;
    if (row.verificado) {
      summary[dateKey].verified++;
    }
  }

  return summary;
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

export async function anularVentaPOS(facturaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  const { error } = await supabase
    .from('ventas_facturas')
    .update({ estado_activo: false })
    .eq('id', facturaId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

export async function restaurarVentaPOS(facturaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  const { error } = await supabase
    .from('ventas_facturas')
    .update({ estado_activo: true })
    .eq('id', facturaId);
  
  if (error) {
    return { success: false, error: error.message };
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


export async function procesarReembolsoPOS(facturaId: string, detalles: any[], metodoPago: string) {
  const supabase = await createClient();
  const { data: factura, error: errFac } = await supabase
    .from('ventas_facturas')
    .select('*')
    .eq('id', facturaId)
    .single();

  if (errFac || !factura) return { success: false, error: 'Factura no encontrada' };

  // Calcular total a reembolsar
  const totalDevolver = detalles.reduce((acc, it) => acc + (it.cantidadDevolver * it.precio_unitario), 0);

  // Crear documento de reembolso
  const nuevoNumero = 'NC-' + (factura.numero_documento || factura.id.slice(0, 8).toUpperCase());
  const nuevoId = crypto.randomUUID();

  const { error: errIns } = await supabase.from('ventas_facturas').insert({
    id: nuevoId,
    empresa_id: factura.empresa_id,
    sede_id: factura.sede_id,
    cajero_nombre: factura.cajero_nombre,
    mesero_nombre: factura.mesero_nombre,
    cliente_id: factura.cliente_id,
    cliente_nombre: factura.cliente_nombre,
    numero_documento: nuevoNumero,
    numero_orden: factura.numero_orden,
    tipo_documento: 'REEMBOLSO',
    total: -totalDevolver, // MONTO NEGATIVO
    descuento: 0,
    estado_pago: 1, // Pagado/Completado
    estado_activo: true,
    verificado: true
  , id_pos: nuevoId});

  if (errIns) return { success: false, error: 'Error al crear documento de reembolso: ' + errIns.message };

  // Insertar detalles en negativo
  const { error: errDet } = await supabase.from('ventas_detalles').insert(
    detalles.map(d => ({
      empresa_id: factura.empresa_id,
      id_pos: crypto.randomUUID(),

      factura_id: nuevoId,
      producto_id: d.producto_id,
      cantidad: -d.cantidadDevolver, // CANTIDAD NEGATIVA
      precio_unitario: d.precio_unitario,
      total: -(d.cantidadDevolver * d.precio_unitario),
      descuento: 0
    
    }))
  );

  if (errDet) return { success: false, error: 'Error al insertar detalles: ' + errDet.message };

  // Insertar pago en negativo
  const { error: errPago } = await supabase.from('ventas_pagos').insert({
    empresa_id: factura.empresa_id,
    id_pos: crypto.randomUUID(),

    factura_id: nuevoId,
    tipo_pago: metodoPago,
    monto: -totalDevolver, // PAGO NEGATIVO
    moneda: 'USD'
  
  });

  if (errPago) return { success: false, error: 'Error al registrar pago de reembolso: ' + errPago.message };

  // Actualizar estado de la factura original si fue reembolso total
  // (opcional, por ahora lo dejamos como VENTA activa, y el reembolso balancea la matematica)

  return { success: true };
}

export interface ModificarVentaItemPayload {
  id_detalle?: string;
  producto_id: string;
  producto_nombre?: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  notas?: string;
  promo_id?: string;
  combo_items?: any[];
}

export interface ModificarVentaPagoPayload {
  tipo_pago: string;
  monto: number;
  moneda?: string;
}

export interface ModificarVentaPayload {
  facturaId: string;
  motivo: string;
  detalles: ModificarVentaItemPayload[];
  pagos: ModificarVentaPagoPayload[];
  descuento?: number;
  propina?: number;
  notas?: string;
}

async function ajustarInventarioInsumos(admin: any, productoId: string, deltaCantidad: number) {
  if (!deltaCantidad || deltaCantidad === 0) return;

  try {
    const { data: prod } = await admin
      .from('productos')
      .select('id, id_insumo_vinculado')
      .eq('id', productoId)
      .maybeSingle();

    if (prod?.id_insumo_vinculado) {
      const { data: insumo } = await admin
        .from('inventario_insumos')
        .select('cantidad_actual')
        .eq('id', prod.id_insumo_vinculado)
        .maybeSingle();

      if (insumo) {
        const nuevaCantidad = Math.max(0, Number(insumo.cantidad_actual || 0) + deltaCantidad);
        await admin
          .from('inventario_insumos')
          .update({ cantidad_actual: nuevaCantidad })
          .eq('id', prod.id_insumo_vinculado);
      }
    } else {
      const { data: recetas } = await admin
        .from('recetas')
        .select('insumo_id, cantidad_necesaria')
        .eq('producto_id', productoId);

      if (recetas && recetas.length > 0) {
        for (const r of recetas) {
          if (!r.insumo_id) continue;
          const deltaInsumo = deltaCantidad * Number(r.cantidad_necesaria || 0);
          const { data: insumo } = await admin
            .from('inventario_insumos')
            .select('cantidad_actual')
            .eq('id', r.insumo_id)
            .maybeSingle();

          if (insumo) {
            const nuevaCantidad = Math.max(0, Number(insumo.cantidad_actual || 0) + deltaInsumo);
            await admin
              .from('inventario_insumos')
              .update({ cantidad_actual: nuevaCantidad })
              .eq('id', r.insumo_id);
          }
        }
      }
    }
  } catch (errInv) {
    console.warn('[ajustarInventarioInsumos] Error ajustando inventario:', errInv);
  }
}

export async function modificarVentaPOS(payload: ModificarVentaPayload) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autorizado' };

    const { createAdminClient } = await import('@/utils/supabase/admin');
    const admin = createAdminClient();

    const { data: profile } = await admin
      .from('perfiles')
      .select('id, nombre_completo, rol, permisos, empresa_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile && !user.app_metadata?.user_role) {
      return { success: false, error: 'Perfil de usuario no encontrado' };
    }

    const rolNormalizado = (profile?.rol || user.app_metadata?.user_role || '').toUpperCase();
    const esRolValido = ['MASTER', 'PROPIETARIO', 'DUENO', 'GERENTE', 'ADMIN', 'SUPERADMIN'].includes(rolNormalizado);
    const permisosUsuario = Array.isArray(profile?.permisos) ? profile.permisos : [];
    const tieneModuloHabilitado = permisosUsuario.includes('modificar_ventas') || 
                                  permisosUsuario.includes('modificacion_ventas') || 
                                  permisosUsuario.includes('modificar_pedidos');

    if (!esRolValido && !tieneModuloHabilitado) {
      return { 
        success: false, 
        error: 'No tienes autorización. Esta acción es válida únicamente para usuarios Master, Propietario, Gerente o usuarios con el módulo de modificación de ventas habilitado.' 
      };
    }

    if (!payload.motivo || !payload.motivo.trim()) {
      return { success: false, error: 'Es obligatorio indicar el motivo de la modificación.' };
    }

    if (!payload.detalles || payload.detalles.length === 0) {
      return { success: false, error: 'El pedido debe conservar al menos un producto.' };
    }

    for (const d of payload.detalles) {
      if (d.cantidad <= 0 || isNaN(d.cantidad)) {
        return { success: false, error: 'Todas las cantidades deben ser mayores a 0.' };
      }
    }

    const { data: factura, error: errFac } = await admin
      .from('ventas_facturas')
      .select(`
        *,
        ventas_detalles (
          id, id_pos, producto_id, cantidad, precio_unitario, total, descuento, promo_id, combo_items,
          productos ( id, nombre, id_insumo_vinculado )
        ),
        ventas_pagos ( id, id_pos, tipo_pago, monto, moneda, fecha_pago, referencia, tasa_cambio, monto_bs )
      `)
      .eq('id', payload.facturaId)
      .single();

    if (errFac || !factura) {
      return { success: false, error: 'Factura no encontrada: ' + (errFac?.message || '') };
    }

    const userEmpresaId = profile?.empresa_id || user.app_metadata?.empresa_id;
    if (userEmpresaId && factura.empresa_id !== userEmpresaId && rolNormalizado !== 'SUPERADMIN') {
      return { success: false, error: 'No autorizado para modificar ventas de otra empresa' };
    }

    const crypto = await import('crypto');

    // 1. Manejo de Items de la Venta (inventario + ventas_detalles)
    const newDetailIds = new Set(payload.detalles.filter(d => d.id_detalle).map(d => d.id_detalle));
    const toDelete = (factura.ventas_detalles || []).filter((od: any) => !newDetailIds.has(od.id));

    // Eliminar items quitados y devolver insumos a inventario
    for (const od of toDelete) {
      await ajustarInventarioInsumos(admin, od.producto_id, Number(od.cantidad));
      const { error: errDel } = await admin.from('ventas_detalles').delete().eq('id', od.id);
      if (errDel) {
        return { success: false, error: 'Error al eliminar producto del pedido: ' + errDel.message };
      }
    }

    // Actualizar items existentes
    for (const d of payload.detalles) {
      if (d.id_detalle) {
        const oldDetail = (factura.ventas_detalles || []).find((od: any) => od.id === d.id_detalle);
        if (oldDetail) {
          const diff = Number(oldDetail.cantidad) - Number(d.cantidad);
          if (diff !== 0) {
            await ajustarInventarioInsumos(admin, d.producto_id, diff);
          }
          const { error: errUpdDet } = await admin
            .from('ventas_detalles')
            .update({
              cantidad: d.cantidad,
              precio_unitario: d.precio_unitario,
              total: d.total
            })
            .eq('id', d.id_detalle);
          if (errUpdDet) {
            return { success: false, error: 'Error al actualizar producto del pedido: ' + errUpdDet.message };
          }
        }
      } else {
        // Nuevo item agregado a la orden (trigger de DB descontará automáticamente)
        const { error: errInsDet } = await admin.from('ventas_detalles').insert({
          id: crypto.randomUUID(),
          empresa_id: factura.empresa_id,
          id_pos: crypto.randomUUID(),
          factura_id: factura.id,
          producto_id: d.producto_id,
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
          total: d.total,
          descuento: 0,
          promo_id: d.promo_id || null,
          combo_items: d.combo_items || null
        });
        if (errInsDet) {
          return { success: false, error: 'Error al agregar producto al pedido: ' + errInsDet.message };
        }
      }
    }

    // 2. Manejo de Pagos (reemplazar ventas_pagos)
    const { error: errDelPagos } = await admin.from('ventas_pagos').delete().eq('factura_id', factura.id);
    if (errDelPagos) {
      return { success: false, error: 'Error al limpiar pagos anteriores: ' + errDelPagos.message };
    }
    if (payload.pagos && payload.pagos.length > 0) {
      const { error: errInsPagos } = await admin.from('ventas_pagos').insert(
        payload.pagos.map(p => ({
          id: crypto.randomUUID(),
          empresa_id: factura.empresa_id,
          id_pos: crypto.randomUUID(),
          factura_id: factura.id,
          tipo_pago: p.tipo_pago,
          monto: p.monto,
          moneda: p.moneda || 'USD',
          fecha_pago: factura.fecha_venta || new Date().toISOString(),
          tasa_cambio: 1,
          monto_bs: 0
        }))
      );
      if (errInsPagos) {
        return { success: false, error: 'Error al registrar los nuevos pagos: ' + errInsPagos.message };
      }
    }

    // 3. Recalcular y actualizar totales en ventas_facturas
    const subtotal = payload.detalles.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
    const descuento = Number(payload.descuento || 0);
    const propina = Number(payload.propina || 0);
    const nuevoTotal = Math.round((subtotal - descuento + propina) * 100) / 100;

    const { error: errUpdFac } = await admin
      .from('ventas_facturas')
      .update({
        total: nuevoTotal,
        descuento,
        propina,
        notas: payload.notas !== undefined ? payload.notas : factura.notas
      })
      .eq('id', factura.id);

    if (errUpdFac) {
      return { success: false, error: 'Error al actualizar totales de la factura: ' + errUpdFac.message };
    }

    // 4. Generar Resumen de Cambios para Auditoría
    const cambios: string[] = [];
    toDelete.forEach((td: any) => {
      cambios.push(`Eliminado: ${td.cantidad}x ${td.productos?.nombre || 'Producto'} ($${Number(td.total).toFixed(2)})`);
    });
    payload.detalles.forEach((nd) => {
      if (!nd.id_detalle) {
        cambios.push(`Agregado: ${nd.cantidad}x ${nd.producto_nombre || 'Producto'} ($${Number(nd.total).toFixed(2)})`);
      } else {
        const old = (factura.ventas_detalles || []).find((od: any) => od.id === nd.id_detalle);
        if (old && (Number(old.cantidad) !== Number(nd.cantidad) || Number(old.total) !== Number(nd.total))) {
          cambios.push(`Modificado: ${nd.producto_nombre || 'Producto'} (${old.cantidad}x -> ${nd.cantidad}x, $${Number(old.total).toFixed(2)} -> $${Number(nd.total).toFixed(2)})`);
        }
      }
    });
    if (Number(factura.total) !== nuevoTotal) {
      cambios.push(`Total ajustado: $${Number(factura.total).toFixed(2)} -> $${nuevoTotal.toFixed(2)} USD`);
    }
    cambios.push(`Pagos actualizados (${payload.pagos.map(p => `${p.tipo_pago}: $${Number(p.monto).toFixed(2)}`).join(', ')})`);

    // 5. Registrar en auditoria_pos y auditoria_logs
    const auditId = crypto.randomUUID();
    const nombreResponsable = profile?.nombre_completo || user.user_metadata?.full_name || user.email || 'Gerente';
    const gerenteTexto = `${nombreResponsable} (${rolNormalizado})`;
    const modLog: ModificacionVentaLog = {
      id_log: auditId,
      fecha: new Date().toISOString(),
      factura_id: factura.id,
      id_pos: factura.id_pos,
      numero_orden: factura.numero_orden,
      gerente_id: user.id,
      gerente_nombre: nombreResponsable,
      gerente_rol: rolNormalizado,
      motivo: payload.motivo.trim(),
      total_anterior: Number(factura.total),
      total_nuevo: nuevoTotal,
      descuento_anterior: Number(factura.descuento || 0),
      descuento_nuevo: descuento,
      detalles_anteriores: (factura.ventas_detalles || []).map((d: any) => ({
        producto_id: d.producto_id,
        producto_nombre: d.productos?.nombre || 'Producto',
        cantidad: Number(d.cantidad),
        precio_unitario: Number(d.precio_unitario),
        total: Number(d.total)
      })),
      detalles_nuevos: payload.detalles.map((d) => ({
        producto_id: d.producto_id,
        producto_nombre: d.producto_nombre || 'Producto',
        cantidad: Number(d.cantidad),
        precio_unitario: Number(d.precio_unitario),
        total: Number(d.total)
      })),
      pagos_anteriores: (factura.ventas_pagos || []).map((p: any) => ({
        tipo_pago: p.tipo_pago,
        monto: Number(p.monto)
      })),
      pagos_nuevos: payload.pagos.map((p) => ({
        tipo_pago: p.tipo_pago,
        monto: Number(p.monto)
      })),
      resumen_cambios: cambios
    };

    // Auditoria POS (para sincronización con POS local y vista rápida)
    await admin
      .from('auditoria_pos')
      .insert({
        id: auditId,
        sede_id: factura.sede_id,
        usuario_id: gerenteTexto,
        accion: 'Modificación de Pedido (Web)',
        detalle: JSON.stringify(modLog),
        gerente_aprobador_id: user.id,
        fecha: new Date().toISOString()
      });

    // Auditoria Logs (para el historial general del sistema)
    try {
      await admin
        .from('auditoria_logs')
        .insert({
          empresa_id: factura.empresa_id,
          usuario_id: user.id,
          tabla_afectada: 'ventas_facturas',
          accion: 'UPDATE',
          registro_id: factura.id,
          datos_viejos: {
            total: factura.total,
            descuento: factura.descuento,
            detalles: modLog.detalles_anteriores,
            pagos: modLog.pagos_anteriores
          },
          datos_nuevos: {
            total: nuevoTotal,
            descuento,
            detalles: modLog.detalles_nuevos,
            pagos: modLog.pagos_nuevos,
            motivo: payload.motivo.trim(),
            resumen_cambios: cambios
          },
          creado_en: new Date().toISOString()
        });
    } catch (eAudit) {
      console.warn('Advertencia registrando en auditoria_logs:', eAudit);
    }

    return { success: true, modLog };
  } catch (err: any) {
    console.error('[modificarVentaPOS] Error:', err);
    return { success: false, error: err?.message || 'Error inesperado al modificar la venta' };
  }
}

