'use server';

import { GoogleGenerativeAI, SchemaType, FunctionDeclaration } from '@google/generative-ai';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { DEFAULT_TIMEZONE, getTimezoneOffsetString } from '@/utils/date-utils';
import { getTasaBcvForDateAction } from '@/actions/config-actions';
import { mergeInsumos } from '@/app/dashboard/inventario/actions';
import { procesarDespachoEnServidor } from '@/actions/despachos-actions';
import { registrarVentaAlCostoMulti } from '@/actions/ventas-costo-actions';

/**
 * Contexto de autenticación seguro multi-tenant con validación de privilegios
 */
async function getCopilotAuthContext(requestedSedeId?: string) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('No autorizado');

  const { data: perfil, error: perfErr } = await supabase
    .from('perfiles')
    .select('empresa_id, sede_id, rol, nombre_completo, permisos, permiso_venta_costo')
    .eq('id', user.id)
    .single();

  if (perfErr || !perfil || !perfil.empresa_id) {
    throw new Error('Perfil de usuario o empresa no encontrada');
  }

  // VALIDACIÓN DE PRIVILEGIOS: Solo MASTER, SUPERADMIN o usuarios con permiso explícito "copilot_ia"
  const isMaster = user.app_metadata?.user_role === 'MASTER' || perfil.rol === 'MASTER' || perfil.rol === 'SUPERADMIN';
  const hasCopilotPermission = isMaster || (Array.isArray(perfil.permisos) && perfil.permisos.includes('copilot_ia'));

  if (!hasCopilotPermission) {
    throw new Error('ACCESO_DENEGADO: Tu cuenta no tiene habilitado el módulo de Niteo Copilot. Debe ser asignado por el usuario Master en Gestión de Equipo.');
  }

  const cookieStore = await cookies();
  const activeSedeCookie = cookieStore.get('active_sede')?.value;

  let idSede = requestedSedeId || (perfil.sede_id && perfil.sede_id !== 'ALL' ? perfil.sede_id : undefined);
  if (perfil.rol === 'MASTER' && activeSedeCookie && activeSedeCookie !== 'ALL' && !requestedSedeId) {
    idSede = activeSedeCookie;
  }

  // Obtener info básica de la empresa
  const { data: empresa } = await supabase
    .from('empresas')
    .select('nombre_comercial, moneda, simbolo_moneda, rubro, tipo_tasa, tasa_manual')
    .eq('id', perfil.empresa_id)
    .single();

  // Obtener sedes de la empresa
  const { data: sedes } = await supabase
    .from('sedes')
    .select('id, nombre_sede')
    .eq('empresa_id', perfil.empresa_id);

  return {
    supabase,
    user,
    empresaId: perfil.empresa_id,
    sedeId: idSede,
    rol: perfil.rol,
    permisos: perfil.permisos || [],
    permisoVentaCosto: isMaster || perfil.permiso_venta_costo === true,
    userName: perfil.nombre_completo || user.email || 'Usuario',
    empresa: empresa || { nombre_comercial: 'Mi Negocio', moneda: 'USD', simbolo_moneda: '$' },
    sedes: sedes || []
  };
}

/**
 * Calcula rangos de fecha seguros en formato ISO
 */
function calcularRangoFechas(periodo: string): { inicio: string; fin: string; descripcion: string } {
  const now = new Date();
  let inicio = new Date();
  const fin = new Date();

  // Si el string es una fecha YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(periodo)) {
    const tzOffset = getTimezoneOffsetString(DEFAULT_TIMEZONE);
    return {
      inicio: `${periodo}T00:00:00${tzOffset}`,
      fin: `${periodo}T23:59:59.999${tzOffset}`,
      descripcion: `Fecha ${periodo}`
    };
  }

  switch (periodo) {
    case 'hoy': {
      inicio.setHours(0, 0, 0, 0);
      fin.setHours(23, 59, 59, 999);
      return { inicio: inicio.toISOString(), fin: fin.toISOString(), descripcion: 'Hoy' };
    }
    case 'ayer': {
      inicio.setDate(inicio.getDate() - 1);
      inicio.setHours(0, 0, 0, 0);
      const finAyer = new Date(inicio);
      finAyer.setHours(23, 59, 59, 999);
      return { inicio: inicio.toISOString(), fin: finAyer.toISOString(), descripcion: 'Ayer' };
    }
    case 'esta_semana': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      inicio.setDate(diff);
      inicio.setHours(0, 0, 0, 0);
      return { inicio: inicio.toISOString(), fin: fin.toISOString(), descripcion: 'Esta semana' };
    }
    case 'este_mes': {
      inicio = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return { inicio: inicio.toISOString(), fin: fin.toISOString(), descripcion: 'Este mes' };
    }
    case 'ultimos_30_dias': {
      inicio.setDate(inicio.getDate() - 30);
      return { inicio: inicio.toISOString(), fin: fin.toISOString(), descripcion: 'Últimos 30 días' };
    }
    case 'ultimos_6_meses': {
      inicio.setMonth(inicio.getMonth() - 6);
      return { inicio: inicio.toISOString(), fin: fin.toISOString(), descripcion: 'Últimos 6 meses' };
    }
    case 'año_actual': {
      inicio = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      return { inicio: inicio.toISOString(), fin: fin.toISOString(), descripcion: 'Año actual' };
    }
    default: {
      inicio.setDate(inicio.getDate() - 7);
      return { inicio: inicio.toISOString(), fin: fin.toISOString(), descripcion: 'Últimos 7 días' };
    }
  }
}

/**
 * Normaliza cadenas removiendo acentos, caracteres especiales y pasando a minúsculas
 */
