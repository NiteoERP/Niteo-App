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
  comentarioGeneral?: string;
  metodoPagoSugerido?: string;
  montoPropina?: number;
  numeroCopias?: number;
  items: ItemComanda[];
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

  const empresaId = user.app_metadata?.empresa_id;
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

  const empresaId = user.app_metadata?.empresa_id;

  const { data: productos } = await supabase
    .from('productos')
    .select('id, id_pos, nombre, precio_venta, sede_id, notas_preparacion, categorias(nombre)')
    .eq('empresa_id', empresaId)
    .or(`sede_id.eq.${sedeId},sede_id.is.null`)
    .eq('estado_activo', true)
    .order('nombre').limit(3000);

  return productos || [];
}

export async function enviarComanda(payload: ComandaPayload): Promise<{ success: boolean; error?: string; id?: string }> {
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

  let comentarioFinal = (payload.comentarioGeneral || '').trim();
  if (payload.numeroCopias && payload.numeroCopias === 2) {
    comentarioFinal = (comentarioFinal ? comentarioFinal + ' ' : '') + '[COPIAS:2]';
  }

  const { data, error } = await supabase
    .from('comandas_mesero')
    .insert({
      empresa_id: empresaId,
      sede_id: sede.id,
      mesero_id: user.id,
      mesero_nombre: meseroNombre,
      tipo: payload.tipo,
      mesa_identificador: payload.mesaIdentificador,
      cliente_nombre: payload.clienteNombre || null,
      comentario_general: comentarioFinal || null,
      metodo_pago_sugerido: payload.metodoPagoSugerido || null,
      propina: payload.montoPropina || 0,
      items: payload.items,
      estado: 'pendiente',
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, id: data.id };
}

export async function obtenerMesasAbiertas(sedeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { createAdminClient } = await import('@/utils/supabase/admin');
  const admin = createAdminClient();

  // 1. Obtener cuentas abiertas en vivo sincronizadas por el POS
  const { data: posCuentas } = await admin
    .from('pos_cuentas_abiertas')
    .select('id, numero_documento, nombre_cuenta, total, fecha_apertura, actualizado_en, detalles')
    .eq('sede_id', sedeId)
    .order('actualizado_en', { ascending: false });

  // 2. Obtener comandas enviadas por meseros que todavía están en tránsito hacia el POS (estado = 'pendiente')
  const { data: comandasPendientes } = await admin
    .from('comandas_mesero')
    .select('id, mesa_identificador, mesero_nombre, cliente_nombre, items, tipo, estado, created_at, metodo_pago_sugerido')
    .eq('sede_id', sedeId)
    .eq('estado', 'pendiente')
    .eq('tipo', 'comanda')
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
      listaMesas.push({
        id: c.id,
        mesa_identificador: c.nombre_cuenta || c.numero_documento || 'Mesa',
        mesero_nombre: mesero,
        cliente_nombre: '',
        items: items,
        tipo: 'comanda',
        estado: 'recibido',
        total: totalUSD,
        total_bs: totalBs,
        tasa_efectiva: tasaMesa,
        created_at: c.fecha_apertura || c.actualizado_en || new Date().toISOString(),
        metodo_pago_sugerido: null,
      });
    }
  }

  // Anexar comandas pendientes que aún no hayan sido asimiladas en pos_cuentas_abiertas
  if (comandasPendientes && comandasPendientes.length > 0) {
    for (const cp of comandasPendientes) {
      const yaExisteEnPOS = listaMesas.some(m =>
        m.mesa_identificador === cp.mesa_identificador ||
        m.mesa_identificador === `Mesa ${cp.mesa_identificador}`
      );
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

async function obtenerEmpresaIdMesero(supabase: any, user: any): Promise<string | null> {
  if (user?.app_metadata?.empresa_id) return user.app_metadata.empresa_id;
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .maybeSingle();
  return perfil?.empresa_id || null;
}

export async function buscarClientesMesa(query: string): Promise<ClienteSugeridoMesa[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const empresaId = await obtenerEmpresaIdMesero(supabase, user);
  if (!empresaId) return [];

  const q = query.trim().replace(/[,()]/g, '');
  if (q.length < 2) return [];

  const { createAdminClient } = await import('@/utils/supabase/admin');
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('clientes')
    .select('id, nombre, rif_cedula, telefono')
    .eq('empresa_id', empresaId)
    .or(`nombre.ilike.%${q}%,rif_cedula.ilike.%${q}%`)
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
    if (unicos.length >= 6) break;
  }

  return unicos;
}

export async function buscarClientePorCedula(cedula: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const empresaId = await obtenerEmpresaIdMesero(supabase, user);
  if (!empresaId) return null;

  const clean = cedula.trim();
  if (!clean) return null;

  const { createAdminClient } = await import('@/utils/supabase/admin');
  const admin = createAdminClient();

  // Intentar coincidencia exacta primero o coincidencia sin prefijo V/E/J
  const soloNumeros = clean.replace(/^[VEJGvejg][-]?/, '');
  const { data } = await admin
    .from('clientes')
    .select('id, nombre, rif_cedula, telefono')
    .eq('empresa_id', empresaId)
    .or(`rif_cedula.ilike.${clean},rif_cedula.ilike.%${soloNumeros}%`)
    .limit(5);

  if (!data || data.length === 0) return null;

  const exacto = data.find(
    (c: any) =>
      (c.rif_cedula || '').trim().toLowerCase() === clean.toLowerCase() ||
      (c.rif_cedula || '').trim().replace(/^[VEJGvejg][-]?/, '') === soloNumeros
  );

  return exacto || data[0];
}

