'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getTasaBcvAction } from '@/actions/config-actions';
import { toSafeIsoDate } from '@/utils/date-utils';
import { revalidatePath } from 'next/cache';

export type TipoProveedorFiltro = 'TODOS' | 'PROVEEDORES' | 'TIENDAS';

export async function getProveedoresConDeuda(sedeId: string, page: number = 1, limit: number = 20, searchQuery: string = '', tipo: TipoProveedorFiltro = 'TODOS') {
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

  // Filtro Tiendas / Proveedores: el RPC no devuelve es_tienda, así que buscamos los IDs de las
  // tiendas y filtramos sobre el resultado del RPC. Se hace en el servidor (no en el navegador)
  // para que la paginación y el totalCount sean correctos.
  if (tipo !== 'TODOS') {
    const { data: tiendas, error: tErr } = await supabase.from('proveedores')
      .select('id')
      .eq('empresa_id', profile.empresa_id)
      .eq('es_tienda', true);
    if (tErr) return { success: false, error: tErr.message };
    const ids = (tiendas || []).map(t => t.id);

    if (tipo === 'TIENDAS') {
      if (ids.length === 0) return { success: true, data: [], totalCount: 0 };
      query = query.in('id_proveedor', ids);
    } else if (ids.length > 0) {
      query = query.not('id_proveedor', 'in', `(${ids.join(',')})`);
    }
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
    .select('id, sede_id, numero_factura, concepto, total, saldo_pendiente, fecha_emision, fecha_vencimiento, modificado, usuario_modificacion_id, pagos:compras_pagos(id, monto, metodo_pago, referencia, banco_origen, fecha_pago, usuario_id)')
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
    modificado_por: d.modificado ? (userMap[d.usuario_modificacion_id] || 'Usuario Desconocido') : null,
    // Responsable de cada abono: compras_pagos.usuario_id se resuelve al nombre del perfil
    pagos: Array.isArray(d.pagos)
      ? d.pagos.map((p: any) => ({
          ...p,
          registrado_por: p.usuario_id ? (userMap[p.usuario_id] || 'Usuario Desconocido') : null
        }))
      : []
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
    .select('id, nombre_comercial, rif_cedula, numero_contacto, ubicacion, es_tienda')
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
  es_tienda?: boolean;
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
      // es_tienda = compra directa en tienda/comercio (no proveedor habitual); sirve para reportes
      es_tienda: datos.es_tienda === true,
      estado_activo: true
    })
    .select('id, nombre_comercial, rif_cedula, numero_contacto, ubicacion, es_tienda')
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
  fechaVencimiento?: string,
  montoAbonado?: number
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
  const totalInvoice = Number(totalUSD.toFixed(2));
  
  let pagoFinal = isDeuda ? 0 : totalInvoice;
  if (typeof montoAbonado === 'number') {
    pagoFinal = montoAbonado;
  }
  pagoFinal = Math.min(Math.max(pagoFinal, 0), totalInvoice);
  
  const saldoPendiente = Number((totalInvoice - pagoFinal).toFixed(2));

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

  if (pagoFinal > 0 && factura?.id) {
    await supabase.from('compras_pagos').insert({
      factura_id: factura.id,
      monto: Number(pagoFinal.toFixed(2)),
      metodo_pago: metodoPago === 'Por pagar' ? 'Efectivo' : metodoPago,
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
  items: any[],
  descuento: number = 0,
  iva: number = 0,
  montoAbonado?: number
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
    items,
    monto_abonado: montoAbonado
  });

  return res;
}

/**
 * Busca la compra_puntual (detalle de ítems/inventario) vinculada a una factura de proveedor.
 *
 * No existe una FK entre compras_facturas y compras_puntuales, así que el vínculo se infiere.
 * Antes se usaban ventanas de tiempo distintas en cada función (±1 min, ±2 min, ±24 h) y casi
 * nunca coincidían: compras_puntuales.fecha_registro se guarda con la fecha de emisión elegida
 * por el usuario, mientras que compras_facturas.fecha_registro es la fecha real de carga
 * (diferencias de días o incluso años). Por eso aquí se filtra por:
 *   empresa + monto exacto + nombre del proveedor (sin distinguir mayúsculas/espacios)
 * y, si hay varias candidatas, se elige la más cercana a la fecha de emisión de la factura.
 * Si el proveedor no coincide, NO se devuelve nada (es preferible no vincular a vincular mal).
 */