function normalizarTexto(txt?: string | null): string {
  if (!txt) return '';
  return txt
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Calcula la distancia de Levenshtein entre dos cadenas para tolerancia a errores ortográficos
 */
function levenshteinDistance(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix: number[][] = [];
  for (let i = 0; i <= bn; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= an; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[bn][an];
}

/**
 * Determina si dos textos coinciden de manera aproximada tolerando errores ortográficos y typos
 * (ej: "mozarela" matchea "mozzarella", "pisa" matchea "pizza", "harinapan" matchea "harina pan")
 */
function esCoincidenciaAproximada(textoReal?: string | null, textoBuscado?: string | null, distanciaCustom?: number): boolean {
  const t1 = normalizarTexto(textoReal);
  const t2 = normalizarTexto(textoBuscado);
  if (!t1 || !t2) return false;
  if (t1.includes(t2) || t2.includes(t1)) return true;

  const palabras1 = t1.split(/[\s,.-]+/);
  const palabras2 = t2.split(/[\s,.-]+/);

  for (const p2 of palabras2) {
    if (p2.length < 3) continue;
    let coincidioPalabra = false;
    for (const p1 of palabras1) {
      if (p1.length < 3) continue;
      if (p1.includes(p2) || p2.includes(p1)) {
        coincidioPalabra = true;
        break;
      }
      const dist = levenshteinDistance(p1, p2);
      const maxPermitida = p2.length <= 4 ? 1 : p2.length <= 7 ? 2 : 3;
      if (dist <= maxPermitida) {
        coincidioPalabra = true;
        break;
      }
    }
    if (coincidioPalabra) return true;
  }

  if (Math.abs(t1.length - t2.length) <= 3) {
    const globalDist = levenshteinDistance(t1, t2);
    if (globalDist <= 2) return true;
  }

  return false;
}

/**
 * Resuelve de forma inteligente el nombre o número de una sede con tolerancia a typos:
 * - "sede 1", "sucursal 1", "1", "primera" -> sedes[0]
 * - "sede 2", "sucursal 2", "2", "segunda" -> sedes[1]
 * - "sede principal", "matriz", "central" -> busca sede con ese nombre o primera sede
 * - búsqueda por coincidencia parcial y difusa de texto
 */
function resolverSede(
  termino?: string | null,
  sedes?: { id: string; nombre_sede: string }[]
): { id: string; nombre_sede: string } | null {
  if (!termino || !sedes || sedes.length === 0) return null;

  const cleanTerm = normalizarTexto(termino);

  if (cleanTerm === '1' || cleanTerm.includes('primera') || cleanTerm === 'sede 1' || cleanTerm === 'sucursal 1' || cleanTerm === 'sde 1' || cleanTerm === 'sed 1') {
    return sedes[0] || null;
  }
  if (cleanTerm === '2' || cleanTerm.includes('segunda') || cleanTerm === 'sede 2' || cleanTerm === 'sucursal 2' || cleanTerm === 'sde 2' || cleanTerm === 'sed 2') {
    return sedes[1] || null;
  }
  if (cleanTerm === '3' || cleanTerm.includes('tercera') || cleanTerm === 'sede 3' || cleanTerm === 'sucursal 3') {
    return sedes[2] || null;
  }

  const matchNum = cleanTerm.match(/(?:sede|sucursal|caja|tienda|pos|sde|sed)?\s*(\d+)/i);
  if (matchNum && matchNum[1]) {
    const idx = parseInt(matchNum[1], 10) - 1;
    if (idx >= 0 && idx < sedes.length) {
      return sedes[idx];
    }
  }

  if (cleanTerm.includes('principal') || cleanTerm.includes('matriz') || cleanTerm.includes('central') || cleanTerm.includes('principa') || cleanTerm.includes('pricipal')) {
    const principal = sedes.find(s => {
      const sNorm = normalizarTexto(s.nombre_sede);
      return sNorm.includes('principal') || sNorm.includes('central') || sNorm.includes('matriz');
    });
    if (principal) return principal;
    return sedes[0];
  }

  const directa = sedes.find(s => esCoincidenciaAproximada(s.nombre_sede, cleanTerm));

  return directa || null;
}

// ==========================================
// HERRAMIENTAS EJECUTABLES (TOOLS IMPLEMENTATION)
// ==========================================

/**
 * 1. Consulta la tasa cambiaria de un día específico (o de hoy)
 */
async function toolConsultarTasaCambio(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: { fecha?: string }
) {
  const targetDate = args.fecha || new Date().toISOString().substring(0, 10);
  const tasaData = await getTasaBcvForDateAction(targetDate);
  return {
    fecha_consultada: targetDate,
    tasa: tasaData.tasa,
    fecha_efectiva_bcv: tasaData.fecha,
    moneda_referencia: tasaData.moneda,
    tipo: tasaData.tipoTasa,
    mensaje: `La tasa para la fecha ${targetDate} fue de ${tasaData.tasa.toFixed(2)} Bs/${tasaData.moneda}.`
  };
}

/**
 * 2. Consulta ventas (cenas/turno y total) y compras del día tanto en USD como en VES
 */
async function toolConsultarBalanceDia(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: { fecha: string; turno?: 'todo_el_dia' | 'cenas_nocturno' | 'almuerzo'; sede_nombre?: string }
) {
  const { supabase, empresaId, sedeId, sedes } = ctx;
  const fechaStr = args.fecha || new Date().toISOString().substring(0, 10);
  const tzOffset = getTimezoneOffsetString(DEFAULT_TIMEZONE);
  const inicioDia = `${fechaStr}T00:00:00${tzOffset}`;
  const finDia = `${fechaStr}T23:59:59.999${tzOffset}`;

  let targetSedeId = sedeId;
  let sedeIdentificada = 'General / Todas las sedes';
  if (args.sede_nombre) {
    const sFound = resolverSede(args.sede_nombre, sedes);
    if (sFound) {
      targetSedeId = sFound.id;
      sedeIdentificada = sFound.nombre_sede;
    }
  }

  // Obtener tasa del día
  const tasaInfo = await getTasaBcvForDateAction(fechaStr);
  const tasa = tasaInfo.tasa || 1;

  // Consultar Ventas Facturas
  let queryVentas = supabase
    .from('ventas_facturas')
    .select('id, total, fecha_venta, numero_documento')
    .eq('empresa_id', empresaId)
    .gte('fecha_venta', inicioDia)
    .lte('fecha_venta', finDia)
    .neq('numero_documento', 'TEST');

  if (targetSedeId) {
    queryVentas = queryVentas.eq('sede_id', targetSedeId);
  }

  const { data: facturas, error: vErr } = await queryVentas;
  if (vErr) return { error: `Error consultando ventas: ${vErr.message}` };

  let totalVentasUsd = 0;
  let totalCenasUsd = 0; // Ventas a partir de las 18:00 (6:00 PM)
  let countFacturas = 0;
  let countCenas = 0;

  for (const fac of facturas || []) {
    const monto = Number(fac.total || 0);
    totalVentasUsd += monto;
    countFacturas++;

    // Verificar si es turno noche / cena
    const fDate = new Date(fac.fecha_venta);
    const hour = fDate.getHours();
    if (hour >= 18 || hour <= 4) {
      totalCenasUsd += monto;
      countCenas++;
    }
  }

  // Consultar Compras
  let queryCompras = supabase
    .from('compras_puntuales')
    .select('id, monto_divisas, monto_bs, proveedor, detalles')
    .eq('id_empresa', empresaId)
    .gte('fecha_registro', inicioDia)
    .lte('fecha_registro', finDia);

  if (targetSedeId) {
    queryCompras = queryCompras.eq('id_sede', targetSedeId);
  }

  const { data: compras, error: cErr } = await queryCompras;
  if (cErr) return { error: `Error consultando compras: ${cErr.message}` };

  let totalComprasUsd = 0;
  let totalComprasBs = 0;

  for (const comp of compras || []) {
    totalComprasUsd += Number(comp.monto_divisas || 0);
    totalComprasBs += Number(comp.monto_bs || (Number(comp.monto_divisas || 0) * tasa));
  }

  const totalVentasBs = totalVentasUsd * tasa;
  const totalCenasBs = totalCenasUsd * tasa;

  return {
    fecha: fechaStr,
    sede_consultada: sedeIdentificada,
    tasa_bcv_aplicada: tasa,
    moneda_tasa: tasaInfo.moneda,
    ventas: {
      total_ventas_usd: Number(totalVentasUsd.toFixed(2)),
      total_ventas_bs: Number(totalVentasBs.toFixed(2)),
      total_facturas: countFacturas,
      turno_cenas_nocturno: {
        total_usd: Number(totalCenasUsd.toFixed(2)),
        total_bs: Number(totalCenasBs.toFixed(2)),
        cantidad_pedidos: countCenas
      }
    },
    compras: {
      total_compras_usd: Number(totalComprasUsd.toFixed(2)),
      total_compras_bs: Number(totalComprasBs.toFixed(2)),
      total_compras_registradas: (compras || []).length
    },
    balance_neto: {
      balance_usd: Number((totalVentasUsd - totalComprasUsd).toFixed(2)),
      balance_bs: Number((totalVentasBs - totalComprasBs).toFixed(2))
    }
  };
}

/**
 * 3. Consulta ventas por método de pago (ej. Pago Móvil) desglosadas por cada sede
 */
async function toolConsultarVentasPorMetodoPago(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: {
    metodo_pago: string;
    periodo_o_fecha?: string;
    sede_nombre?: string;
  }
) {
  const { supabase, empresaId, sedes } = ctx;
  const { inicio, fin, descripcion } = calcularRangoFechas(args.periodo_o_fecha || 'hoy');
  const metodoBuscado = (args.metodo_pago || 'pago_movil').toLowerCase().replace(/[_\s-]/g, '');

  let query = supabase
    .from('ventas_facturas')
    .select(`
      id,
      sede_id,
      total,
      fecha_venta,
      ventas_pagos (
        tipo_pago,
        monto
      )
    `)
    .eq('empresa_id', empresaId)
    .gte('fecha_venta', inicio)
    .lte('fecha_venta', fin)
    .neq('numero_documento', 'TEST');

  if (args.sede_nombre) {
    const sFound = resolverSede(args.sede_nombre, sedes);
    if (sFound) {
      query = query.eq('sede_id', sFound.id);
    }
  }

  const { data: facturas, error } = await query;

  if (error) return { error: `Error consultando ventas por método de pago: ${error.message}` };

  const tasaHoy = (await getTasaBcvForDateAction(new Date().toISOString().substring(0, 10))).tasa || 1;

  // Mapa de nombres de sede con alias amigable (Sede 1: ..., Sede 2: ...)
  const sedeNombres: Record<string, string> = {};
  sedes.forEach((s, idx) => {
    sedeNombres[s.id] = `Sede ${idx + 1} (${s.nombre_sede})`;
  });

  const desglosadoPorSede: Record<string, {
    sede_id: string;
    nombre_sede: string;
    total_usd: number;
    total_bs: number;
    transacciones: number;
  }> = {};

  let totalGeneralUsd = 0;
  let totalTransacciones = 0;

  for (const fac of facturas || []) {
    const sId = fac.sede_id || 'sin_sede';
    const sNombre = sedeNombres[sId] || 'Sede Principal / Sin Asignar';

    if (!desglosadoPorSede[sId]) {
      desglosadoPorSede[sId] = {
        sede_id: sId,
        nombre_sede: sNombre,
        total_usd: 0,
        total_bs: 0,
        transacciones: 0
      };
    }

    const pagos = (fac as any).ventas_pagos || [];
    for (const p of pagos) {
      const pClean = (p.tipo_pago || '').toLowerCase().replace(/[_\s-]/g, '');
      if (pClean.includes(metodoBuscado) || metodoBuscado.includes(pClean)) {
        const monto = Number(p.monto || 0);
        desglosadoPorSede[sId].total_usd += monto;
        desglosadoPorSede[sId].total_bs += monto * tasaHoy;
        desglosadoPorSede[sId].transacciones += 1;

        totalGeneralUsd += monto;
        totalTransacciones += 1;
      }
    }
  }

  return {
    metodo_pago_consultado: args.metodo_pago,
    periodo: descripcion,
    tasa_referencia_bcv: tasaHoy,
    total_general_usd: Number(totalGeneralUsd.toFixed(2)),
    total_general_bs: Number((totalGeneralUsd * tasaHoy).toFixed(2)),
    total_transacciones: totalTransacciones,
    desglose_por_sedes: Object.values(desglosadoPorSede).map(s => ({
      ...s,
      total_usd: Number(s.total_usd.toFixed(2)),
      total_bs: Number(s.total_bs.toFixed(2))
    }))
  };
}

/**
 * 4. Propone la fusión de marcas de insumos en inventario y colocación como palabras clave
 */
async function toolProponerFusionMarcas(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: {
    insumo_principal_nombre: string;
    insumos_a_fusionar_nombres: string[];
  }
) {
  const { supabase, empresaId } = ctx;

  // 1. Buscar insumo principal
  const { data: masters } = await supabase
    .from('inventario_insumos')
    .select('id, nombre, unidad_medida, cantidad_actual, palabras_clave')
    .eq('empresa_id', empresaId)
    .ilike('nombre', `%${args.insumo_principal_nombre.trim()}%`)
    .limit(5);

  if (!masters || masters.length === 0) {
    return {
      exito: false,
      mensaje: `No se encontró el insumo principal "${args.insumo_principal_nombre}" en el inventario.`
    };
  }

  const masterInsumo = masters[0];

  // 2. Buscar insumos a absorber
  const slaveInsumos: any[] = [];
  for (const nombre of args.insumos_a_fusionar_nombres) {
    const { data: slaves } = await supabase
      .from('inventario_insumos')
      .select('id, nombre, unidad_medida, cantidad_actual, palabras_clave')
      .eq('empresa_id', empresaId)
      .neq('id', masterInsumo.id)
      .ilike('nombre', `%${nombre.trim()}%`);

    if (slaves && slaves.length > 0) {
      for (const s of slaves) {
        if (!slaveInsumos.some(existing => existing.id === s.id)) {
          slaveInsumos.push(s);
        }
      }
    }
  }

  if (slaveInsumos.length === 0) {
    return {
      exito: false,
      mensaje: 'No se encontraron insumos secundarios coincidentes para absorber en la fusión.'
    };
  }

  // Preparar palabras clave resultantes
  const keywordsActuales = Array.isArray(masterInsumo.palabras_clave) ? masterInsumo.palabras_clave : [];
  const nuevasKeywords = new Set<string>(keywordsActuales);

  let stockSuma = masterInsumo.cantidad_actual || 0;
  slaveInsumos.forEach(s => {
    stockSuma += s.cantidad_actual || 0;
    nuevasKeywords.add(s.nombre);
    if (Array.isArray(s.palabras_clave)) {
      s.palabras_clave.forEach((k: string) => nuevasKeywords.add(k));
    }
  });

  return {
    exito: true,
    insumo_principal: {
      id: masterInsumo.id,
      nombre: masterInsumo.nombre,
      stock_actual: masterInsumo.cantidad_actual,
      unidad_medida: masterInsumo.unidad_medida
    },
    insumos_a_absorber: slaveInsumos.map(s => ({
      id: s.id,
      nombre: s.nombre,
      stock: s.cantidad_actual
    })),
    stock_total_resultante: Number(stockSuma.toFixed(2)),
    palabras_clave_resultantes: Array.from(nuevasKeywords).slice(0, 20),
    requiere_confirmacion: true,
    mensaje: `Se propone fusionar ${slaveInsumos.length} insumos en "${masterInsumo.nombre}". Sus marcas se agregarán como palabras clave y el stock total será ${stockSuma.toFixed(2)} ${masterInsumo.unidad_medida}. ¿Deseas confirmar la fusión?`
  };
}

/**
 * Propone la agrupación de productos del catálogo como similares / sustitutos (mismo grupo o principio activo)
 */
async function toolProponerAgrupacionSimilares(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: {
    nombre_grupo: string;
    productos_nombres_o_ids: string[];
  }
) {
  const { supabase, empresaId } = ctx;
  const grupoLimpio = args.nombre_grupo.trim();

  const matchedProductos: any[] = [];
  for (const query of args.productos_nombres_o_ids) {
    const q = query.trim();
    if (!q) continue;

    const { data: prods } = await supabase
      .from('productos')
      .select('id, nombre, precio_venta, codigo_barras, grupo_similar')
      .eq('empresa_id', empresaId)
      .eq('archivado', false)
      .or(`id.eq.${q},nombre.ilike.%${q}%`)
      .limit(5);

    if (prods && prods.length > 0) {
      for (const p of prods) {
        if (!matchedProductos.some(m => m.id === p.id)) {
          matchedProductos.push(p);
        }
      }
    }
  }

  if (matchedProductos.length === 0) {
    return {
      exito: false,
      mensaje: `No se encontraron productos coincidentes en el catálogo para agrupar bajo "${grupoLimpio}".`
    };
  }

  return {
    exito: true,
    grupo: grupoLimpio,
    productos: matchedProductos,
    total: matchedProductos.length,
    mensaje: `Se encontraron ${matchedProductos.length} productos para agrupar bajo "${grupoLimpio}": ${matchedProductos.map(p => p.nombre).join(', ')}. ¿Deseas aplicar la agrupación?`
  };
}

/**
 * 5. Propone un despacho / traslado de inventario entre sedes
 */
async function toolProponerDespachoSedes(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: {
    sede_origen_nombre: string;
    sede_destino_nombre: string;
    items: { nombre_insumo: string; cantidad: number }[];
    notas?: string;
  }
) {
  const { supabase, empresaId, sedes } = ctx;

  // Buscar sedes de forma inteligente (admite "sede 1", "sede principal", nombres exactos o parciales)
  const origen = resolverSede(args.sede_origen_nombre, sedes);
  const destino = resolverSede(args.sede_destino_nombre, sedes);

  if (!origen) return { exito: false, mensaje: `No se encontró la sede de origen "${args.sede_origen_nombre}".` };
  if (!destino) return { exito: false, mensaje: `No se encontró la sede de destino "${args.sede_destino_nombre}".` };
  if (origen.id === destino.id) return { exito: false, mensaje: 'La sede de origen y destino no pueden ser la misma.' };

  const itemsPreparados: any[] = [];
  const erroresStock: string[] = [];

  for (const it of args.items) {
    const { data: insumos } = await supabase
      .from('inventario_insumos')
      .select('id, nombre, unidad_medida, cantidad_actual, costo_promedio')
      .eq('empresa_id', empresaId)
      .or(`sede_id.eq.${origen.id},sede_id.is.null`)
      .ilike('nombre', `%${it.nombre_insumo.trim()}%`)
      .limit(1);

    if (!insumos || insumos.length === 0) {
      erroresStock.push(`Insumo no encontrado en origen: ${it.nombre_insumo}`);
      continue;
    }

    const ins = insumos[0];
    if (ins.cantidad_actual < it.cantidad) {
      erroresStock.push(`Stock insuficiente para "${ins.nombre}": disponible ${ins.cantidad_actual} ${ins.unidad_medida}, solicitado ${it.cantidad}`);
      continue;
    }

    itemsPreparados.push({
      insumo_id: ins.id,
      nombre: ins.nombre,
      unidad_medida: ins.unidad_medida,
      cantidad: it.cantidad,
      costo_promedio: ins.costo_promedio,
      stock_disponible_origen: ins.cantidad_actual
    });
  }

  if (erroresStock.length > 0) {
    return {
      exito: false,
      errores: erroresStock,
      mensaje: `No se puede procesar el despacho por los siguientes motivos:\n${erroresStock.join('\n')}`
    };
  }

  return {
    exito: true,
    origen: { id: origen.id, nombre: origen.nombre_sede },
    destino: { id: destino.id, nombre: destino.nombre_sede },
    items: itemsPreparados,
    notas: args.notas || 'Despacho gestionado mediante Niteo Copilot',
    requiere_confirmacion: true,
    mensaje: `Se propone despachar ${itemsPreparados.length} ítems de "${origen.nombre_sede}" hacia "${destino.nombre_sede}". ¿Deseas confirmar la emisión del despacho?`
  };
}

/**
 * 6. Propone una venta al costo para un beneficiario
 */
async function toolProponerVentaAlCosto(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: {
    beneficiario: string;
    items: { nombre_insumo: string; cantidad: number }[];
    notas?: string;
  }
) {
  const { supabase, empresaId, sedeId, permisoVentaCosto } = ctx;

  if (!permisoVentaCosto) {
    return {
      exito: false,
      mensaje: 'Acceso Denegado: No tienes el privilegio "Venta al Costo" habilitado en tu perfil.'
    };
  }

  if (!args.beneficiario || args.beneficiario.trim() === '') {
    return { exito: false, mensaje: 'Debes indicar el nombre del beneficiario de la venta al costo.' };
  }

  const itemsProcesados: any[] = [];
  let costoTotalUSD = 0;
  const errores: string[] = [];

  for (const it of args.items) {
    let query = supabase
      .from('inventario_insumos')
      .select('id, nombre, unidad_medida, cantidad_actual, costo_promedio')
      .eq('empresa_id', empresaId)
      .ilike('nombre', `%${it.nombre_insumo.trim()}%`);

    if (sedeId) {
      query = query.or(`sede_id.eq.${sedeId},sede_id.is.null`);
    }

    const { data: insumos } = await query.limit(1);

    if (!insumos || insumos.length === 0) {
      errores.push(`Insumo no encontrado: ${it.nombre_insumo}`);
      continue;
    }

    const ins = insumos[0];
    if (ins.cantidad_actual < it.cantidad) {
      errores.push(`Stock insuficiente para "${ins.nombre}": disponible ${ins.cantidad_actual}, solicitado ${it.cantidad}`);
      continue;
    }

    const costoItem = (ins.costo_promedio || 0) * it.cantidad;
    costoTotalUSD += costoItem;

    itemsProcesados.push({
      insumoId: ins.id,
      nombre: ins.nombre,
      unidad_medida: ins.unidad_medida,
      cantidad: it.cantidad,
      costo_unitario: ins.costo_promedio,
      costo_subtotal: Number(costoItem.toFixed(2))
    });
  }

  if (errores.length > 0) {
    return { exito: false, errores, mensaje: errores.join('\n') };
  }

  const tasaHoy = (await getTasaBcvForDateAction(new Date().toISOString().substring(0, 10))).tasa || 1;

  return {
    exito: true,
    beneficiario: args.beneficiario,
    items: itemsProcesados,
    costo_total_usd: Number(costoTotalUSD.toFixed(2)),
    costo_total_bs: Number((costoTotalUSD * tasaHoy).toFixed(2)),
    tasa_bcv: tasaHoy,
    notas: args.notas || 'Venta al costo procesada vía Niteo Copilot',
    requiere_confirmacion: true,
    mensaje: `Se propone registrar Venta al Costo para ${args.beneficiario} por un total de $${costoTotalUSD.toFixed(2)} USD (${(costoTotalUSD * tasaHoy).toFixed(2)} Bs). ¿Deseas confirmar la operación?`
  };
}

/**
 * 7. Consulta métricas y ranking de ventas (ya implementada)
 */
async function toolConsultarVentas(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: {
    periodo?: string;
    filtro_producto?: string;
    limite?: number;
    ordenar_por?: 'mas_vendidos' | 'menos_vendidos';
    sede_nombre?: string;
  }
) {
  const { supabase, empresaId, sedeId, sedes } = ctx;
  const { inicio, fin, descripcion } = calcularRangoFechas(args.periodo || 'esta_semana');
  const limite = Math.min(Math.max(args.limite || 10, 1), 50);

  let targetSedeId = sedeId;
  let sedeIdentificada = 'General / Todas las sedes';
  if (args.sede_nombre) {
    const sFound = resolverSede(args.sede_nombre, sedes);
    if (sFound) {
      targetSedeId = sFound.id;
      sedeIdentificada = sFound.nombre_sede;
    }
  }

  let query = supabase
    .from('ventas_facturas')
    .select(`
      id,
      numero_documento,
      fecha_venta,
      total,
      descuento,
      ventas_detalles (
        id,
        producto_id,
        cantidad,
        precio_unitario,
        total,
        promo_id,
        productos (
          id,
          nombre,
          codigo_barras
        )
      )
    `)
    .eq('empresa_id', empresaId)
    .gte('fecha_venta', inicio)
    .lte('fecha_venta', fin)
    .neq('numero_documento', 'TEST');

  if (targetSedeId) {
    query = query.eq('sede_id', targetSedeId);
  }

  const { data: facturas, error } = await query;
  if (error) return { error: `Error consultando ventas: ${error.message}` };

  const agrupadoPorProducto: Record<string, {
    producto_id: string;
    nombre: string;
    codigo_barras: string;
    cantidad_vendida: number;
    total_usd: number;
  }> = {};

  let totalRecaudado = 0;
  let totalFacturas = (facturas || []).length;
  let totalUnidades = 0;

  for (const fac of facturas || []) {
    totalRecaudado += Number(fac.total || 0);
    const detalles = (fac as any).ventas_detalles || [];

    for (const det of detalles) {
      const prod = det.productos;
      const prodId = det.producto_id || 'desconocido';
      const prodNombre = prod?.nombre || 'Producto no identificado';
      const prodCodigo = prod?.codigo_barras || '';

      if (args.filtro_producto && args.filtro_producto.trim().length > 0) {
        if (!esCoincidenciaAproximada(prodNombre, args.filtro_producto)) continue;
      }

      const cant = Number(det.cantidad || 0);
      const subtotal = Number(det.total || 0);

      totalUnidades += cant;

      if (!agrupadoPorProducto[prodId]) {
        agrupadoPorProducto[prodId] = {
          producto_id: prodId,
          nombre: prodNombre,
          codigo_barras: prodCodigo,
          cantidad_vendida: 0,
          total_usd: 0
        };
      }

      agrupadoPorProducto[prodId].cantidad_vendida += cant;
      agrupadoPorProducto[prodId].total_usd += subtotal;
    }
  }

  const listaProductos = Object.values(agrupadoPorProducto);
  if (args.ordenar_por === 'menos_vendidos') {
    listaProductos.sort((a, b) => a.cantidad_vendida - b.cantidad_vendida);
  } else {
    listaProductos.sort((a, b) => b.cantidad_vendida - a.cantidad_vendida);
  }

  const topProductos = listaProductos.slice(0, limite).map(p => ({
    ...p,
    cantidad_vendida: Number(p.cantidad_vendida.toFixed(2)),
    total_usd: Number(p.total_usd.toFixed(2))
  }));

  return {
    periodo: descripcion,
    sede_consultada: sedeIdentificada,
    filtro_producto: args.filtro_producto || null,
    total_facturas_emitidas: totalFacturas,
    total_ventas_usd: Number(totalRecaudado.toFixed(2)),
    total_unidades_coincidentes: Number(totalUnidades.toFixed(2)),
    productos: topProductos
  };
}

/**
 * 8. Consulta consumo de materia prima e insumos (ya implementada)
 */
async function toolConsultarConsumoInsumo(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: { nombre_insumo: string; periodo?: string }
) {
  const { supabase, empresaId, sedeId } = ctx;
  const { inicio, fin, descripcion } = calcularRangoFechas(args.periodo || 'este_mes');

  let queryInsumos = supabase
    .from('inventario_insumos')
    .select('id, nombre, unidad_medida, cantidad_actual, costo_promedio, palabras_clave, sede_id')
    .eq('empresa_id', empresaId)
    .ilike('nombre', `%${args.nombre_insumo.trim()}%`);

  if (sedeId) {
    queryInsumos = queryInsumos.or(`sede_id.eq.${sedeId},sede_id.is.null`);
  }

  const { data: insumos, error: insErr } = await queryInsumos;
  if (insErr) return { error: `Error buscando insumo: ${insErr.message}` };

  let listaInsumos = insumos && insumos.length > 0 ? insumos : [];

  if (listaInsumos.length === 0) {
    const { data: insumosAlt } = await supabase
      .from('inventario_insumos')
      .select('id, nombre, unidad_medida, cantidad_actual, costo_promedio, palabras_clave, sede_id')
      .eq('empresa_id', empresaId)
      .limit(100);

    const term = args.nombre_insumo;
    listaInsumos = (insumosAlt || []).filter(i => 
      esCoincidenciaAproximada(i.nombre, term) ||
      (Array.isArray(i.palabras_clave) && i.palabras_clave.some((p: string) => esCoincidenciaAproximada(p, term)))
    );

    if (listaInsumos.length === 0) {
      return {
        encontrado: false,
        mensaje: `No se encontró ningún insumo que coincida con "${args.nombre_insumo}" en el inventario.`
      };
    }
  }

  const resultados = [];

  for (const ins of listaInsumos) {
    const { data: movs } = await supabase
      .from('movimientos_inventario')
      .select('cantidad, motivo, tipo_movimiento')
      .eq('empresa_id', empresaId)
      .eq('insumo_id', ins.id)
      .eq('tipo_movimiento', 'SALIDA')
      .gte('fecha_movimiento', inicio)
      .lte('fecha_movimiento', fin);

    let totalSalidasReales = 0;
    (movs || []).forEach(m => { totalSalidasReales += Number(m.cantidad || 0); });

    const { data: recetas } = await supabase
      .from('recetas')
      .select('producto_id, cantidad_necesaria, productos(nombre)')
      .eq('empresa_id', empresaId)
      .eq('insumo_id', ins.id);

    let consumoTeorico = 0;
    const productosAfectados: string[] = [];

    if (recetas && recetas.length > 0) {
      const prodIds = recetas.map(r => r.producto_id).filter(Boolean);
      recetas.forEach(r => {
        const pName = (r as any).productos?.nombre;
        if (pName && !productosAfectados.includes(pName)) {
          productosAfectados.push(pName);
        }
      });

      let vQuery = supabase
        .from('ventas_facturas')
        .select(`
          id,
          ventas_detalles (
            producto_id,
            cantidad
          )
        `)
        .eq('empresa_id', empresaId)
        .gte('fecha_venta', inicio)
        .lte('fecha_venta', fin);

      if (sedeId) vQuery = vQuery.eq('sede_id', sedeId);

      const { data: facturasProd } = await vQuery;

      const cantidadPorProducto: Record<string, number> = {};
      for (const f of facturasProd || []) {
        const dets = (f as any).ventas_detalles || [];
        for (const d of dets) {
          if (prodIds.includes(d.producto_id)) {
            cantidadPorProducto[d.producto_id] = (cantidadPorProducto[d.producto_id] || 0) + Number(d.cantidad || 0);
          }
        }
      }

      for (const rec of recetas) {
        const vendidos = cantidadPorProducto[rec.producto_id] || 0;
        consumoTeorico += vendidos * Number(rec.cantidad_necesaria || 0);
      }
    }

    resultados.push({
      insumo_id: ins.id,
      nombre: ins.nombre,
      unidad_medida: ins.unidad_medida,
      stock_actual: Number(ins.cantidad_actual || 0),
      consumo_real_registrado: Number(totalSalidasReales.toFixed(2)),
      consumo_teorico_por_recetas: Number(consumoTeorico.toFixed(2)),
      productos_en_receta: productosAfectados
    });
  }

  return {
    periodo: descripcion,
    termino_busqueda: args.nombre_insumo,
    insumos_encontrados: resultados
  };
}

/**
 * 9. Auditoría de compras sospechosas (ya implementada)
 */
async function toolAuditarComprasSospechosas(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: { dias_atras?: number; margen_tolerancia_usd?: number }
) {
  const { supabase, empresaId, sedeId } = ctx;
  const dias = Math.min(Math.max(args.dias_atras || 30, 1), 180);
  const margen = typeof args.margen_tolerancia_usd === 'number' ? Math.abs(args.margen_tolerancia_usd) : 0.05;

  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - dias);

  let query = supabase
    .from('compras_puntuales')
    .select('id, fecha_registro, proveedor, monto_divisas, monto_bs, tasa_cambio, detalles')
    .eq('id_empresa', empresaId)
    .gte('fecha_registro', fechaLimite.toISOString())
    .order('fecha_registro', { ascending: false });

  if (sedeId) query = query.eq('id_sede', sedeId);

  const { data: compras, error } = await query;
  if (error) return { error: `Error consultando compras: ${error.message}` };

  if (!compras || compras.length < 2) {
    return {
      compras_analizadas: (compras || []).length,
      sospechosas: [],
      mensaje: 'No se encontraron suficientes compras en el periodo para detectar duplicados.'
    };
  }

  const porDia: Record<string, typeof compras> = {};
  for (const c of compras) {
    const diaKey = (c.fecha_registro || '').substring(0, 10);
    if (!diaKey) continue;
    if (!porDia[diaKey]) porDia[diaKey] = [];
    porDia[diaKey].push(c);
  }

  const casosSospechosos: any[] = [];

  for (const [dia, lista] of Object.entries(porDia)) {
    if (lista.length < 2) continue;

    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        const c1 = lista[i];
        const c2 = lista[j];
        const monto1 = Number(c1.monto_divisas || 0);
        const monto2 = Number(c2.monto_divisas || 0);
        const difMonto = Math.abs(monto1 - monto2);

        if (difMonto <= margen) {
          const mismoProveedor = (c1.proveedor || '').toLowerCase().trim() === (c2.proveedor || '').toLowerCase().trim();
          casosSospechosos.push({
            fecha: dia,
            mismo_proveedor: mismoProveedor,
            diferencia_usd: Number(difMonto.toFixed(2)),
            compra_a: { id: c1.id, proveedor: c1.proveedor, monto_usd: monto1, detalles: c1.detalles },
            compra_b: { id: c2.id, proveedor: c2.proveedor, monto_usd: monto2, detalles: c2.detalles }
          });
        }
      }
    }
  }

  return {
    compras_analizadas: compras.length,
    total_alertas_duplicados: casosSospechosos.length,
    alertas: casosSospechosos.slice(0, 15)
  };
}

