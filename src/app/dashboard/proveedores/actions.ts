'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getTasaBcvAction } from '@/actions/config-actions';
import { toSafeIsoDate } from '@/utils/date-utils';
import { revalidatePath } from 'next/cache';

export async function getProveedoresConDeuda(sedeId: string, page: number = 1, limit: number = 20, searchQuery: string = '') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Perfil no encontrado' };

  const p_sede_id = sedeId === 'ALL' ? null : sedeId;

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.rpc('get_proveedores_con_deuda', {
    p_empresa_id: profile.empresa_id,
    p_sede_id
  }, { count: 'exact' });

  if (searchQuery && searchQuery.trim() !== '') {
    query = query.ilike('nombre_proveedor', `%${searchQuery.trim()}%`);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) return { success: false, error: error.message };
  return { success: true, data, totalCount: count || 0 };
}

export async function getFacturasProveedor(proveedorId: string, sedeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  let query = supabase.from('compras_facturas')
    .select('id, sede_id, numero_factura, concepto, total, saldo_pendiente, fecha_emision, fecha_vencimiento, modificado, usuario_modificacion_id, pagos:compras_pagos(id, monto, metodo_pago, referencia, banco_origen, fecha_pago)')
    .eq('proveedor_id', proveedorId)
    .order('fecha_emision', { ascending: false });
    
  if (sedeId !== 'ALL') {
    query = query.eq('sede_id', sedeId);
  }

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  let userMap: Record<string, string> = {};
  let sedeMap: Record<string, string> = {};
  if (profile) {
    const [perfilesRes, sedesRes] = await Promise.all([
      supabase.from('perfiles').select('id, nombre_completo').eq('empresa_id', profile.empresa_id),
      supabase.from('sedes').select('id, nombre_sede').eq('empresa_id', profile.empresa_id)
    ]);
    if (perfilesRes.data) {
      perfilesRes.data.forEach(p => { userMap[p.id] = p.nombre_completo; });
    }
    if (sedesRes.data) {
      sedesRes.data.forEach(s => { sedeMap[s.id] = s.nombre_sede; });
    }
  }

  const mappedData = data?.map((d: any) => ({
    ...d,
    sede_nombre: d.sede_id ? (sedeMap[d.sede_id] || null) : null,
    modificado_por: d.modificado ? (userMap[d.usuario_modificacion_id] || 'Usuario Desconocido') : null
  })) || [];

  return { success: true, data: mappedData };
}

