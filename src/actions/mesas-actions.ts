'use server';

import { createClient } from '@/utils/supabase/server';

export interface TerminalInfo {
  sedeId: string;
  sedeNombre: string;
  empresaId: string;
  terminalCode: string;
  tasa?: number;
}

export interface ItemComanda {
  producto_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  comentario: string;
}

export interface ComandaPayload {
  terminalCode: string;
  tipo: 'comanda' | 'alerta_pago';
  mesaIdentificador: string;
  clienteNombre?: string;
  clienteCedula?: string;
  clienteTelefono?: string;
  clienteId?: string;
  comentarioGeneral?: string;
  metodoPagoSugerido?: string;
  montoPropina?: number;
  numeroCopias?: number;
  items: ItemComanda[];
}

async function obtenerEmpresaIdMesero(supabase: any, user: any): Promise<string | null> {
  if (user?.app_metadata?.empresa_id) return user.app_metadata.empresa_id;
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .maybeSingle();
  return perfil?.empresa_id || null;
}

export async function obtenerTasaMesa(sedeId: string): Promise<number> {
  try {
    const supabase = await createClient();

    // 1. Verificar si el POS sincronizó cuentas abiertas con tasa_efectiva
    const { data: posRow } = await supabase
      .from('pos_cuentas_abiertas')
      .select('detalles')
      .eq('sede_id', sedeId)
      .order('actualizado_en', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (posRow?.detalles && Array.isArray(posRow.detalles) && posRow.detalles.length > 0) {
      const tasaEnDetalle = Number(posRow.detalles[0]?.tasa_efectiva);
      if (tasaEnDetalle > 0) {
        return tasaEnDetalle;
      }
    }

    // 2. Verificar si la sede tiene la tasa reportada en sistema_pos
    const { data: sede } = await supabase
      .from('sedes')
      .select('sistema_pos')
      .eq('id', sedeId)
      .maybeSingle();

    if (sede?.sistema_pos) {
      const match = sede.sistema_pos.match(/TASA:([0-9.]+)/);
      if (match && parseFloat(match[1]) > 0) {
        return parseFloat(match[1]);
      }
    }

    // 3. Fallback a la tasa activa oficial del sistema / empresa
    const { getTasaBcvAction } = await import('@/actions/config-actions');
    const tasaRes = await getTasaBcvAction();
    return Number(tasaRes.tasa) || 1;
  } catch (err) {
    console.error('Error en obtenerTasaMesa:', err);
    return 1;
  }
}

export async function buscarTerminalPorCodigo(codigo: string): Promise<TerminalInfo | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const empresaId = await obtenerEmpresaIdMesero(supabase, user);
  if (!empresaId) return null;

  const codigoNorm = codigo.trim().toUpperCase();

  const { data: sede, error } = await supabase
    .from('sedes')
    .select('id, nombre_sede, empresa_id, codigo_terminal, sistema_pos')
    .eq('codigo_terminal', codigoNorm)
    .eq('empresa_id', empresaId)
    .eq('estado_activo', true)
    .maybeSingle();

  if (error || !sede) return null;

  let tasaSede = 0;
  if (sede.sistema_pos) {
    const match = sede.sistema_pos.match(/TASA:([0-9.]+)/);
    if (match) tasaSede = parseFloat(match[1]);
  }
  if (!tasaSede || tasaSede <= 0) {
    tasaSede = await obtenerTasaMesa(sede.id);
  }

  return {
    sedeId: sede.id,
    sedeNombre: sede.nombre_sede,
    empresaId: sede.empresa_id,
    terminalCode: sede.codigo_terminal,
    tasa: tasaSede,
  };
}