/**
 * 10. Busca combos inactivos
 */
async function toolBuscarCombosInactivos(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: { meses_inactividad?: number }
) {
  const { supabase, empresaId } = ctx;
  const meses = Math.min(Math.max(args.meses_inactividad || 6, 1), 24);

  const fechaLimite = new Date();
  fechaLimite.setMonth(fechaLimite.getMonth() - meses);

  const { data: combos, error: promoErr } = await supabase
    .from('promociones_combos')
    .select('id, nombre, tipo, estado_activo, creado_en')
    .eq('empresa_id', empresaId)
    .eq('estado_activo', true);

  if (promoErr) return { error: `Error consultando promociones: ${promoErr.message}` };
  if (!combos || combos.length === 0) {
    return {
      total_activos: 0,
      combos_inactivos: [],
      mensaje: 'No hay promociones o combos activos actualmente en el catálogo.'
    };
  }

  const { data: facturas } = await supabase
    .from('ventas_facturas')
    .select(`id, ventas_detalles ( promo_id )`)
    .eq('empresa_id', empresaId)
    .gte('fecha_venta', fechaLimite.toISOString());

  const combosVendidos = new Set<string>();
  for (const fac of facturas || []) {
    const dets = (fac as any).ventas_detalles || [];
    for (const d of dets) {
      if (d.promo_id) combosVendidos.add(d.promo_id);
    }
  }

  const inactivos = combos.filter(c => !combosVendidos.has(c.id)).map(c => ({
    id: c.id,
    nombre: c.nombre,
    tipo: c.tipo,
    creado_en: c.creado_en
  }));

  return {
    meses_evaluados: meses,
    total_combos_activos: combos.length,
    total_inactivos_sin_ventas: inactivos.length,
    combos_inactivos: inactivos
  };
}