export async function registrarPagoProveedor(facturaId: string, monto: number, metodoPago: string, referencia: string, bancoOrigen: string, fechaPago?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const payload: any = {
    factura_id: facturaId,
    monto,
    metodo_pago: metodoPago,
    referencia,
    banco_origen: bancoOrigen,
    usuario_id: user.id,
    fecha_pago: toSafeIsoDate(fechaPago)
  };

  const { error } = await supabase.from('compras_pagos').insert(payload);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function registrarPagoGeneralProveedor(
  proveedorId: string,
  sedeId: string,
  montoTotal: number,
  metodoPago: string,
  referencia?: string,
  bancoOrigen?: string,
  fechaPago?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  let query = supabase.from('compras_facturas')
    .select('id, saldo_pendiente, fecha_emision')
    .eq('proveedor_id', proveedorId)
    .gt('saldo_pendiente', 0)
    .order('fecha_emision', { ascending: true });

  if (sedeId && sedeId !== 'ALL') {
    query = query.eq('sede_id', sedeId);
  }

  const { data: facturas, error } = await query;
  if (error) return { success: false, error: error.message };
  if (!facturas || facturas.length === 0) return { success: false, error: 'El proveedor no tiene facturas pendientes.' };

  let remanente = montoTotal;
  let facturasAbonadas = 0;
  const safeFechaPago = toSafeIsoDate(fechaPago);

  for (const fac of facturas) {
    if (remanente <= 0.001) break;

    const saldo = Number(fac.saldo_pendiente);
    const abono = Math.min(remanente, saldo);
    if (abono <= 0) continue;

    const { error: pErr } = await supabase.from('compras_pagos').insert({
      factura_id: fac.id,
      monto: abono,
      metodo_pago: metodoPago,
      referencia: referencia || null,
      banco_origen: bancoOrigen || null,
      usuario_id: user.id,
      fecha_pago: safeFechaPago
    });

    if (pErr) {
      console.error('Error al registrar abono en cascada:', pErr);
      return { success: false, error: 'Error al aplicar pago: ' + pErr.message };
    }

    remanente -= abono;
    facturasAbonadas++;
  }

  return { success: true, facturasAbonadas, remanenteSobrante: remanente };
}

export async function getHistoricoProveedores(meses: number = 6) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Perfil no encontrado' };

  const { data, error } = await supabase.rpc('get_historico_proveedores', {
    p_empresa_id: profile.empresa_id,
    p_meses: meses
  });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getTodosProveedores() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Perfil no encontrado' };

  const { data, error } = await supabase.from('proveedores')
    .select('id, nombre_comercial, rif_cedula, numero_contacto, ubicacion')
    .eq('empresa_id', profile.empresa_id)
    .eq('estado_activo', true)
    .order('nombre_comercial');

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function crearProveedor(datos: {
  nombre: string;
  rif?: string;
  telefono?: string;
  ubicacion?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Perfil no encontrado' };

  const { data, error } = await supabase.from('proveedores')
    .insert({
      empresa_id: profile.empresa_id,
      nombre_comercial: datos.nombre.trim(),
      rif_cedula: datos.rif?.trim() || null,
      numero_contacto: datos.telefono?.trim() || null,
      ubicacion: datos.ubicacion?.trim() || null,
      estado_activo: true
    })
    .select('id, nombre_comercial, rif_cedula, numero_contacto, ubicacion')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

// Keep backward compat alias
export async function crearProveedorRapido(nombre: string) {
  return crearProveedor({ nombre });
}

export async function crearFacturaProveedor(
  proveedorId: string,
  sedeId: string,
  numeroFactura: string,
  concepto: string,
  total: number,
  fechaEmision: string,
  metodoPago?: string,
  moneda?: string,
  tasa?: number,
  fechaVencimiento?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Perfil no encontrado' };

  // Get proveedor name for display
  const { data: prov } = await supabase.from('proveedores')
    .select('nombre_comercial')
    .eq('id', proveedorId)
    .single();

  const bcv = await getTasaBcvAction();
  const tasaActual = (tasa && tasa > 1) ? tasa : (bcv.tasa || 804.81);
  const monedaFinal = moneda || 'USD';
  const totalUSD = monedaFinal === 'USD' ? total : (total / (tasaActual > 0 ? tasaActual : 1));
  const montoBs = monedaFinal === 'USD' ? (total * tasaActual) : total;

  const isDeuda = !metodoPago || metodoPago.toLowerCase().includes('por pagar');
  const saldoPendiente = isDeuda ? Number(totalUSD.toFixed(2)) : 0;

  let conceptoFinal = concepto || 'Compra registrada manualmente';
  if (monedaFinal === 'VES') {
    conceptoFinal += ` (Bs. ${Number(total).toLocaleString('es-VE', { minimumFractionDigits: 2 })} @ ${tasaActual})`;
  }

  const finalSedeId = (sedeId && sedeId !== 'ALL') ? sedeId : null;

  const safeFechaEmision = toSafeIsoDate(fechaEmision);

  // 1. Insert into compras_facturas (supplier debt tracking)
  const { data: factura, error: facError } = await supabase.from('compras_facturas')
    .insert({
      empresa_id: profile.empresa_id,
      sede_id: finalSedeId,
      proveedor_id: proveedorId,
      numero_factura: numeroFactura || 'S/N',
      concepto: conceptoFinal,
      total: Number(totalUSD.toFixed(2)),
      saldo_pendiente: saldoPendiente,
      fecha_emision: safeFechaEmision,
      fecha_vencimiento: fechaVencimiento ? toSafeIsoDate(fechaVencimiento) : null,
      usuario_id: user.id
    })
    .select('id')
    .single();

  if (facError) return { success: false, error: facError.message };

  if (!isDeuda && factura?.id) {
    await supabase.from('compras_pagos').insert({
      factura_id: factura.id,
      monto: Number(totalUSD.toFixed(2)),
      metodo_pago: metodoPago,
      referencia: 'Pago al contado / registro inicial',
      fecha_pago: safeFechaEmision,
      usuario_id: user.id
    });
  }

  // 2. Also register in compras_puntuales so it shows in Compras history
  await supabase.from('compras_puntuales').insert({
    id_empresa: profile.empresa_id,
    id_sede: finalSedeId,
    proveedor: prov?.nombre_comercial || 'Proveedor',
    monto_divisas: Number(totalUSD.toFixed(2)),
    monto_bs: Number(montoBs.toFixed(2)),
    tasa_cambio: tasaActual,
    fecha_registro: safeFechaEmision,
    detalles: conceptoFinal,
    metodo_pago: metodoPago || 'Por pagar',
    estado: 'PROCESADA',
    usuario_id: user.id
  });

  return { success: true };
}

import { registrarFacturaInsumos } from '@/actions/compras-actions';

export async function crearFacturaProveedorConInsumos(
  proveedorId: string,
  sedeId: string,
  numeroFactura: string,
  concepto: string,
  fechaEmision: string,
  metodoPago: string,
  moneda: 'USD' | 'VES',
  tasa: number,
  fechaVencimiento: string,
  items: any[]
) {
  const supabase = await createClient();
  const { data: prov } = await supabase.from('proveedores').select('nombre_comercial').eq('id', proveedorId).single();
  
  let tasaFinal = tasa;
  if (!tasaFinal || tasaFinal <= 1) {
    const bcv = await getTasaBcvAction();
    tasaFinal = bcv.tasa || 804.81;
  }

  const finalSedeId = (sedeId && sedeId !== 'ALL') ? sedeId : undefined;

  const res = await registrarFacturaInsumos({
    proveedor: prov?.nombre_comercial || 'Proveedor',
    proveedor_id: proveedorId,
    sede_id: finalSedeId,
    moneda,
    tasa: tasaFinal,
    metodo_pago: metodoPago,
    descripcion: concepto,
    numero_factura: numeroFactura,
    fecha_emision: fechaEmision,
    fecha_vencimiento: fechaVencimiento || undefined,
    items
  });

  return res;
}

export async function getFacturaDetallesItems(facturaId: string) {
  const supabase = await createClient();
  const { data: fac } = await supabase.from('compras_facturas')
    .select('proveedor_id, total, fecha_registro, fecha_emision')
    .eq('id', facturaId)
    .single();

  if (!fac) return { success: false, error: 'Factura no encontrada' };

  const { data: prov } = await supabase.from('proveedores')
    .select('nombre_comercial')
    .eq('id', fac.proveedor_id)
    .single();

  const dateStr = fac.fecha_registro || fac.fecha_emision;
  if (!dateStr) return { success: false, error: 'No se puede buscar detalles sin fecha' };

  const baseDate = new Date(dateStr);
  const minDate = new Date(baseDate.getTime() - 60000); // 1 minute before
  const maxDate = new Date(baseDate.getTime() + 60000); // 1 minute after

  const { data: punts } = await supabase.from('compras_puntuales')
    .select('id, detalles, proveedor')
    .eq('monto_divisas', fac.total)
    .gte('fecha_registro', minDate.toISOString())
    .lte('fecha_registro', maxDate.toISOString());

  if (!punts || punts.length === 0) {
    return { success: false, error: 'No hay detalles de items para esta factura.' };
  }

  let match = punts[0];
  if (prov && punts.length > 1) {
    const p = punts.find(x => x.proveedor === prov.nombre_comercial);
    if (p) match = p;
  }

  let parsed = match.detalles;
  if (typeof parsed === 'string' && parsed.startsWith('{')) {
    try {
      parsed = JSON.parse(parsed);
    } catch(e) {}
  }

  if (parsed && parsed.is_insumos && parsed.items) {
    return { success: true, data: parsed, compra_puntual_id: match.id };
  }

  return { success: false, error: 'El detalle no contiene items de insumo.' };
}

export async function editarFacturaProveedor(
  facturaId: string,
  payload: {
    numero_factura: string;
    concepto: string;
    total: number;
    fecha_emision: string;
    fecha_vencimiento?: string;
    sede_id?: string;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: fac } = await supabase.from('compras_facturas')
    .select('*, pagos:compras_pagos(monto)')
    .eq('id', facturaId)
    .single();

  if (!fac) return { success: false, error: 'Factura no encontrada' };

  const sumPagos = fac.pagos ? fac.pagos.reduce((acc: number, p: any) => acc + Number(p.monto), 0) : 0;
  let nuevoSaldo = payload.total - sumPagos;
  if (nuevoSaldo < 0) nuevoSaldo = 0;

  const updateDataFac: any = {
    numero_factura: payload.numero_factura,
    concepto: payload.concepto,
    total: payload.total,
    saldo_pendiente: nuevoSaldo,
    fecha_emision: toSafeIsoDate(payload.fecha_emision),
    fecha_vencimiento: payload.fecha_vencimiento ? toSafeIsoDate(payload.fecha_vencimiento) : null,
    modificado: true,
    usuario_modificacion_id: user.id,
    fecha_modificacion: new Date().toISOString()
  };
  if (payload.sede_id) updateDataFac.sede_id = payload.sede_id;

  const { error } = await supabase.from('compras_facturas').update(updateDataFac).eq('id', facturaId);

  if (error) return { success: false, error: error.message };

  // Intentar actualizar la compra_puntual vinculada y transferir inventario si cambió de sede
  const baseDate = new Date(fac.fecha_registro || fac.fecha_emision);
  const minDate = new Date(baseDate.getTime() - 60000).toISOString();
  const maxDate = new Date(baseDate.getTime() + 60000).toISOString();

  const { data: punts } = await supabase.from('compras_puntuales')
    .select('id, tasa_cambio, detalles, id_sede')
    .eq('monto_divisas', fac.total)
    .gte('fecha_registro', minDate)
    .lte('fecha_registro', maxDate);

  if (punts && punts.length > 0) {
    const matchPunt = punts[0];
    const newBs = payload.total * Number(matchPunt.tasa_cambio);
    const updateDataPunt: any = {
      monto_divisas: payload.total,
      monto_bs: newBs,
      modificado: true,
      usuario_modificacion_id: user.id,
      fecha_modificacion: new Date().toISOString()
    };

    // Si cambió la sede, traspasamos el inventario físico de una sede a la otra
    if (payload.sede_id && payload.sede_id !== fac.sede_id) {
      updateDataPunt.id_sede = payload.sede_id;

      try {
        let detObj: any = null;
        if (typeof matchPunt.detalles === 'string') {
          detObj = JSON.parse(matchPunt.detalles);
        } else if (typeof matchPunt.detalles === 'object') {
          detObj = matchPunt.detalles;
        }

        if (detObj && detObj.is_insumos && Array.isArray(detObj.items)) {
          for (const item of detObj.items) {
            const oldInsumoId = item.insumo_id;
            const cantidad = Number(item.cantidad || 0);

            if (oldInsumoId && cantidad > 0) {
              // 1. Obtener insumo de la sede anterior
              const { data: oldInsumo } = await supabase.from('inventario_insumos')
                .select('*')
                .eq('id', oldInsumoId)
                .single();

              if (oldInsumo) {
                // Descontar de la sede anterior
                const cantAnterior = Number(oldInsumo.cantidad_actual || 0);
                const nuevaCantOld = Math.max(0, cantAnterior - cantidad);
                await supabase.from('inventario_insumos')
                  .update({ cantidad_actual: nuevaCantOld })
                  .eq('id', oldInsumo.id);

                await supabase.from('movimientos_inventario').insert({
                  empresa_id: oldInsumo.empresa_id,
                  insumo_id: oldInsumo.id,
                  usuario_id: user.id,
                  tipo_movimiento: 'SALIDA',
                  motivo: `Corrección de sede en factura: traspaso hacia nueva sede`,
                  cantidad: cantidad,
                  costo_perdido: 0,
                  fecha_movimiento: new Date().toISOString()
                });

                // 2. Buscar o crear el insumo en la nueva sede
                const targetNombre = (oldInsumo.nombre || item.nombre_nuevo || '').trim();
                const { data: targetInsumos } = await supabase.from('inventario_insumos')
                  .select('*')
                  .eq('empresa_id', oldInsumo.empresa_id)
                  .eq('sede_id', payload.sede_id)
                  .ilike('nombre', targetNombre);

                let targetInsumoId = oldInsumo.id;
                if (targetInsumos && targetInsumos.length > 0) {
                  const targetInsumo = targetInsumos[0];
                  targetInsumoId = targetInsumo.id;
                  const nuevaCantTarget = Number(targetInsumo.cantidad_actual || 0) + cantidad;
                  await supabase.from('inventario_insumos')
                    .update({ cantidad_actual: nuevaCantTarget })
                    .eq('id', targetInsumo.id);
                } else {
                  // Crear nuevo insumo en la sede destino
                  const { data: createdInsumo } = await supabase.from('inventario_insumos').insert({
                    empresa_id: oldInsumo.empresa_id,
                    sede_id: payload.sede_id,
                    nombre: oldInsumo.nombre,
                    unidad_medida: oldInsumo.unidad_medida,
                    cantidad_actual: cantidad,
                    costo_promedio: oldInsumo.costo_promedio
                  }).select('id').single();

                  if (createdInsumo?.id) {
                    targetInsumoId = createdInsumo.id;
                  }
                }

                await supabase.from('movimientos_inventario').insert({
                  empresa_id: oldInsumo.empresa_id,
                  insumo_id: targetInsumoId,
                  usuario_id: user.id,
                  tipo_movimiento: 'ENTRADA',
                  motivo: `Corrección de sede en factura: recepción desde sede anterior`,
                  cantidad: cantidad,
                  costo_perdido: 0,
                  fecha_movimiento: new Date().toISOString()
                });

                // Actualizar referencia en los detalles
                item.insumo_id = targetInsumoId;
              }
            }
          }

          updateDataPunt.detalles = JSON.stringify(detObj);
        }
      } catch (err) {
        console.error('Error al transferir inventario por cambio de sede:', err);
      }
    }

    await supabase.from('compras_puntuales').update(updateDataPunt).eq('id', matchPunt.id);
  }

  return { success: true };
}

export async function eliminarFacturaProveedor(facturaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id, rol, permisos').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Perfil no encontrado' };

  const rolProfile = (profile.rol || '').toUpperCase();
  const rolMeta = (user.app_metadata?.user_role || '').toUpperCase();
  const hasPermiso = Array.isArray(profile.permisos) && profile.permisos.includes('eliminar_facturas');
  const isMasterOrAdmin =
    rolProfile === 'MASTER' ||
    rolProfile === 'ADMINISTRADOR' ||
    rolProfile === 'ADMIN' ||
    rolMeta === 'MASTER' ||
    rolMeta === 'ADMINISTRADOR' ||
    rolMeta === 'ADMIN' ||
    hasPermiso;

  if (!isMasterOrAdmin) {
    return { success: false, error: 'No tienes permisos asignados para eliminar facturas de proveedores. Contacta al Master para que te habilite el permiso en Equipo.' };
  }

  const adminClient = createAdminClient();

  const { data: fac, error: facErr } = await adminClient.from('compras_facturas')
    .select('*')
    .eq('id', facturaId)
    .single();

  if (facErr || !fac) return { success: false, error: 'Factura no encontrada' };

  if (fac.empresa_id !== profile.empresa_id) {
    return { success: false, error: 'No autorizado para esta empresa' };
  }

  // 1. Revertir inventario si la factura tenía insumos y eliminar compras_puntuales vinculadas
  const dateStr = fac.fecha_registro || fac.fecha_emision;
  if (dateStr) {
    const baseDate = new Date(dateStr);
    const minDate = new Date(baseDate.getTime() - 120000).toISOString();
    const maxDate = new Date(baseDate.getTime() + 120000).toISOString();

    const { data: punts } = await adminClient.from('compras_puntuales')
      .select('*')
      .eq('id_empresa', profile.empresa_id)
      .eq('monto_divisas', fac.total)
      .gte('fecha_registro', minDate)
      .lte('fecha_registro', maxDate);

    if (punts && punts.length > 0) {
      for (const p of punts) {
        try {
          let detObj: any = null;
          if (typeof p.detalles === 'string') {
            detObj = JSON.parse(p.detalles);
          } else if (typeof p.detalles === 'object') {
            detObj = p.detalles;
          }

          if (detObj && detObj.is_insumos && Array.isArray(detObj.items)) {
            for (const item of detObj.items) {
              const oldInsumoId = item.insumo_id;
              const cantidad = Number(item.cantidad || 0);

              if (oldInsumoId && cantidad > 0) {
                const { data: insumo } = await adminClient.from('inventario_insumos')
                  .select('id, cantidad_actual')
                  .eq('id', oldInsumoId)
                  .single();

                if (insumo) {
                  const newQty = Math.max(0, Number(insumo.cantidad_actual || 0) - cantidad);
                  await adminClient.from('inventario_insumos')
                    .update({ cantidad_actual: newQty })
                    .eq('id', insumo.id);

                  await adminClient.from('movimientos_inventario').insert({
                    empresa_id: profile.empresa_id,
                    insumo_id: insumo.id,
                    usuario_id: user.id,
                    tipo_movimiento: 'SALIDA',
                    motivo: `Eliminación de factura de proveedor (${fac.numero_factura || 'S/N'}): reversión de stock`,
                    cantidad: cantidad,
                    costo_perdido: 0,
                    fecha_movimiento: new Date().toISOString()
                  });
                }
              }
            }
          }
        } catch (e) {
          console.error('Error al revertir inventario al eliminar factura:', e);
        }

        await adminClient.from('compras_puntuales').delete().eq('id', p.id);
      }
    }
  }

  // 2. Eliminar pagos asociados en compras_pagos
  await adminClient.from('compras_pagos').delete().eq('factura_id', facturaId);

  // 3. Eliminar factura en compras_facturas
  const { error: delErr } = await adminClient.from('compras_facturas').delete().eq('id', facturaId);
  if (delErr) {
    console.error('Error al eliminar compras_facturas:', delErr);
    return { success: false, error: delErr.message };
  }

  revalidatePath('/dashboard/proveedores');
  revalidatePath('/dashboard/compras');
  revalidatePath('/dashboard/inventario');

  return { success: true };
}

export async function getHistorialAbonosGlobales(proveedorId: string, sedeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  let query = supabase.from('compras_pagos')
    .select(`
      id,
      monto,
      metodo_pago,
      referencia,
      banco_origen,
      fecha_pago,
      factura_id,
      compras_facturas!inner (
        numero_factura,
        proveedor_id,
        sede_id
      )
    `)
    .eq('compras_facturas.proveedor_id', proveedorId)
    .order('fecha_pago', { ascending: false });

  if (sedeId && sedeId !== 'ALL') {
    query = query.eq('compras_facturas.sede_id', sedeId);
  }

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };

  // Group by (fecha_pago + metodo_pago + referencia)
  const grouped = new Map<string, any>();
  for (const pago of (data || [])) {
    const cf = pago.compras_facturas as any;
    // Creamos una clave unica para agrupar (idealmente los pagos del abono global tienen la misma fecha_pago exacta)
    const ref = pago.referencia || '';
    const dateStr = pago.fecha_pago || '';
    const key = `${dateStr}_${pago.metodo_pago}_${ref}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        fecha_pago: pago.fecha_pago,
        metodo_pago: pago.metodo_pago,
        referencia: pago.referencia,
        banco_origen: pago.banco_origen,
        monto_total: 0,
        cantidad_facturas: 0,
        facturas_afectadas: []
      });
    }

    const group = grouped.get(key);
    group.monto_total += Number(pago.monto);
    group.cantidad_facturas += 1;
    group.facturas_afectadas.push({
      factura_id: pago.factura_id,
      numero_factura: cf.numero_factura,
      monto_aplicado: pago.monto
    });
  }

  const result = Array.from(grouped.values());
  // Sort descending by fecha_pago again just in case
  result.sort((a, b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime());

  return { success: true, data: result };
}