async function buscarCompraPuntualVinculada(
  client: any,
  fac: { empresa_id: string; proveedor_id: string | null; total: number | string; fecha_emision?: string | null; fecha_registro?: string | null },
  columnas: string
): Promise<any | null> {
  if (!fac.proveedor_id) return null;

  const { data: prov } = await client.from('proveedores')
    .select('nombre_comercial')
    .eq('id', fac.proveedor_id)
    .single();
  const nombreProv = String(prov?.nombre_comercial || '').trim().toLowerCase();
  if (!nombreProv) return null;

  const { data: punts } = await client.from('compras_puntuales')
    .select(`${columnas}, proveedor, fecha_registro`)
    .eq('id_empresa', fac.empresa_id)
    .eq('monto_divisas', fac.total);

  const candidatos = (punts || []).filter(
    (p: any) => String(p.proveedor || '').trim().toLowerCase() === nombreProv
  );
  if (candidatos.length === 0) return null;

  const ref = new Date(fac.fecha_emision || fac.fecha_registro || Date.now()).getTime();
  candidatos.sort((a: any, b: any) =>
    Math.abs(new Date(a.fecha_registro).getTime() - ref) - Math.abs(new Date(b.fecha_registro).getTime() - ref)
  );
  return candidatos[0];
}

export async function getFacturaDetallesItems(facturaId: string) {
  const supabase = await createClient();
  const { data: fac } = await supabase.from('compras_facturas')
    .select('empresa_id, proveedor_id, total, fecha_registro, fecha_emision')
    .eq('id', facturaId)
    .single();

  if (!fac) return { success: false, error: 'Factura no encontrada' };

  const match = await buscarCompraPuntualVinculada(supabase, fac, 'id, detalles, tasa_cambio');
  if (!match) {
    return { success: false, error: 'No hay detalles de items para esta factura.' };
  }

  // detalles es TEXT con JSON adentro: parseo defensivo
  let parsed: any = match.detalles;
  if (typeof parsed === 'string' && parsed.trim().startsWith('{')) {
    try {
      parsed = JSON.parse(parsed);
    } catch (e) {
      parsed = null;
    }
  }

  if (parsed && parsed.is_insumos && Array.isArray(parsed.items)) {
    return { success: true, data: parsed, compra_puntual_id: match.id, tasa_cambio: Number(match.tasa_cambio) || 0 };
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
    estado_pago: nuevoSaldo > 0 ? 2 : 1, // 1 = Pagado, 2 = Pendiente (convención del proyecto)
    fecha_emision: toSafeIsoDate(payload.fecha_emision),
    fecha_vencimiento: payload.fecha_vencimiento ? toSafeIsoDate(payload.fecha_vencimiento) : null,
    modificado: true,
    usuario_modificacion_id: user.id,
    fecha_modificacion: new Date().toISOString()
  };
  if (payload.sede_id) updateDataFac.sede_id = payload.sede_id;

  const { error } = await supabase.from('compras_facturas').update(updateDataFac).eq('id', facturaId);

  if (error) return { success: false, error: error.message };

  // Intentar actualizar la compra_puntual vinculada y transferir inventario si cambió de sede.
  // Se usa la misma búsqueda que en getFacturaDetallesItems/eliminarFacturaProveedor (ver helper).
  const matchPunt = await buscarCompraPuntualVinculada(supabase, fac, 'id, tasa_cambio, detalles, id_sede');

  if (matchPunt) {
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

  // 1. Revertir inventario si la factura tenía insumos y eliminar la compra_puntual vinculada.
  // Se usa el helper compartido (empresa + proveedor + monto). Antes se usaba ±2 min y se borraban
  // TODAS las compras con ese monto, lo que podía afectar compras de otro proveedor.
  if (fac.proveedor_id) {
    const vinculada = await buscarCompraPuntualVinculada(adminClient, fac, 'id, detalles');
    const punts: any[] = vinculada ? [vinculada] : [];

    if (punts.length > 0) {
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

  // 1b. Revertir inventario si la factura tenía productos terminados/mercancía (compras_mercancia)
  if (fac.numero_factura && fac.proveedor_id) {
    try {
      const { data: mercs } = await adminClient.from('compras_mercancia')
        .select('*')
        .eq('id_empresa', profile.empresa_id)
        .eq('nro_factura', fac.numero_factura)
        .eq('id_proveedor', fac.proveedor_id);

      if (mercs && mercs.length > 0) {
        for (const m of mercs) {
          if (m.id_producto && Number(m.cantidad) > 0) {
            const { data: prod } = await adminClient.from('productos')
              .select('id, stock_actual')
              .eq('id', m.id_producto)
              .single();

            if (prod) {
              const newStock = Math.max(0, Number(prod.stock_actual || 0) - Number(m.cantidad));
              await adminClient.from('productos')
                .update({ stock_actual: newStock })
                .eq('id', prod.id);

              await adminClient.from('movimientos_inventario').insert({
                empresa_id: profile.empresa_id,
                producto_id: prod.id,
                usuario_id: user.id,
                tipo_movimiento: 'SALIDA',
                motivo: `Eliminación de factura (${fac.numero_factura}): reversión de mercancía`,
                cantidad: Number(m.cantidad),
                costo_perdido: 0,
                fecha_movimiento: new Date().toISOString()
              });
            }
          }
        }
        await adminClient.from('compras_mercancia')
          .delete()
          .eq('id_empresa', profile.empresa_id)
          .eq('nro_factura', fac.numero_factura)
          .eq('id_proveedor', fac.proveedor_id);
      }
    } catch (e) {
      console.error('Error al revertir mercancía al eliminar factura:', e);
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
      usuario_id,
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

  // Mapa usuario_id -> nombre para mostrar quién registró cada abono
  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  const userMap: Record<string, string> = {};
  if (profile) {
    const { data: perfiles } = await supabase.from('perfiles')
      .select('id, nombre_completo')
      .eq('empresa_id', profile.empresa_id);
    (perfiles || []).forEach(p => { userMap[p.id] = p.nombre_completo; });
  }

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
        facturas_afectadas: [],
        registrado_por: pago.usuario_id ? (userMap[pago.usuario_id] || 'Usuario Desconocido') : null
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

export async function eliminarProveedor(proveedorId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  // Verificar si tiene facturas (para no romper integridad referencial)
  const { count } = await supabase.from('compras_facturas')
    .select('*', { count: 'exact', head: true })
    .eq('proveedor_id', proveedorId);

  if (count && count > 0) {
    // Soft delete if has invoices
    const { error } = await supabase.from('proveedores')
      .update({ estado_activo: false })
      .eq('id', proveedorId);
    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Proveedor desactivado (tiene facturas)' };
  } else {
    // Hard delete if no invoices
    const { error } = await supabase.from('proveedores')
      .delete()
      .eq('id', proveedorId);
    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Proveedor eliminado permanentemente' };
  }
}

/**
 * Recalcula saldo_pendiente y estado_pago de una factura de proveedor a partir de la suma real
 * de sus pagos. Es idempotente (no depende de triggers), por lo que es seguro llamarlo después
 * de editar o eliminar un abono. Convención del proyecto: estado_pago 1 = Pagado, 2 = Pendiente.
 */
async function recalcularSaldoFacturaProveedor(client: any, facturaId: string) {
  const { data: factura, error } = await client.from('compras_facturas')
    .select('id, total, pagos:compras_pagos(monto)')
    .eq('id', facturaId)
    .single();
  if (error || !factura) return { success: false, error: error?.message || 'Factura no encontrada' };

  const sumPagos = Array.isArray(factura.pagos)
    ? factura.pagos.reduce((acc: number, p: any) => acc + (Number(p.monto) || 0), 0)
    : 0;
  const nuevoSaldo = Math.max(0, Number((Number(factura.total) - sumPagos).toFixed(2)));

  const { error: updErr } = await client.from('compras_facturas')
    .update({ saldo_pendiente: nuevoSaldo, estado_pago: nuevoSaldo > 0 ? 2 : 1 })
    .eq('id', factura.id);
  if (updErr) return { success: false, error: updErr.message };

  return { success: true, saldo_pendiente: nuevoSaldo };
}

/**
 * Obtiene un pago junto con su factura y verifica que pertenezca a la empresa del usuario.
 * compras_pagos no tiene empresa_id, así que la pertenencia se valida a través de la factura.
 */
async function obtenerPagoDeMiEmpresa(supabase: any, userId: string, pagoId: string) {
  const { data: profile } = await supabase.from('perfiles')
    .select('empresa_id, rol, permisos')
    .eq('id', userId)
    .single();
  if (!profile) return { error: 'Perfil no encontrado' as string };

  const { data: pago, error } = await supabase.from('compras_pagos')
    .select('id, factura_id, monto, compras_facturas!inner(id, empresa_id, total)')
    .eq('id', pagoId)
    .single();
  if (error || !pago) return { error: 'Pago no encontrado' as string };

  const fac = pago.compras_facturas as any;
  if (!fac || fac.empresa_id !== profile.empresa_id) return { error: 'No autorizado para esta empresa' as string };

  return { profile, pago, factura: fac };
}

export async function editarAbonoProveedor(
  pagoId: string,
  nuevoMonto: number,
  metodoPago: string,
  referencia: string,
  bancoOrigen: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const monto = Number(nuevoMonto);
  if (!Number.isFinite(monto) || monto <= 0) return { success: false, error: 'Monto inválido' };
  if (!metodoPago || !metodoPago.trim()) return { success: false, error: 'Selecciona un método de pago' };

  const ctx = await obtenerPagoDeMiEmpresa(supabase, user.id, pagoId);
  if ('error' in ctx) return { success: false, error: ctx.error };

  // Evitar que la suma de abonos supere el total de la factura (tolerancia de 1 centavo por redondeo)
  const { data: otros } = await supabase.from('compras_pagos')
    .select('id, monto')
    .eq('factura_id', ctx.pago.factura_id)
    .neq('id', pagoId);
  const sumaOtros = (otros || []).reduce((acc: number, p: any) => acc + (Number(p.monto) || 0), 0);
  const maximo = Number((Number(ctx.factura.total) - sumaOtros).toFixed(2));
  if (monto > maximo + 0.01) {
    return { success: false, error: `El abono no puede superar el saldo de la factura (máximo $${maximo.toFixed(2)})` };
  }

  const { error: updErr } = await supabase.from('compras_pagos')
    .update({
      monto: Number(monto.toFixed(2)),
      metodo_pago: metodoPago.trim(),
      referencia: referencia?.trim() || null,
      banco_origen: bancoOrigen?.trim() || null
    })
    .eq('id', pagoId);
  if (updErr) return { success: false, error: updErr.message };

  // Si el monto baja, la factura vuelve a quedar pendiente por pagar
  const rec = await recalcularSaldoFacturaProveedor(supabase, ctx.pago.factura_id);
  if (!rec.success) return { success: false, error: rec.error };

  revalidatePath('/dashboard/proveedores');
  return { success: true, saldo_pendiente: rec.saldo_pendiente };
}

export async function eliminarAbonoProveedor(pagoId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const ctx = await obtenerPagoDeMiEmpresa(supabase, user.id, pagoId);
  if ('error' in ctx) return { success: false, error: ctx.error };

  // Mismo criterio de permisos que eliminarFacturaProveedor: borrar dinero registrado es sensible
  const rolProfile = (ctx.profile.rol || '').toUpperCase();
  const rolMeta = (user.app_metadata?.user_role || '').toUpperCase();
  const hasPermiso = Array.isArray(ctx.profile.permisos) && ctx.profile.permisos.includes('eliminar_facturas');
  const autorizado = ['MASTER', 'ADMINISTRADOR', 'ADMIN'].includes(rolProfile)
    || ['MASTER', 'ADMINISTRADOR', 'ADMIN'].includes(rolMeta)
    || hasPermiso;
  if (!autorizado) {
    return { success: false, error: 'No tienes permisos para eliminar abonos. Contacta al Master para que te habilite el permiso en Equipo.' };
  }

  const { error: delErr } = await supabase.from('compras_pagos').delete().eq('id', pagoId);
  if (delErr) return { success: false, error: delErr.message };

  const rec = await recalcularSaldoFacturaProveedor(supabase, ctx.pago.factura_id);
  if (!rec.success) return { success: false, error: rec.error };

  revalidatePath('/dashboard/proveedores');
  return { success: true, saldo_pendiente: rec.saldo_pendiente };
}

export async function editarProveedor(
  proveedorId: string,
  datos: { nombre: string; rif?: string; telefono?: string; ubicacion?: string; es_tienda?: boolean }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Perfil no encontrado' };

  const nombre = (datos.nombre || '').trim();
  if (!nombre) return { success: false, error: 'El nombre es obligatorio' };

  const updateData: Record<string, any> = {
    nombre_comercial: nombre,
    rif_cedula: datos.rif?.trim() || null,
    numero_contacto: datos.telefono?.trim() || null,
    ubicacion: datos.ubicacion?.trim() || null
  };
  if (typeof datos.es_tienda === 'boolean') updateData.es_tienda = datos.es_tienda;

  // Leemos el nombre anterior para mantener sincronizado compras_puntuales.proveedor (texto libre).
  // El vínculo factura <-> detalle de ítems depende de ese nombre (ver buscarCompraPuntualVinculada).
  const { data: anterior } = await supabase.from('proveedores')
    .select('id, nombre_comercial')
    .eq('id', proveedorId)
    .eq('empresa_id', profile.empresa_id)
    .single();
  if (!anterior) return { success: false, error: 'Proveedor no encontrado' };

  const { data, error } = await supabase.from('proveedores')
    .update(updateData)
    .eq('id', proveedorId)
    .eq('empresa_id', profile.empresa_id)
    .select('id, nombre_comercial, rif_cedula, numero_contacto, ubicacion, es_tienda')
    .single();
  if (error) return { success: false, error: error.message };

  if (anterior.nombre_comercial !== nombre) {
    await supabase.from('compras_puntuales')
      .update({ proveedor: nombre })
      .eq('id_empresa', profile.empresa_id)
      .eq('proveedor', anterior.nombre_comercial);
  }

  revalidatePath('/dashboard/proveedores');
  revalidatePath('/dashboard/compras');
  return { success: true, data };
}