/**
 * 12. Consultar la receta y escandallo de un producto existente
 */
async function toolConsultarReceta(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: { nombre_producto: string }
) {
  const { supabase, empresaId } = ctx;
  const nombreBuscado = normalizarTexto(args.nombre_producto);

  const { data: todosProductos, error: prodErr } = await supabase
    .from('productos')
    .select('id, nombre, precio_venta, costo, es_compuesto, es_reventa, descripcion')
    .eq('empresa_id', empresaId)
    .neq('archivado', true);

  if (prodErr) return { error: `Error consultando productos: ${prodErr.message}` };
  if (!todosProductos || todosProductos.length === 0) {
    return { error: 'No se encontraron productos en el catálogo de esta empresa.' };
  }

  // Búsqueda exacta, contenida o aproximada con Levenshtein
  let producto = todosProductos.find(p => normalizarTexto(p.nombre) === nombreBuscado);
  if (!producto) {
    producto = todosProductos.find(p => normalizarTexto(p.nombre).includes(nombreBuscado) || nombreBuscado.includes(normalizarTexto(p.nombre)));
  }
  if (!producto) {
    producto = todosProductos.find(p => esCoincidenciaAproximada(p.nombre, args.nombre_producto, 2));
  }

  if (!producto) {
    const sugerencias = todosProductos
      .filter(p => esCoincidenciaAproximada(p.nombre, args.nombre_producto, 4))
      .slice(0, 5)
      .map(p => p.nombre);

    return {
      error: `No encontré ningún producto que coincida con "${args.nombre_producto}".`,
      sugerencias: sugerencias.length > 0 ? sugerencias : todosProductos.slice(0, 5).map(p => p.nombre)
    };
  }

  // Buscar receta vinculada
  const { data: lineasReceta, error: recErr } = await supabase
    .from('recetas')
    .select('id, insumo_id, subproducto_id, cantidad_necesaria')
    .eq('empresa_id', empresaId)
    .eq('producto_id', producto.id);

  if (recErr) return { error: `Error consultando receta: ${recErr.message}` };

  if (!lineasReceta || lineasReceta.length === 0) {
    return {
      producto: {
        id: producto.id,
        nombre: producto.nombre,
        precio_venta_usd: Number(producto.precio_venta || 0),
        costo_actual_usd: Number(producto.costo || 0),
        es_compuesto: producto.es_compuesto
      },
      tiene_receta: false,
      mensaje: `El producto "${producto.nombre}" aún no tiene receta ni ingredientes vinculados en el sistema. Puedes indicarme los ingredientes y cantidades para configurársela.`
    };
  }

  const insumoIds = lineasReceta.map(r => r.insumo_id).filter(Boolean);
  const subprodIds = lineasReceta.map(r => r.subproducto_id).filter(Boolean);

  const insumosMap = new Map<string, any>();
  if (insumoIds.length > 0) {
    const { data: insumos } = await supabase
      .from('inventario_insumos')
      .select('id, nombre, unidad_medida, costo_promedio, cantidad_actual')
      .in('id', insumoIds);
    (insumos || []).forEach(i => insumosMap.set(i.id, i));
  }

  const subprodsMap = new Map<string, any>();
  if (subprodIds.length > 0) {
    const { data: subprods } = await supabase
      .from('productos')
      .select('id, nombre, costo, precio_venta')
      .in('id', subprodIds);
    (subprods || []).forEach(p => subprodsMap.set(p.id, p));
  }

  let costoTotalReceta = 0;
  const itemsDesglosados = lineasReceta.map(linea => {
    const insumo = linea.insumo_id ? insumosMap.get(linea.insumo_id) : null;
    const subprod = linea.subproducto_id ? subprodsMap.get(linea.subproducto_id) : null;

    const nombre = insumo ? insumo.nombre : (subprod ? subprod.nombre : 'Elemento no identificado');
    const tipo = insumo ? 'insumo' : 'subproducto';
    const unidad = insumo ? insumo.unidad_medida : 'Und';
    const costoUnit = insumo ? Number(insumo.costo_promedio || 0) : (subprod ? Number(subprod.costo || 0) : 0);
    const cant = Number(linea.cantidad_necesaria || 0);
    const subtotal = Math.round(cant * costoUnit * 10000) / 10000;

    costoTotalReceta += subtotal;

    return {
      nombre,
      tipo,
      cantidad: cant,
      unidad_medida: unidad,
      costo_unitario_usd: Number(costoUnit.toFixed(4)),
      subtotal_costo_usd: Number(subtotal.toFixed(2))
    };
  });

  const precioVenta = Number(producto.precio_venta || 0);
  const margenBrutoUsd = Math.round((precioVenta - costoTotalReceta) * 100) / 100;
  const margenPct = precioVenta > 0 ? Math.round(((precioVenta - costoTotalReceta) / precioVenta) * 1000) / 10 : 0;
  const foodCostPct = precioVenta > 0 ? Math.round((costoTotalReceta / precioVenta) * 1000) / 10 : 0;

  return {
    producto: {
      id: producto.id,
      nombre: producto.nombre,
      precio_venta_usd: precioVenta,
      costo_catalogo_usd: Number(producto.costo || 0)
    },
    tiene_receta: true,
    costo_total_receta_usd: Number(costoTotalReceta.toFixed(2)),
    margen_bruto_usd: margenBrutoUsd,
    margen_porcentaje: margenPct,
    food_cost_porcentaje: foodCostPct,
    ingredientes: itemsDesglosados
  };
}

/**
 * 13. Proponer / armar la receta para un producto
 */