export async function obtenerCatalogoMesa(sedeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const empresaId = await obtenerEmpresaIdMesero(supabase, user);
  if (!empresaId) return [];

  let query = supabase
    .from('productos')
    .select('id, id_pos, nombre, precio_venta, sede_id, notas_preparacion, categorias(nombre)')
    .eq('empresa_id', empresaId)
    .eq('estado_activo', true)
    .or('archivado.is.null,archivado.eq.false');

  if (sedeId) {
    query = query.or(`sede_id.eq.${sedeId},sede_id.is.null`);
  }

  const { data: productos, error } = await query.order('nombre').limit(3000);

  if (error) {
    console.error('Error en obtenerCatalogoMesa:', error);
    return [];
  }

  return productos || [];
}

export async function enviarComanda(payload: ComandaPayload): Promise<{ success: boolean; error?: string; id?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const empresaId = await obtenerEmpresaIdMesero(supabase, user);
  if (!empresaId) return { success: false, error: 'Empresa no encontrada' };

  const meseroNombre = user.user_metadata?.nombre_completo ||
    user.user_metadata?.full_name ||
    user.email ||
    'Mesero';

  const { data: sede } = await supabase
    .from('sedes')
    .select('id')
    .eq('codigo_terminal', payload.terminalCode.trim().toUpperCase())
    .eq('empresa_id', empresaId)
    .maybeSingle();

  if (!sede) return { success: false, error: 'Terminal no encontrado o no pertenece a tu empresa' };

  let comentarioFinal = (payload.comentarioGeneral || '').trim();
  if (payload.numeroCopias && payload.numeroCopias === 2) {
    comentarioFinal = (comentarioFinal ? comentarioFinal + ' ' : '') + '[COPIAS:2]';
  } else if (payload.numeroCopias && payload.numeroCopias === 1) {
    comentarioFinal = (comentarioFinal ? comentarioFinal + ' ' : '') + '[COPIAS:1]';
  }

  // 1. Extraer y sanear datos del cliente
  let nombreSolo = (payload.clienteNombre || '').trim();
  let cedulaLimpia = (payload.clienteCedula || '').trim();
  let telefonoLimpio = (payload.clienteTelefono || '').trim();

  if (nombreSolo.includes(' - CI/NIT: ')) {
    const idx = nombreSolo.indexOf(' - CI/NIT: ');
    const rest = nombreSolo.substring(idx + ' - CI/NIT: '.length);
    nombreSolo = nombreSolo.substring(0, idx).trim();
    if (rest.includes(' - Tel: ')) {
      const tidx = rest.indexOf(' - Tel: ');
      if (!cedulaLimpia) cedulaLimpia = rest.substring(0, tidx).trim();
      if (!telefonoLimpio) telefonoLimpio = rest.substring(tidx + ' - Tel: '.length).trim();
    } else {
      if (!cedulaLimpia) cedulaLimpia = rest.trim();
    }
  }

  // 2. Auto-registrar o vincular cliente en tabla 'clientes' de Supabase
  let finalClienteId = payload.clienteId || null;
  const { createAdminClient } = await import('@/utils/supabase/admin');
  const admin = createAdminClient();

  if (cedulaLimpia) {
    const soloNumeros = cedulaLimpia.replace(/[^0-9]/g, '');
    let queryCed = admin
      .from('clientes')
      .select('id, nombre, telefono, rif_cedula')
      .eq('empresa_id', empresaId);

    if (soloNumeros.length >= 4) {
      queryCed = queryCed.or(`rif_cedula.eq.${cedulaLimpia},rif_cedula.ilike.%${soloNumeros}%`);
    } else {
      queryCed = queryCed.eq('rif_cedula', cedulaLimpia);
    }

    const { data: existingClient } = await queryCed.limit(1).maybeSingle();

    if (existingClient) {
      finalClienteId = existingClient.id;
      if (telefonoLimpio && !existingClient.telefono) {
        await admin
          .from('clientes')
          .update({ telefono: telefonoLimpio, updated_at: new Date().toISOString() })
          .eq('id', existingClient.id);
      }
    } else if (nombreSolo) {
      const clientPosId = `MESERO_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const { data: newClient, error: errNewCli } = await admin
        .from('clientes')
        .insert({
          empresa_id: empresaId,
          id_pos: clientPosId,
          nombre: nombreSolo,
          rif_cedula: cedulaLimpia,
          telefono: telefonoLimpio || null,
          estado_activo: true,
        })
        .select('id')
        .maybeSingle();

      if (newClient) {
        finalClienteId = newClient.id;
      }
      if (errNewCli) {
        console.warn('[enviarComanda] No se pudo registrar cliente en clientes:', errNewCli.message);
      }
    }
  }

  let clienteNombreComanda = nombreSolo;
  if (cedulaLimpia) clienteNombreComanda += ` - CI/NIT: ${cedulaLimpia}`;
  if (telefonoLimpio) clienteNombreComanda += ` - Tel: ${telefonoLimpio}`;

  const { data, error } = await supabase
    .from('comandas_mesero')
    .insert({
      empresa_id: empresaId,
      sede_id: sede.id,
      mesero_id: user.id,
      mesero_nombre: meseroNombre,
      tipo: payload.tipo,
      mesa_identificador: payload.mesaIdentificador,
      cliente_nombre: clienteNombreComanda || null,
      comentario_general: comentarioFinal || null,
      metodo_pago_sugerido: payload.metodoPagoSugerido || null,
      propina: payload.montoPropina || 0,
      items: payload.items,
      estado: 'pendiente',
    })
    .select('id')
    .maybeSingle();

  if (error || !data) return { success: false, error: error?.message || 'Error al guardar comanda' };
  return { success: true, id: data.id };
}

export async function obtenerMesasAbiertas(sedeId: string) {
  if (!sedeId) return [];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { createAdminClient } = await import('@/utils/supabase/admin');
  const admin = createAdminClient();

  // 1. Obtener cuentas abiertas en vivo sincronizadas por el POS (máximo últimas 16 horas para descartar sesiones viejas cerradas)
  const shiftCutoff = new Date(Date.now() - 16 * 3600 * 1000).toISOString();
  const { data: posCuentas } = await admin
    .from('pos_cuentas_abiertas')
    .select('id, numero_documento, nombre_cuenta, total, fecha_apertura, actualizado_en, detalles')
    .eq('sede_id', sedeId)
    .gte('actualizado_en', shiftCutoff)
    .order('actualizado_en', { ascending: false });

  // 2. Obtener comandas enviadas por meseros que todavía están en tránsito al POS (estado 'pendiente' estrictamente en los últimos 30 minutos)
  // NOTA CRÍTICA:
  // Si la comanda ya está en 'recibido', el POS ya la procesó y la cuenta vive en 'pos_cuentas_abiertas'.
  // Si no está en 'pos_cuentas_abiertas' y ya fue recibida, significa que fue cobrada, cancelada o borrada en el POS.
  // ¡NUNCA incluir 'recibido' aquí, de lo contrario resucita mesas ya borradas del POS!
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: comandasPendientes } = await admin
    .from('comandas_mesero')
    .select('id, mesa_identificador, mesero_nombre, cliente_nombre, comentario_general, items, tipo, estado, created_at, metodo_pago_sugerido')
    .eq('sede_id', sedeId)
    .eq('estado', 'pendiente')
    .eq('tipo', 'comanda')
    .gte('created_at', thirtyMinutesAgo)
    .order('created_at', { ascending: false });

  const baseTasa = await obtenerTasaMesa(sedeId);
  const listaMesas: any[] = [];

  // Formatear cuentas abiertas del POS
  if (posCuentas && posCuentas.length > 0) {
    for (const c of posCuentas) {
      const items = Array.isArray(c.detalles) ? c.detalles : [];
      const mesero = items[0]?.mesero_nombre || '';
      const tasaMesa = Number(items[0]?.tasa_efectiva) || baseTasa;
      const totalUSD = Number(c.total) || 0;
      const totalBs = Math.round(totalUSD * tasaMesa * 100) / 100;
      const nombreCuenta = String(c.nombre_cuenta || c.numero_documento || 'Mesa').trim();
      let clienteExtraido = '';
      if (nombreCuenta.includes(' - ')) {
        clienteExtraido = nombreCuenta.split(' - ').slice(1).join(' - ').trim();
      }
      listaMesas.push({
        id: c.id,
        mesa_identificador: nombreCuenta,
        numero_documento: c.numero_documento || '',
        mesero_nombre: mesero,
        cliente_nombre: clienteExtraido,
        items: items,
        tipo: 'comanda',
        estado: 'recibido',
        total: totalUSD,
        total_bs: totalBs,
        tasa_efectiva: tasaMesa,
        created_at: c.fecha_apertura || c.actualizado_en || new Date().toISOString(),
        actualizado_en: c.actualizado_en || c.fecha_apertura || new Date().toISOString(),
        metodo_pago_sugerido: null,
      });
    }
  }

  // Anexar comandas pendientes que aún no hayan sido asimiladas en pos_cuentas_abiertas (ignorando cancelaciones)
  if (comandasPendientes && comandasPendientes.length > 0) {
    for (const cp of comandasPendientes) {
      if (String(cp.comentario_general || '').includes('[CANCELACION]')) {
        continue;
      }
      const cpClean = String(cp.mesa_identificador || '').trim().replace(/^mesa\s+/i, '').toLowerCase();
      const yaExisteEnPOS = listaMesas.some(m => {
        const mStr = String(m.mesa_identificador || '').trim().toLowerCase();
        const mSinPref = mStr.replace(/^mesa\s+/i, '');
        const mBase = mSinPref.split(' - ')[0].trim();
        return (
          mStr === cpClean ||
          mSinPref === cpClean ||
          mBase === cpClean
        );
      });
      if (!yaExisteEnPOS) {
        const totalUSD = Array.isArray(cp.items) ? cp.items.reduce((acc: number, it: any) => acc + (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0), 0) : 0;
        const totalBs = Math.round(totalUSD * baseTasa * 100) / 100;
        listaMesas.push({
          id: cp.id,
          mesa_identificador: cp.mesa_identificador,
          mesero_nombre: cp.mesero_nombre,
          cliente_nombre: cp.cliente_nombre,
          items: cp.items,
          tipo: cp.tipo,
          estado: 'pendiente',
          total: totalUSD,
          total_bs: totalBs,
          tasa_efectiva: baseTasa,
          created_at: cp.created_at,
          actualizado_en: cp.created_at,
          metodo_pago_sugerido: cp.metodo_pago_sugerido,
        });
      }
    }
  }

  return listaMesas;
}


export interface ClienteSugeridoMesa {
  id: string;
  nombre: string;
  rif_cedula: string;
  telefono: string;
}


export async function buscarClientesMesa(query: string): Promise<ClienteSugeridoMesa[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const empresaId = await obtenerEmpresaIdMesero(supabase, user);
  if (!empresaId) return [];

  const raw = query.trim().replace(/[,()]/g, '');
  if (raw.length < 2) return [];

  const { createAdminClient } = await import('@/utils/supabase/admin');
  const admin = createAdminClient();

  const soloNumeros = raw.replace(/[^0-9]/g, '');
  const sinPrefijo = raw.replace(/^[VEJGvejg][-]?/, '').replace(/\./g, '');

  const orClauses: string[] = [
    `nombre.ilike.%${raw}%`,
    `rif_cedula.ilike.%${raw}%`
  ];
  if (soloNumeros.length >= 3 && soloNumeros !== raw) {
    orClauses.push(`rif_cedula.ilike.%${soloNumeros}%`);
  }
  if (sinPrefijo.length >= 3 && sinPrefijo !== raw && sinPrefijo !== soloNumeros) {
    orClauses.push(`rif_cedula.ilike.%${sinPrefijo}%`);
  }

  const { data, error } = await admin
    .from('clientes')
    .select('id, nombre, rif_cedula, telefono')
    .eq('empresa_id', empresaId)
    .or(orClauses.join(','))
    .order('nombre')
    .limit(15);

  if (error || !data) return [];

  const vistos = new Set<string>();
  const unicos: ClienteSugeridoMesa[] = [];
  for (const c of data) {
    const key = `${(c.nombre || '').trim().toUpperCase()}|${(c.rif_cedula || '').trim().toUpperCase()}`;
    if (!vistos.has(key)) {
      vistos.add(key);
      unicos.push({
        id: c.id,
        nombre: c.nombre || '',
        rif_cedula: c.rif_cedula || '',
        telefono: c.telefono || '',
      });
    }
    if (unicos.length >= 8) break;
  }

  return unicos;
}

export async function buscarClientePorCedula(cedula: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const empresaId = await obtenerEmpresaIdMesero(supabase, user);
  if (!empresaId) return null;

  const clean = cedula.trim().replace(/[,()]/g, '');
  if (!clean) return null;

  const { createAdminClient } = await import('@/utils/supabase/admin');
  const admin = createAdminClient();

  const soloNumeros = clean.replace(/[^0-9]/g, '');
  const sinPrefijo = clean.replace(/^[VEJGvejg][-]?/, '').replace(/\./g, '');

  const orClauses = [`rif_cedula.ilike.%${clean}%`];
  if (soloNumeros.length >= 3 && soloNumeros !== clean) {
    orClauses.push(`rif_cedula.ilike.%${soloNumeros}%`);
  }
  if (sinPrefijo.length >= 3 && sinPrefijo !== clean && sinPrefijo !== soloNumeros) {
    orClauses.push(`rif_cedula.ilike.%${sinPrefijo}%`);
  }

  const { data } = await admin
    .from('clientes')
    .select('id, nombre, rif_cedula, telefono')
    .eq('empresa_id', empresaId)
    .or(orClauses.join(','))
    .limit(5);

  if (!data || data.length === 0) return null;

  const exacto = data.find(
    (c: any) => {
      const dbRif = (c.rif_cedula || '').trim().toLowerCase();
      const dbSoloNum = dbRif.replace(/[^0-9]/g, '');
      return (
        dbRif === clean.toLowerCase() ||
        (soloNumeros && dbSoloNum === soloNumeros) ||
        (sinPrefijo && dbRif.replace(/^[VEJGvejg][-]?/, '').replace(/\./g, '') === sinPrefijo.toLowerCase())
      );
    }
  );

  return exacto || data[0];
}

export interface CancelarItemPayload {
  terminalCode: string;
  mesaId?: string;
  mesaIdentificador: string;
  productoId: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  motivo: string;
}

export async function cancelarItemMesa(payload: CancelarItemPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const empresaId = user.app_metadata?.empresa_id;
    const meseroNombre = user.user_metadata?.nombre_completo ||
      user.user_metadata?.full_name ||
      user.email ||
      'Mesero';

    const { data: sede } = await supabase
      .from('sedes')
      .select('id')
      .eq('codigo_terminal', payload.terminalCode.trim().toUpperCase())
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (!sede) return { success: false, error: 'Terminal no encontrado o no pertenece a tu empresa' };

    const motivoLimpio = payload.motivo?.trim() || 'Cancelado por mesero';
    const comentarioCancelacion = `[CANCELACION] Motivo: ${motivoLimpio}`;

    const { createAdminClient } = await import('@/utils/supabase/admin');
    const admin = createAdminClient();

    // 1. Insertar en comandas_mesero (tipo 'comanda') con etiqueta [CANCELACION]
    const { error: errComanda } = await supabase
      .from('comandas_mesero')
      .insert({
        empresa_id: empresaId,
        sede_id: sede.id,
        mesero_id: user.id,
        mesero_nombre: meseroNombre,
        tipo: 'comanda',
        mesa_identificador: payload.mesaIdentificador,
        comentario_general: comentarioCancelacion,
        items: [{
          producto_id: payload.productoId,
          nombre: payload.nombreProducto,
          cantidad: payload.cantidad,
          precio_unitario: payload.precioUnitario,
          comentario: `Cancelado: ${motivoLimpio}`,
        }],
        estado: 'pendiente',
      });

    if (errComanda) {
      console.error('[cancelarItemMesa] Error insertando en comandas_mesero:', errComanda);
      return { success: false, error: errComanda.message };
    }

    // 2. Registrar en auditoria_pos en la nube para trazabilidad inmediata
    try {
      const crypto = await import('crypto');
      const auditId = crypto.randomUUID();
      await admin
        .from('auditoria_pos')
        .insert({
          id: auditId,
          sede_id: sede.id,
          usuario_id: meseroNombre,
          accion: 'Cancelacion Producto Mesero',
          detalle: `Mesa: ${payload.mesaIdentificador}\nMesero: ${meseroNombre}\nMotivo: ${motivoLimpio}\nItem cancelado: ${payload.cantidad}x ${payload.nombreProducto} ($${Number(payload.precioUnitario || 0).toFixed(2)})`,
          gerente_aprobador_id: meseroNombre,
        });
    } catch (errAudit) {
      console.warn('[cancelarItemMesa] No se pudo guardar auditoria_pos:', errAudit);
    }

    // 3. Actualizar inmediatamente pos_cuentas_abiertas para feedback instantáneo en UI
    try {
      let queryCuenta = admin
        .from('pos_cuentas_abiertas')
        .select('*')
        .eq('sede_id', sede.id);

      if (payload.mesaId) {
        queryCuenta = queryCuenta.eq('id', payload.mesaId);
      } else {
        const mClean = payload.mesaIdentificador.replace(/"/g, '');
        queryCuenta = queryCuenta.or(`nombre_cuenta.eq."${mClean}",numero_documento.eq."${mClean}",nombre_cuenta.eq."Mesa ${mClean}"`);
      }

      const { data: cuenta } = await queryCuenta.maybeSingle();

      if (cuenta && Array.isArray(cuenta.detalles)) {
        const detalles = [...cuenta.detalles];
        const prodIdTarget = String(payload.productoId).toLowerCase().trim();
        const prodNombreTarget = String(payload.nombreProducto).toLowerCase().trim();

        const idx = detalles.findIndex((it: any) => {
          const itId = String(it.producto_id || it.id || '').toLowerCase().trim();
          const itNom = String(it.nombre || it.producto || '').toLowerCase().trim();
          return (itId && itId === prodIdTarget) || (itNom && itNom === prodNombreTarget);
        });

        if (idx !== -1) {
          const currentCant = Number(detalles[idx].cantidad) || 1;
          const cantRestar = Number(payload.cantidad) || 1;
          const nuevaCant = currentCant - cantRestar;

          if (nuevaCant <= 0) {
            detalles.splice(idx, 1);
          } else {
            detalles[idx] = {
              ...detalles[idx],
              cantidad: nuevaCant,
              total: Math.round(nuevaCant * (Number(detalles[idx].precio_unitario) || 0) * 100) / 100,
              total_bs: detalles[idx].tasa_efectiva ? Math.round(nuevaCant * (Number(detalles[idx].precio_unitario) || 0) * Number(detalles[idx].tasa_efectiva) * 100) / 100 : 0,
            };
          }

          const nuevoTotal = detalles.reduce((acc: number, it: any) => {
            if (it.tipo === 'meta') return acc;
            return acc + (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0);
          }, 0);

          await admin
            .from('pos_cuentas_abiertas')
            .update({
              detalles,
              total: Math.round(nuevoTotal * 100) / 100,
              actualizado_en: new Date().toISOString(),
            })
            .eq('id', cuenta.id);
        }
      }
    } catch (errCuenta) {
      console.warn('[cancelarItemMesa] Error actualizando pos_cuentas_abiertas:', errCuenta);
    }

    return { success: true };
  } catch (err: any) {
    console.error('[cancelarItemMesa] Error inesperado:', err);
    return { success: false, error: err?.message || 'Error cancelando el ítem' };
  }
}