async function toolProponerReceta(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: {
    nombre_producto: string;
    ingredientes: Array<{
      nombre_ingrediente: string;
      cantidad: number;
      unidad?: string;
    }>;
    modo?: 'reemplazar' | 'agregar';
  }
) {
  const { supabase, empresaId } = ctx;
  const nombreBuscado = normalizarTexto(args.nombre_producto);

  // 1. Buscar producto en el catálogo
  const { data: todosProductos, error: prodErr } = await supabase
    .from('productos')
    .select('id, nombre, precio_venta, costo, es_compuesto')
    .eq('empresa_id', empresaId)
    .neq('archivado', true);

  if (prodErr) return { exito: false, error: `Error consultando productos: ${prodErr.message}` };
  if (!todosProductos || todosProductos.length === 0) {
    return { exito: false, error: 'No se encontraron productos en el catálogo.' };
  }

  let producto = todosProductos.find(p => normalizarTexto(p.nombre) === nombreBuscado);
  if (!producto) {
    producto = todosProductos.find(p => normalizarTexto(p.nombre).includes(nombreBuscado) || nombreBuscado.includes(normalizarTexto(p.nombre)));
  }
  if (!producto) {
    producto = todosProductos.find(p => esCoincidenciaAproximada(p.nombre, args.nombre_producto, 2));
  }

  if (!producto) {
    const sugerencias = todosProductos
      .filter(p => esCoincidenciaAproximada(p.nombre, args.nombre_producto, 3))
      .slice(0, 5)
      .map(p => p.nombre);

    return {
      exito: false,
      error: `No encontré el producto "${args.nombre_producto}" en tu catálogo. Asegúrate de que el producto exista o revisa el nombre.`,
      sugerencias: sugerencias.length > 0 ? sugerencias : todosProductos.slice(0, 5).map(p => p.nombre)
    };
  }

  // 2. Obtener insumos del inventario para vincular
  const { data: todosInsumos } = await supabase
    .from('inventario_insumos')
    .select('id, nombre, unidad_medida, costo_promedio, cantidad_actual, palabras_clave')
    .eq('empresa_id', empresaId);

  const insumosDisponibles = todosInsumos || [];
  const itemsResueltos: any[] = [];
  const noEncontrados: string[] = [];
  let costoTotalEstimado = 0;

  for (const ing of (args.ingredientes || [])) {
    const nomIng = normalizarTexto(ing.nombre_ingrediente);
    
    // Búsqueda en insumos
    let insumoEncontrado = insumosDisponibles.find(i => normalizarTexto(i.nombre) === nomIng);
    if (!insumoEncontrado) {
      insumoEncontrado = insumosDisponibles.find(i => {
        const nom = normalizarTexto(i.nombre);
        return nom.includes(nomIng) || nomIng.includes(nom);
      });
    }
    if (!insumoEncontrado) {
      insumoEncontrado = insumosDisponibles.find(i => {
        const kws = (i.palabras_clave || []).map((k: string) => normalizarTexto(k));
        return kws.some((k: string) => k.includes(nomIng) || nomIng.includes(k));
      });
    }
    if (!insumoEncontrado) {
      insumoEncontrado = insumosDisponibles.find(i => esCoincidenciaAproximada(i.nombre, ing.nombre_ingrediente, 2));
    }

    if (insumoEncontrado) {
      let cantidadFinal = Number(ing.cantidad) || 0;
      const unidadInsumo = insumoEncontrado.unidad_medida || 'Und';
      const unidadIngresada = (ing.unidad || '').toLowerCase().trim();

      // Conversión inteligente de unidades
      if (['kg', 'kilogramo', 'kilogramos', 'kilo', 'kilos'].includes(unidadInsumo.toLowerCase())) {
        if (['g', 'gr', 'gramos', 'gramo'].includes(unidadIngresada)) {
          cantidadFinal = cantidadFinal / 1000;
        } else if (['lb', 'libras', 'libra'].includes(unidadIngresada)) {
          cantidadFinal = cantidadFinal * 0.453592;
        } else if (['oz', 'onzas', 'onza'].includes(unidadIngresada)) {
          cantidadFinal = cantidadFinal * 0.0283495;
        } else if (!unidadIngresada && cantidadFinal >= 50) {
          cantidadFinal = cantidadFinal / 1000;
        }
      } else if (['lt', 'litro', 'litros', 'l'].includes(unidadInsumo.toLowerCase())) {
        if (['ml', 'cc', 'mililitro', 'mililitros'].includes(unidadIngresada)) {
          cantidadFinal = cantidadFinal / 1000;
        } else if (!unidadIngresada && cantidadFinal >= 50) {
          cantidadFinal = cantidadFinal / 1000;
        }
      } else if (['gr', 'gramo', 'gramos'].includes(unidadInsumo.toLowerCase())) {
        if (['kg', 'kilo', 'kilos'].includes(unidadIngresada)) {
          cantidadFinal = cantidadFinal * 1000;
        }
      } else if (['ml', 'mililitro'].includes(unidadInsumo.toLowerCase())) {
        if (['lt', 'l', 'litro', 'litros'].includes(unidadIngresada)) {
          cantidadFinal = cantidadFinal * 1000;
        }
      }

      cantidadFinal = Math.round(cantidadFinal * 10000) / 10000;
      const costoUnit = Number(insumoEncontrado.costo_promedio || 0);
      const subtotal = Math.round(cantidadFinal * costoUnit * 10000) / 10000;
      costoTotalEstimado += subtotal;

      itemsResueltos.push({
        tipo: 'insumo',
        id: insumoEncontrado.id,
        nombre: insumoEncontrado.nombre,
        cantidad: cantidadFinal,
        unidad_medida: unidadInsumo,
        costo_unitario: Number(costoUnit.toFixed(4)),
        subtotal: Number(subtotal.toFixed(2))
      });
      continue;
    }

    // Si no es insumo de almacén, buscar como subproducto en el catálogo
    const subprodEncontrado = todosProductos.find(p => p.id !== producto.id && (
      normalizarTexto(p.nombre) === nomIng ||
      normalizarTexto(p.nombre).includes(nomIng) ||
      esCoincidenciaAproximada(p.nombre, ing.nombre_ingrediente, 2)
    ));

    if (subprodEncontrado) {
      const cantidadFinal = Number(ing.cantidad) || 1;
      const costoUnit = Number(subprodEncontrado.costo || subprodEncontrado.precio_venta || 0);
      const subtotal = Math.round(cantidadFinal * costoUnit * 10000) / 10000;
      costoTotalEstimado += subtotal;

      itemsResueltos.push({
        tipo: 'producto',
        id: subprodEncontrado.id,
        nombre: subprodEncontrado.nombre,
        cantidad: cantidadFinal,
        unidad_medida: 'Und',
        costo_unitario: Number(costoUnit.toFixed(4)),
        subtotal: Number(subtotal.toFixed(2))
      });
      continue;
    }

    noEncontrados.push(ing.nombre_ingrediente);
  }

  if (itemsResueltos.length === 0) {
    return {
      exito: false,
      error: `No pude asociar ningún ingrediente con los insumos existentes en el inventario. Insumos no encontrados: ${noEncontrados.join(', ')}. Verifica que estén creados en Inventario / Almacén.`
    };
  }

  const precioVenta = Number(producto.precio_venta || 0);
  const costoTotalRedondeado = Math.round(costoTotalEstimado * 100) / 100;
  const margenUsd = Math.round((precioVenta - costoTotalRedondeado) * 100) / 100;
  const margenPct = precioVenta > 0 ? Math.round(((precioVenta - costoTotalRedondeado) / precioVenta) * 1000) / 10 : 0;
  const foodCostPct = precioVenta > 0 ? Math.round((costoTotalRedondeado / precioVenta) * 1000) / 10 : 0;

  return {
    exito: true,
    producto: {
      id: producto.id,
      nombre: producto.nombre,
      precio_venta: precioVenta,
      costo_anterior: Number(producto.costo || 0)
    },
    modo: args.modo || 'reemplazar',
    items: itemsResueltos,
    costo_total_receta: costoTotalRedondeado,
    precio_venta: precioVenta,
    margen_bruto_usd: margenUsd,
    margen_estimado_pct: margenPct,
    food_cost_pct: foodCostPct,
    ingredientes_no_encontrados: noEncontrados
  };
}

/**
 * 14. Proponer y configurar un combo / promoción
 */
async function toolProponerCombo(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: {
    nombre_combo: string;
    items: Array<{
      nombre_producto: string;
      cantidad: number;
    }>;
    precio_combo?: number;
    descripcion?: string;
  }
) {
  const { supabase, empresaId } = ctx;

  const { data: todosProductos, error: prodErr } = await supabase
    .from('productos')
    .select('id, nombre, precio_venta, costo, categoria_id, estado_activo')
    .eq('empresa_id', empresaId)
    .neq('archivado', true);

  if (prodErr) return { exito: false, error: `Error consultando productos: ${prodErr.message}` };
  if (!todosProductos || todosProductos.length === 0) {
    return { exito: false, error: 'No se encontraron productos en el catálogo para armar el combo.' };
  }

  const itemsResueltos: any[] = [];
  const noEncontrados: string[] = [];
  let sumaPreciosLista = 0;
  let totalUnidades = 0;

  for (const item of (args.items || [])) {
    const busqueda = normalizarTexto(item.nombre_producto);
    const cant = Number(item.cantidad) || 1;

    let prod = todosProductos.find(p => normalizarTexto(p.nombre) === busqueda);
    if (!prod) {
      prod = todosProductos.find(p => {
        const nom = normalizarTexto(p.nombre);
        return nom.includes(busqueda) || busqueda.includes(nom);
      });
    }
    if (!prod) {
      const palabras = busqueda.split(/\s+/).filter(w => w.length >= 2);
      prod = todosProductos.find(p => {
        const nom = normalizarTexto(p.nombre);
        return palabras.every(w => {
          if (w === 'ref' || w === 'refres') return nom.includes('refres') || nom.includes('soda') || nom.includes('bebida') || nom.includes('pepsi') || nom.includes('coca');
          if (w.startsWith('2l') || w === '2lt') return nom.includes('2l') || nom.includes('2 l') || nom.includes('2lt') || nom.includes('2 litros');
          return nom.includes(w) || esCoincidenciaAproximada(nom, w, 2);
        });
      });
    }
    if (!prod) {
      prod = todosProductos.find(p => esCoincidenciaAproximada(p.nombre, item.nombre_producto, 2));
    }

    if (prod) {
      const precioUnit = Number(prod.precio_venta || 0);
      const subtotal = Math.round(cant * precioUnit * 100) / 100;
      sumaPreciosLista += subtotal;
      totalUnidades += cant;

      itemsResueltos.push({
        producto_id: prod.id,
        nombre: prod.nombre,
        cantidad: cant,
        precio_unitario: precioUnit,
        subtotal
      });
    } else {
      noEncontrados.push(item.nombre_producto);
    }
  }

  if (itemsResueltos.length === 0) {
    return {
      exito: false,
      error: `No pude encontrar los productos indicados en tu catálogo (${noEncontrados.join(', ')}). Verifica que existan en el Catálogo de Productos.`
    };
  }

  let precioFinalCombo = typeof args.precio_combo === 'number' && args.precio_combo > 0
    ? args.precio_combo
    : Math.round(sumaPreciosLista * 100) / 100;

  const ahorro = Math.max(0, Math.round((sumaPreciosLista - precioFinalCombo) * 100) / 100);
  const ahorroPct = sumaPreciosLista > 0 && ahorro > 0
    ? Math.round((ahorro / sumaPreciosLista) * 100)
    : 0;

  const gruposConfig = itemsResueltos.map(it => ({
    titulo: `${it.cantidad}x ${it.nombre}`,
    cantidad: it.cantidad,
    filtro_tipo: 'PRODUCTOS' as const,
    productos_permitidos: [it.producto_id],
    permitir_repetidos: true
  }));

  const configSeleccion = {
    cantidad_total: totalUnidades,
    cobrar_cantidad: totalUnidades,
    grupos: gruposConfig
  };

  const descripcionGenerada = args.descripcion || 
    itemsResueltos.map(it => `${it.cantidad}x ${it.nombre}`).join(' + ');

  return {
    exito: true,
    nombre: args.nombre_combo,
    descripcion: descripcionGenerada,
    tipo: 'COMBO_GRUPOS',
    regla_precio: 'PRECIO_FIJO',
    precio_fijo: precioFinalCombo,
    precio_lista_total: sumaPreciosLista,
    ahorro_usd: ahorro,
    ahorro_porcentaje: ahorroPct,
    items: itemsResueltos,
    config_seleccion: configSeleccion,
    productos_no_encontrados: noEncontrados
  };
}

// ==========================================
// DECLARACIONES DE HERRAMIENTAS PARA GEMINI
// ==========================================

const copilotTools: { functionDeclarations: FunctionDeclaration[] } = {
  functionDeclarations: [
    {
      name: 'consultar_tasa_cambio',
      description: 'Consulta la tasa oficial de cambio (BCV o manual) de un día en específico en formato YYYY-MM-DD o del día de hoy.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          fecha: {
            type: SchemaType.STRING,
            description: 'Fecha en formato YYYY-MM-DD para consultar la tasa (ej: "2026-10-14"). Si no se envía, toma hoy.',
          }
        }
      }
    },
    {
      name: 'consultar_balance_dia',
      description: 'Consulta las ventas (incluyendo el turno de cenas/nocturno) y compras de un día específico, expresadas tanto en Dólares (USD) como en Bolívares (VES) convertidas a la tasa oficial de ese día.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          fecha: {
            type: SchemaType.STRING,
            description: 'Fecha en formato YYYY-MM-DD (ej: "2026-10-14").',
          },
          turno: {
            type: SchemaType.STRING,
            description: 'Filtro de turno: "todo_el_dia", "cenas_nocturno" o "almuerzo".',
          },
          sede_nombre: {
            type: SchemaType.STRING,
            description: 'Opcional. Nombre o número de la sede a consultar (ej: "sede 1", "sede 2", "sede principal", "sede norte"). Dejar vacío para consultar todas o la sede activa.',
          }
        },
        required: ['fecha']
      }
    },
    {
      name: 'consultar_ventas_por_metodo_pago',
      description: 'Consulta el total de ventas cobradas con un método de pago en específico (como Pago Móvil, Punto de Venta, Efectivo USD, Zelle) desglosadas por cada una de las sedes del negocio en un día o periodo.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          metodo_pago: {
            type: SchemaType.STRING,
            description: 'Nombre del método de pago a consultar (ej: "pago_movil", "efectivo_usd", "punto_de_venta", "zelle").',
          },
          periodo_o_fecha: {
            type: SchemaType.STRING,
            description: 'Fecha (YYYY-MM-DD) o periodo: "hoy", "ayer", "esta_semana", "este_mes".',
          },
          sede_nombre: {
            type: SchemaType.STRING,
            description: 'Opcional. Nombre o número de sede específica a consultar (ej: "sede 1", "sede principal"). Dejar vacío para ver el desglose comparativo de todas las sedes.',
          }
        },
        required: ['metodo_pago']
      }
    },
    {
      name: 'proponer_fusion_marcas',
      description: 'Prepara y propone la fusión de marcas de insumos en el inventario. El insumo principal conserva el registro y los nombres de las marcas secundarias se agregan a sus palabras clave (alias), sumando sus existencias. Requiere confirmación.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          insumo_principal_nombre: {
            type: SchemaType.STRING,
            description: 'Nombre del insumo principal que permanecerá en el catálogo (ej: "Harina de Maíz").',
          },
          insumos_a_fusionar_nombres: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: 'Lista de nombres de marcas o insumos que serán absorbidos y añadidos como palabras clave (ej: ["Harina PAN", "Harina Juana"]).',
          }
        },
        required: ['insumo_principal_nombre', 'insumos_a_fusionar_nombres']
      }
    },
    {
      name: 'proponer_agrupacion_similares',
      description: 'Prepara y propone la agrupación de productos del catálogo como similares / sustitutos bajo un mismo grupo o principio activo (ej: "Acetaminofén 500mg", "Refresco Cola 1.5L", "Ibuprofeno 400mg"). Esto habilita la alternativa de cambio directo en el carrito de Niteo POS. Requiere confirmación.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          nombre_grupo: {
            type: SchemaType.STRING,
            description: 'Nombre del grupo de similares o principio activo (ej: "Acetaminofén 500mg" o "Refresco Cola 1.5L").',
          },
          productos_nombres_o_ids: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: 'Lista de nombres o IDs de los productos a agrupar como similares (ej: ["Atamel 500mg", "Tachipirin 500mg", "Acetaminofen"]).',
          }
        },
        required: ['nombre_grupo', 'productos_nombres_o_ids']
      }
    },
    {
      name: 'proponer_despacho_sedes',
      description: 'Prepara un despacho o traslado de mercancía/insumos entre sedes indicando origen, destino y lista de ítems con sus cantidades. Verifica stock en origen y propone la emisión con confirmación del usuario.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          sede_origen_nombre: {
            type: SchemaType.STRING,
            description: 'Nombre o parte del nombre de la sede origen (ej: "Sede Principal", "Centro").',
          },
          sede_destino_nombre: {
            type: SchemaType.STRING,
            description: 'Nombre o parte del nombre de la sede destino (ej: "Sede Norte", "Sucursal 2").',
          },
          items: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                nombre_insumo: { type: SchemaType.STRING, description: 'Nombre del insumo a trasladar' },
                cantidad: { type: SchemaType.NUMBER, description: 'Cantidad a trasladar' }
              },
              required: ['nombre_insumo', 'cantidad']
            },
            description: 'Lista de insumos y cantidades a despachar.',
          },
          notas: {
            type: SchemaType.STRING,
            description: 'Notas u observaciones del traslado.',
          }
        },
        required: ['sede_origen_nombre', 'sede_destino_nombre', 'items']
      }
    },
    {
      name: 'proponer_venta_al_costo',
      description: 'Prepara una salida de inventario por "Venta al Costo" (sin margen de ganancia) para un empleado o beneficiario específico, calculando el costo unitario y total en USD y Bs. Requiere privilegio de Venta al Costo.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          beneficiario: {
            type: SchemaType.STRING,
            description: 'Nombre completo del beneficiario (empleado, socio o persona que recibe el producto al costo).',
          },
          items: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                nombre_insumo: { type: SchemaType.STRING, description: 'Nombre del insumo a retirar' },
                cantidad: { type: SchemaType.NUMBER, description: 'Cantidad a vender al costo' }
              },
              required: ['nombre_insumo', 'cantidad']
            },
            description: 'Lista de insumos y cantidades.',
          },
          notas: {
            type: SchemaType.STRING,
            description: 'Observaciones o motivo de la venta al costo.',
          }
        },
        required: ['beneficiario', 'items']
      }
    },
    {
      name: 'consultar_ventas',
      description: 'Consulta el reporte y métricas de ventas agregadas (ranking de productos más vendidos, cantidades por producto o categoría, total recaudado en USD) en un periodo.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          periodo: {
            type: SchemaType.STRING,
            description: 'Periodo a consultar: hoy, ayer, esta_semana, este_mes, ultimos_30_dias, ultimos_6_meses, año_actual.',
          },
          filtro_producto: {
            type: SchemaType.STRING,
            description: 'Texto o fragmento del nombre del producto a filtrar.',
          },
          limite: {
            type: SchemaType.NUMBER,
            description: 'Cantidad máxima de productos a listar (por defecto 10).',
          },
          ordenar_por: {
            type: SchemaType.STRING,
            description: 'Orden del ranking: "mas_vendidos" o "menos_vendidos".',
          },
          sede_nombre: {
            type: SchemaType.STRING,
            description: 'Opcional. Nombre o número de la sede a filtrar (ej: "sede 1", "sede principal", "sede norte"). Dejar vacío para ver el consolidado general.',
          }
        },
        required: ['periodo']
      }
    },
    {
      name: 'consultar_consumo_insumo',
      description: 'Consulta el consumo de materia prima o insumo (reales y teóricos por recetas de productos vendidos) en un periodo.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          nombre_insumo: {
            type: SchemaType.STRING,
            description: 'Nombre o parte del nombre del insumo (ej: "mozzarella", "queso", "harina").',
          },
          periodo: {
            type: SchemaType.STRING,
            description: 'Periodo de tiempo: hoy, esta_semana, este_mes, ultimos_30_dias.',
          }
        },
        required: ['nombre_insumo']
      }
    },
    {
      name: 'auditar_compras_sospechosas',
      description: 'Audita y detecta posibles compras duplicadas registradas en un mismo día con montos idénticos o casi iguales.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          dias_atras: { type: SchemaType.NUMBER, description: 'Días hacia atrás a analizar (por defecto 30).' },
          margen_tolerancia_usd: { type: SchemaType.NUMBER, description: 'Margen de diferencia máxima en USD (por defecto 0.05).' }
        }
      }
    },
    {
      name: 'buscar_combos_inactivos',
      description: 'Identifica y lista promociones o combos activos que NO han registrado ventas en los últimos N meses.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          meses_inactividad: { type: SchemaType.NUMBER, description: 'Meses sin ventas para clasificarlo como inactivo (por defecto 6).' }
        }
      }
    },
    {
      name: 'consultar_receta',
      description: 'Consulta los ingredientes, cantidades, unidades y costo de preparación (escandallo) de la receta de un producto, así como su precio de venta y margen de ganancia.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          nombre_producto: {
            type: SchemaType.STRING,
            description: 'Nombre o parte del nombre del producto a consultar su receta (ej: "Pizza Margarita", "Hamburguesa Clásica").',
          }
        },
        required: ['nombre_producto']
      }
    },
    {
      name: 'proponer_receta',
      description: 'Ayuda a crear, armar o actualizar la receta/escandallo de un producto del catálogo vinculando insumos del almacén con sus cantidades y calculando el costo total y margen. Genera una propuesta interactiva para guardar la receta con confirmación del usuario.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          nombre_producto: {
            type: SchemaType.STRING,
            description: 'Nombre del producto al que se le asignará o actualizará la receta.',
          },
          ingredientes: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                nombre_ingrediente: {
                  type: SchemaType.STRING,
                  description: 'Nombre del insumo o ingrediente en el almacén (ej: "queso mozzarella", "harina de trigo", "salsa de tomate", "pan de hamburguesa").'
                },
                cantidad: {
                  type: SchemaType.NUMBER,
                  description: 'Cantidad necesaria para 1 unidad del producto (ej: 0.25, 200, 1).'
                },
                unidad: {
                  type: SchemaType.STRING,
                  description: 'Opcional. Unidad de medida indicada por el usuario (ej: "g", "kg", "ml", "litros", "und"). Si no se envía, se deduce inteligentemente.'
                }
              },
              required: ['nombre_ingrediente', 'cantidad']
            },
            description: 'Lista de ingredientes con cantidades para armar la receta.',
          },
          modo: {
            type: SchemaType.STRING,
            description: 'Opcional. "reemplazar" (por defecto, borra la receta anterior y guarda la nueva) o "agregar" (añade ingredientes a la receta existente).'
          }
        },
        required: ['nombre_producto', 'ingredientes']
      }
    },
    {
      name: 'proponer_combo',
      description: 'Prepara y propone la creación de un nuevo Combo o Promoción especial en el catálogo (ej: "Combo Fiesta con 2 pizzas familiares tradicionales, 1 con maíz y un refresco 2L por $25"). Busca los productos en el catálogo, calcula precios de lista y prepara la confirmación para guardarlo y activarlo en ventas.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          nombre_combo: {
            type: SchemaType.STRING,
            description: 'Nombre del combo o promoción (ej: "Combo Fiesta", "Combo Familiar", "Dúo Clásico").'
          },
          items: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                nombre_producto: {
                  type: SchemaType.STRING,
                  description: 'Nombre o descripción del producto incluido en el combo (ej: "pizza familiar tradicional", "pizza con maiz", "refresco 2lt").'
                },
                cantidad: {
                  type: SchemaType.NUMBER,
                  description: 'Cantidad de unidades de este producto en el combo (ej: 2, 1).'
                }
              },
              required: ['nombre_producto', 'cantidad']
            },
            description: 'Lista de productos que componen el combo con sus cantidades.'
          },
          precio_combo: {
            type: SchemaType.NUMBER,
            description: 'Opcional. Precio de venta fijo del combo en USD (ej: 25). Si el usuario no especificó precio, se calcula a partir de la suma de precios de lista.'
          },
          descripcion: {
            type: SchemaType.STRING,
            description: 'Opcional. Breve descripción de lo que incluye el combo.'
          }
        },
        required: ['nombre_combo', 'items']
      }
    }
  ]
};

// ==========================================
// ORQUESTADOR PRINCIPAL DEL CHAT CON GEMINI
// ==========================================

export interface CopilotRespuesta {
  texto: string;
  accionPropuesta?: {
    tipo: 'desactivar_combos' | 'fusionar_insumos' | 'ejecutar_despacho' | 'ejecutar_venta_costo' | 'guardar_receta' | 'agrupar_similares' | 'crear_combo';
    titulo: string;
    items?: any[];
    detalles?: any;
  };
  error?: string;
}

export async function enviarMensajeCopilot({
  mensaje,
  historial = [],
  activeSedeId
}: {
  mensaje: string;
  historial?: { role: 'user' | 'model'; parts: { text: string }[] }[];
  activeSedeId?: string;
}): Promise<CopilotRespuesta> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return {
        texto: 'Error de configuración: No se ha detectado GEMINI_API_KEY en las variables de entorno del servidor.',
        error: 'missing_api_key'
      };
    }

    const ctx = await getCopilotAuthContext(activeSedeId);
    const apiKey = process.env.GEMINI_API_KEY;

    const sedesListStr = ctx.sedes
      .map((s, idx) => `Sede ${idx + 1}: "${s.nombre_sede}" (ID: ${s.id})`)
      .join(' | ');

    const systemInstruction = `
Eres "Niteo Copilot", el asistente inteligente y analítico de la plataforma Niteo.
Usuario: ${ctx.userName} (Rol: ${ctx.rol}).
Empresa: "${ctx.empresa.nombre_comercial}" (Moneda: ${ctx.empresa.moneda} ${ctx.empresa.simbolo_moneda}).
Catálogo Oficial de Sedes: ${sedesListStr}.
Privilegio Venta al Costo: ${ctx.permisoVentaCosto ? 'HABILITADO' : 'DENEGADO'}.
Zona horaria: ${DEFAULT_TIMEZONE} (Venezuela / Caracas).

PERSONALIDAD Y TONO (AMIGABLE, COMPRENSIVO Y ULTRA-EFICIENTE EN TOKENS):
- Sé cálido, empático, profesional y cordial (ej. "¡Hola! Con gusto te ayudo a revisar eso 😊", "¡Por supuesto! Aquí tienes el balance:").
- NUNCA respondas seco, robótico ni cortante. Haz sentir al usuario acompañado y en confianza.
- AHORRO MÁXIMO DE TOKENS: Sé muy concreto y directo en la entrega de datos. Evita introducciones largas o despedidas innecesarias. Presenta los números clave en negritas, listas o tablas compactas de Markdown. Amigable pero conciso.

RESOLUCIÓN INTELIGENTE DE SEDES:
- Si el usuario dice "sede 1", "sucursal 1", "la 1", o similar, corresponde EXACTAMENTE a la primera sede: "${ctx.sedes[0]?.nombre_sede || 'Sede Principal'}".
- Si dice "sede 2", "sucursal 2", "la 2", corresponde a la segunda sede: "${ctx.sedes[1]?.nombre_sede || 'Sede Secundaria'}".
- Si dice "sede principal", "la principal" o "central", asóciala con la sede principal (o la primera sede).
- Si menciona el nombre directamente (ej. "Sede Norte", "Centro"), identifícala por coincidencia de texto.

TOLERANCIA A ERRORES ORTOGRÁFICOS Y TIPOGRÁFICOS (TYPOS):
- El usuario puede cometer faltas de ortografía, escribir rápido desde el celular o alterar letras (ej. "pisa" por "pizza", "mozarela" por "mozzarella", "sed 1" por "sede 1", "pago movl" por "pago móvil", "harinapan" por "harina pan", "despaho" por "despacho").
- Entiende SIEMPRE su intención real de forma inteligente y amable, sin juzgar ni corregir al usuario innecesariamente.
- Al invocar las herramientas de consulta, pasa los términos normalizados para asegurar el acierto, aunque la base de datos también cuenta con búsqueda difusa Levenshtein de respaldo.

REGLAS DE OPERACIÓN:
1. NUNCA INVENTES CIFRAS NI DATOS. Consulta siempre las herramientas para obtener datos verídicos de la base de datos.
2. Si te preguntan por tasas de cambio de un día, ventas y compras en dólares y bolívares, pagos en Pago Móvil por sede, o consumos de insumos, llama a la herramienta adecuada.
3. Si el usuario te indica una regla de conversión (ej. "una barra pesa 3kg"), calcula la división matemáticamente sobre los kg devueltos por la herramienta y explícalo claramente.
4. ASISTENCIA Y ESCANDALLO DE RECETAS:
   - Para consultar los ingredientes, escandallo de costos y márgenes de un producto del catálogo, llama a "consultar_receta".
   - Si el usuario te pide armar, crear o actualizar una receta (o te lista qué ingredientes lleva un plato, ej. "La pizza margarita lleva 250g de masa, 150g de mozzarella y 80g de salsa"), llama inmediatamente a "proponer_receta" para vincular los insumos del almacén y preparar la tarjeta interactiva de guardado.
   - Si el usuario te pide ideas o sugerencias de recetas para su negocio, asesóralo gastronómicamente con entusiasmo y propón recetas prácticas usando los insumos que tenga.
5. CREACIÓN Y GESTIÓN DE COMBOS Y PROMOCIONES:
   - Si el usuario te pide crear o armar un combo o promoción (ej: "hazme el combo fiesta que lleva 2 pizzas familiares tradicionales, 1 con maiz y un ref 2lt"), llama inmediatamente a "proponer_combo".
   - Extrae los productos indicados y sus cantidades.
   - Si el usuario no especificó el precio, la herramienta sumará los precios de lista individuales de los productos. En tu respuesta, presenta el desglose claro y sugiere un precio atractivo o indícale que puede confirmarlo para que quede disponible en el punto de venta.
6. Para acciones que modifican datos (desactivar combos, fusionar marcas, despachos entre sedes, ventas al costo, guardar recetas o crear combos):
   - NUNCA afirmes haber ejecutado la mutación en la base de datos de inmediato.
   - Llama a la herramienta "proponer_*" correspondiente.
   - Describe la propuesta amablemente con los números exactos e invita al usuario a confirmar mediante el botón en pantalla.
    `.trim();

    const modelNamesToTry = [
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-flash-latest',
      'gemini-3.5-flash',
      'gemini-3.8-flash'
    ];
    let lastError: any = null;

    // Preparar historial inicial en formato nativo de Gemini
    const contents: Array<{ role: string; parts: any[] }> = (historial || []).map(h => ({
      role: h.role,
      parts: h.parts
    }));
    contents.push({
      role: 'user',
      parts: [{ text: mensaje }]
    });

    const systemInstructionPayload = {
      parts: [{ text: systemInstruction }]
    };

    for (const modelName of modelNamesToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const activeContents = JSON.parse(JSON.stringify(contents));

        let res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: activeContents,
            tools: [copilotTools],
            systemInstruction: systemInstructionPayload
          })
        });

        let data = await res.json();
        if (data.error) {
          throw new Error(`[${modelName}] ${data.error.message || 'Error API'}`);
        }

        let candidate = data.candidates?.[0];
        if (!candidate || !candidate.content) {
          throw new Error(`[${modelName}] No se recibió candidato válido de Gemini.`);
        }

        let accionPropuesta: CopilotRespuesta['accionPropuesta'] = undefined;
        let toolLoops = 0;
        const maxLoops = 6;

        while (candidate?.content?.parts && toolLoops < maxLoops) {
          const fnCalls = candidate.content.parts.filter((p: any) => p.functionCall);
          if (fnCalls.length === 0) break;

          toolLoops++;
          // Preservar la respuesta del modelo con su thoughtSignature e IDs
          activeContents.push(candidate.content);

          const functionResponses: any[] = [];

          for (const part of fnCalls) {
            const call = part.functionCall;
            let toolResult: any = null;

            try {
              switch (call.name) {
                case 'consultar_tasa_cambio':
                  toolResult = await toolConsultarTasaCambio(ctx, call.args || {});
                  break;
                case 'consultar_balance_dia':
                  toolResult = await toolConsultarBalanceDia(ctx, call.args || {});
                  break;
                case 'consultar_ventas_por_metodo_pago':
                  toolResult = await toolConsultarVentasPorMetodoPago(ctx, call.args || {});
                  break;
                case 'consultar_ventas':
                  toolResult = await toolConsultarVentas(ctx, call.args || {});
                  break;
                case 'consultar_consumo_insumo':
                  toolResult = await toolConsultarConsumoInsumo(ctx, call.args || {});
                  break;
                case 'auditar_compras_sospechosas':
                  toolResult = await toolAuditarComprasSospechosas(ctx, call.args || {});
                  break;
                case 'buscar_combos_inactivos': {
                  toolResult = await toolBuscarCombosInactivos(ctx, call.args || {});
                  if (toolResult?.combos_inactivos && toolResult.combos_inactivos.length > 0) {
                    accionPropuesta = {
                      tipo: 'desactivar_combos',
                      titulo: `Desactivar ${toolResult.combos_inactivos.length} promociones/combos inactivos`,
                      items: toolResult.combos_inactivos.map((c: any) => ({ id: c.id, nombre: c.nombre }))
                    };
                  }
                  break;
                }
                case 'proponer_fusion_marcas': {
                  toolResult = await toolProponerFusionMarcas(ctx, call.args || {});
                  if (toolResult?.exito) {
                    accionPropuesta = {
                      tipo: 'fusionar_insumos',
                      titulo: `Confirmar Fusión en "${toolResult.insumo_principal.nombre}"`,
                      detalles: {
                        masterId: toolResult.insumo_principal.id,
                        masterNombre: toolResult.insumo_principal.nombre,
                        slaveIds: toolResult.insumos_a_absorber.map((s: any) => s.id),
                        slaveNombres: toolResult.insumos_a_absorber.map((s: any) => s.nombre),
                        stockTotal: toolResult.stock_total_resultante,
                        unidadMedida: toolResult.insumo_principal.unidad_medida,
                        keywords: toolResult.palabras_clave_resultantes
                      }
                    };
                  }
                  break;
                }
                case 'proponer_agrupacion_similares': {
                  toolResult = await toolProponerAgrupacionSimilares(ctx, call.args || {});
                  if (toolResult?.exito) {
                    accionPropuesta = {
                      tipo: 'agrupar_similares',
                      titulo: `Agrupar ${toolResult.total} productos en "${toolResult.grupo}"`,
                      detalles: {
                        grupo: toolResult.grupo,
                        productoIds: toolResult.productos.map((p: any) => p.id),
                        productos: toolResult.productos
                      }
                    };
                  }
                  break;
                }
                case 'proponer_despacho_sedes': {
                  toolResult = await toolProponerDespachoSedes(ctx, call.args || {});
                  if (toolResult?.exito) {
                    accionPropuesta = {
                      tipo: 'ejecutar_despacho',
                      titulo: `Confirmar Despacho: ${toolResult.origen.nombre} ➔ ${toolResult.destino.nombre}`,
                      detalles: {
                        origenId: toolResult.origen.id,
                        destinoId: toolResult.destino.id,
                        origenNombre: toolResult.origen.nombre,
                        destinoNombre: toolResult.destino.nombre,
                        items: toolResult.items,
                        notas: toolResult.notas
                      }
                    };
                  }
                  break;
                }
                case 'proponer_venta_al_costo': {
                  toolResult = await toolProponerVentaAlCosto(ctx, call.args || {});
                  if (toolResult?.exito) {
                    accionPropuesta = {
                      tipo: 'ejecutar_venta_costo',
                      titulo: `Confirmar Venta al Costo: ${toolResult.beneficiario} ($${toolResult.costo_total_usd} USD)`,
                      detalles: {
                        beneficiario: toolResult.beneficiario,
                        items: toolResult.items,
                        costoTotalUsd: toolResult.costo_total_usd,
                        costoTotalBs: toolResult.costo_total_bs,
                        notas: toolResult.notas
                      }
                    };
                  }
                  break;
                }
                case 'consultar_receta': {
                  toolResult = await toolConsultarReceta(ctx, call.args || {});
                  break;
                }
                case 'proponer_receta': {
                  toolResult = await toolProponerReceta(ctx, call.args || {});
                  if (toolResult?.exito && toolResult.items && toolResult.items.length > 0) {
                    accionPropuesta = {
                      tipo: 'guardar_receta',
                      titulo: `Guardar Receta: ${toolResult.producto.nombre}`,
                      detalles: {
                        productoId: toolResult.producto.id,
                        productoNombre: toolResult.producto.nombre,
                        items: toolResult.items,
                        costoTotal: toolResult.costo_total_receta,
                        precioVenta: toolResult.precio_venta,
                        margenEstimadoPct: toolResult.margen_estimado_pct,
                        foodCostPct: toolResult.food_cost_pct,
                        modo: toolResult.modo
                      }
                    };
                  }
                  break;
                }
                case 'proponer_combo': {
                  toolResult = await toolProponerCombo(ctx, call.args || {});
                  if (toolResult?.exito && toolResult.items && toolResult.items.length > 0) {
                    accionPropuesta = {
                      tipo: 'crear_combo',
                      titulo: `Crear Combo: "${toolResult.nombre}" ($${toolResult.precio_fijo} USD)`,
                      items: toolResult.items.map((it: any) => ({
                        id: it.producto_id,
                        nombre: `${it.cantidad}x ${it.nombre} ($${it.subtotal} USD)`
                      })),
                      detalles: {
                        nombre: toolResult.nombre,
                        descripcion: toolResult.descripcion,
                        tipo: toolResult.tipo,
                        regla_precio: toolResult.regla_precio,
                        precio_fijo: toolResult.precio_fijo,
                        precio_lista_total: toolResult.precio_lista_total,
                        ahorro_usd: toolResult.ahorro_usd,
                        ahorro_pct: toolResult.ahorro_porcentaje,
                        config_seleccion: toolResult.config_seleccion,
                        items: toolResult.items
                      }
                    };
                  }
                  break;
                }
                default:
                  toolResult = { error: `Herramienta desconocida: ${call.name}` };
              }
            } catch (toolExecErr: any) {
              console.error(`[Copilot] Error al ejecutar herramienta "${call.name}":`, toolExecErr);
              toolResult = { error: `No se pudo obtener información: ${toolExecErr?.message || 'Error interno'}` };
            }

            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: toolResult || { exito: true }
              }
            });
          }

          // En la API nativa de Gemini, las respuestas a functionCalls se envían con role: "user"
          activeContents.push({
            role: 'user',
            parts: functionResponses
          });

          res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: activeContents,
              tools: [copilotTools],
              systemInstruction: systemInstructionPayload
            })
          });

          data = await res.json();
          if (data.error) {
            throw new Error(`[${modelName}] ${data.error.message || 'Error en turno de función'}`);
          }

          candidate = data.candidates?.[0];
        }

        const textPart = candidate?.content?.parts?.find((p: any) => p.text);
        const textoFinal = textPart?.text || (accionPropuesta
          ? 'He analizado los datos y preparado la propuesta. Puedes confirmarla a continuación:'
          : 'He procesado tu consulta correctamente.');

        return {
          texto: textoFinal,
          accionPropuesta
        };
      } catch (err: any) {
        lastError = err;
        console.warn(`[Copilot] Falló modelo ${modelName}, intentando siguiente...`, err?.message || err);
        continue;
      }
    }

    throw lastError || new Error('No se pudo conectar con los modelos de Gemini.');
  } catch (err: any) {
    console.error('[Copilot] Error general:', err);
    return {
      texto: err?.message?.includes('ACCESO_DENEGADO')
        ? err.message
        : 'Los servidores de Gemini están experimentando una alta demanda temporal en este momento. Por favor espera unos segundos e intenta nuevamente.',
      error: err?.message || 'Error desconocido'
    };
  }
}

/**
 * Ejecuta una acción interactiva confirmada directamente por el usuario desde la interfaz
 */
export async function ejecutarAccionCopilot({
  accion,
  payload,
  activeSedeId
}: {
  accion: 'desactivar_combos' | 'fusionar_insumos' | 'agrupar_similares' | 'ejecutar_despacho' | 'ejecutar_venta_costo' | 'guardar_receta' | 'crear_combo';
  payload: any;
  activeSedeId?: string;
}): Promise<{ success: boolean; mensaje: string; error?: string }> {
  try {
    const ctx = await getCopilotAuthContext(activeSedeId);

    switch (accion) {
      case 'desactivar_combos': {
        const { supabase, empresaId } = ctx;
        const comboIds = payload.combo_ids || [];
        if (comboIds.length === 0) return { success: false, mensaje: 'No se enviaron IDs de combos para desactivar.' };

        const { data: actualizados, error } = await supabase
          .from('promociones_combos')
          .update({ estado_activo: false })
          .in('id', comboIds)
          .eq('empresa_id', empresaId)
          .select('id, nombre');

        if (error) return { success: false, mensaje: `Error desactivando combos: ${error.message}` };

        revalidatePath('/dashboard/promociones');
        revalidatePath('/dashboard/terminal');
        return { success: true, mensaje: `Se han desactivado ${(actualizados || []).length} promociones/combos correctamente.` };
      }

      case 'fusionar_insumos': {
        const { masterId, slaveIds } = payload;
        if (!masterId || !slaveIds || slaveIds.length === 0) {
          return { success: false, mensaje: 'Datos incompletos para la fusión de insumos.' };
        }
        const res = await mergeInsumos(masterId, slaveIds);
        if (!res.success) return { success: false, mensaje: res.error || 'Error fusionando insumos.' };

        revalidatePath('/dashboard/inventario');
        return { success: true, mensaje: `Fusión completada. El stock consolidado es de ${res.newStock} unidades y las marcas se agregaron a las palabras clave.` };
      }

      case 'agrupar_similares': {
        const { grupo, productoIds } = payload;
        if (!grupo || !productoIds || productoIds.length === 0) {
          return { success: false, mensaje: 'Datos incompletos para agrupar similares.' };
        }
        const { bulkAsignarGrupoSimilar } = await import('@/actions/catalogo-actions');
        const res = await bulkAsignarGrupoSimilar(productoIds, grupo);
        if (!res.success) return { success: false, mensaje: res.error || 'Error agrupando productos.' };

        revalidatePath('/dashboard/catalogo');
        return { success: true, mensaje: `Se agruparon ${productoIds.length} productos bajo "${grupo}" exitosamente.` };
      }

      case 'guardar_receta': {
        const { productoId, items, modo, costoTotal } = payload;
        if (!productoId || !items || items.length === 0) {
          return { success: false, mensaje: 'Datos incompletos para guardar la receta.' };
        }
        const { supabase, empresaId } = ctx;

        // 1. Actualizar el producto como elaborado (es_compuesto = true, es_reventa = false, y costo = costoTotal)
        const updateData: any = {
          es_compuesto: true,
          es_reventa: false
        };
        if (costoTotal !== undefined && costoTotal !== null && !isNaN(Number(costoTotal))) {
          updateData.costo = Number(costoTotal);
        }
        const { error: prodErr } = await supabase
          .from('productos')
          .update(updateData)
          .eq('id', productoId)
          .eq('empresa_id', empresaId);

        if (prodErr) {
          return { success: false, mensaje: `Error actualizando producto: ${prodErr.message}` };
        }

        // 2. Si modo !== 'agregar', borrar recetas previas del producto
        if (modo !== 'agregar') {
          await supabase.from('recetas').delete().eq('producto_id', productoId).eq('empresa_id', empresaId);
        }

        // 3. Insertar nuevos registros en recetas
        const inserts = items.map((it: any) => ({
          empresa_id: empresaId,
          producto_id: productoId,
          insumo_id: it.tipo === 'insumo' ? it.id : null,
          subproducto_id: it.tipo === 'producto' ? it.id : null,
          cantidad_necesaria: it.cantidad
        }));

        const { error: insertError } = await supabase.from('recetas').insert(inserts);
        if (insertError) {
          return { success: false, mensaje: `Error guardando ingredientes de receta: ${insertError.message}` };
        }

        revalidatePath('/dashboard/catalogo');
        revalidatePath('/dashboard/inventario');
        return { success: true, mensaje: `Receta guardada exitosamente con ${inserts.length} ingredientes.` };
      }

      case 'ejecutar_despacho': {
        const { origenId, destinoId, items, notas } = payload;
        if (!origenId || !destinoId || !items || items.length === 0) {
          return { success: false, mensaje: 'Datos incompletos para generar el despacho.' };
        }
        const itemsPayload = items.map((it: any) => ({
          insumo_id: it.insumo_id,
          nombre: it.nombre,
          unidad_medida: it.unidad_medida,
          cantidad: it.cantidad
        }));
        const res = await procesarDespachoEnServidor(ctx.empresaId, origenId, destinoId, notas || '', itemsPayload);
        if (!res.success) return { success: false, mensaje: res.error || 'Error al procesar despacho.' };

        revalidatePath('/dashboard/despachos');
        revalidatePath('/dashboard/inventario');
        return { success: true, mensaje: 'Despacho registrado en tránsito exitosamente hacia la sede destino.' };
      }

      case 'ejecutar_venta_costo': {
        if (!ctx.permisoVentaCosto) {
          return { success: false, mensaje: 'No tienes el permiso de Venta al Costo habilitado.' };
        }
        const { beneficiario, items, notas } = payload;
        if (!beneficiario || !items || items.length === 0) {
          return { success: false, mensaje: 'Datos incompletos para la venta al costo.' };
        }
        const itemsPayload = items.map((it: any) => ({
          insumoId: it.insumoId,
          cantidad: it.cantidad
        }));
        const res = await registrarVentaAlCostoMulti(itemsPayload, beneficiario, notas || '', ctx.empresaId, ctx.sedeId || ctx.sedes[0]?.id || '');
        if (!res.success) return { success: false, mensaje: res.error || 'Error al registrar venta al costo.' };

        revalidatePath('/dashboard/inventario');
        return { success: true, mensaje: `Venta al Costo para ${beneficiario} procesada exitosamente con salida de almacén.` };
      }

      case 'crear_combo': {
        const { nombre, descripcion, tipo, regla_precio, precio_fijo, config_seleccion } = payload;
        if (!nombre) {
          return { success: false, mensaje: 'El nombre del combo es obligatorio.' };
        }
        const { guardarPromocion } = await import('@/actions/promociones-actions');
        const res = await guardarPromocion({
          nombre,
          descripcion: descripcion || 'Combo especial',
          tipo: tipo || 'COMBO_GRUPOS',
          regla_precio: regla_precio || 'PRECIO_FIJO',
          precio_fijo: Number(precio_fijo) || 0,
          config_seleccion: config_seleccion || { cantidad_total: 1, grupos: [] },
          estado_activo: true
        });

        if (!res.success) {
          return { success: false, mensaje: res.error || 'Error al guardar el combo.' };
        }

        revalidatePath('/dashboard/promociones');
        revalidatePath('/dashboard/catalogo');
        revalidatePath('/dashboard/terminal');
        return { success: true, mensaje: `¡El combo "${nombre}" fue creado y activado exitosamente en el catálogo y punto de venta!` };
      }

      default:
        return { success: false, mensaje: 'Acción no reconocida' };
    }
  } catch (err: any) {
    return { success: false, mensaje: err?.message || 'Error al ejecutar acción' };
  }
}
