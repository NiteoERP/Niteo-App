'use server';

import { GoogleGenerativeAI, SchemaType, FunctionDeclaration } from '@google/generative-ai';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { DEFAULT_TIMEZONE, getTimezoneOffsetString, toLocalDateKey, getLocalDayRange } from '@/utils/date-utils';
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
    .eq('empresa_id', perfil.empresa_id)
    .order('nombre_sede', { ascending: true });

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
  const p = (periodo || '').toLowerCase().trim();

  // 1. Si es rango explícito: "YYYY-MM-DD..YYYY-MM-DD" o "YYYY-MM-DD a YYYY-MM-DD" o "YYYY-MM-DD/YYYY-MM-DD"
  const rangeMatch = p.match(/^(\d{4}-\d{2}-\d{2})\s*(?:\.\.|\s+a\s+|\s+hasta\s+|\/)\s*(\d{4}-\d{2}-\d{2})$/);
  if (rangeMatch) {
    const tzOffset = getTimezoneOffsetString(DEFAULT_TIMEZONE);
    return {
      inicio: `${rangeMatch[1]}T00:00:00${tzOffset}`,
      fin: `${rangeMatch[2]}T23:59:59.999${tzOffset}`,
      descripcion: `Del ${rangeMatch[1]} al ${rangeMatch[2]}`
    };
  }

  // 2. Si es una fecha YYYY-MM-DD única
  if (/^\d{4}-\d{2}-\d{2}$/.test(p)) {
    const tzOffset = getTimezoneOffsetString(DEFAULT_TIMEZONE);
    return {
      inicio: `${p}T00:00:00${tzOffset}`,
      fin: `${p}T23:59:59.999${tzOffset}`,
      descripcion: `Fecha ${p}`
    };
  }

  // 3. Patrones dinámicos: "ultimos_X_dias" o "ultimos_X_meses"
  const matchDias = p.match(/^(?:ultimos_|ultimas_)?(\d+)[\s_]*(?:dias?|d)$/);
  if (matchDias) {
    const numDias = parseInt(matchDias[1], 10);
    inicio.setDate(inicio.getDate() - numDias);
    return { inicio: inicio.toISOString(), fin: fin.toISOString(), descripcion: `Últimos ${numDias} días` };
  }

  const matchMeses = p.match(/^(?:ultimos_|ultimas_)?(\d+)[\s_]*(?:meses?|m)$/);
  if (matchMeses) {
    const numMeses = parseInt(matchMeses[1], 10);
    inicio.setMonth(inicio.getMonth() - numMeses);
    return { inicio: inicio.toISOString(), fin: fin.toISOString(), descripcion: `Últimos ${numMeses} meses` };
  }

  switch (p) {
    case 'hoy': {
      const hoyKey = toLocalDateKey(now, DEFAULT_TIMEZONE);
      const range = getLocalDayRange(hoyKey, DEFAULT_TIMEZONE);
      return { inicio: range.start, fin: range.end, descripcion: 'Hoy' };
    }
    case 'ayer': {
      const ayerDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const ayerKey = toLocalDateKey(ayerDate, DEFAULT_TIMEZONE);
      const range = getLocalDayRange(ayerKey, DEFAULT_TIMEZONE);
      return { inicio: range.start, fin: range.end, descripcion: 'Ayer' };
    }
    case 'esta_semana': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      inicio.setDate(diff);
      inicio.setHours(0, 0, 0, 0);
      return { inicio: inicio.toISOString(), fin: fin.toISOString(), descripcion: 'Esta semana' };
    }
    case 'semana_pasada':
    case 'semana_anterior': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7;
      inicio.setDate(diff);
      inicio.setHours(0, 0, 0, 0);
      const finSemana = new Date(inicio);
      finSemana.setDate(finSemana.getDate() + 6);
      finSemana.setHours(23, 59, 59, 999);
      return { inicio: inicio.toISOString(), fin: finSemana.toISOString(), descripcion: 'Semana pasada' };
    }
    case 'este_mes': {
      inicio = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return { inicio: inicio.toISOString(), fin: fin.toISOString(), descripcion: 'Este mes' };
    }
    case 'mes_anterior':
    case 'mes_pasado': {
      inicio = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const finMes = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { inicio: inicio.toISOString(), fin: finMes.toISOString(), descripcion: 'Mes anterior' };
    }
    case 'ultimos_15_dias': {
      inicio.setDate(inicio.getDate() - 15);
      return { inicio: inicio.toISOString(), fin: fin.toISOString(), descripcion: 'Últimos 15 días' };
    }
    case 'ultimos_30_dias': {
      inicio.setDate(inicio.getDate() - 30);
      return { inicio: inicio.toISOString(), fin: fin.toISOString(), descripcion: 'Últimos 30 días' };
    }
    case 'ultimos_3_meses':
    case 'ultimos_90_dias':
    case '3_meses':
    case 'tres_meses':
    case 'trimestre': {
      inicio.setMonth(inicio.getMonth() - 3);
      return { inicio: inicio.toISOString(), fin: fin.toISOString(), descripcion: 'Últimos 3 meses' };
    }
    case 'ultimos_6_meses':
    case '6_meses':
    case 'seis_meses':
    case 'semestre': {
      inicio.setMonth(inicio.getMonth() - 6);
      return { inicio: inicio.toISOString(), fin: fin.toISOString(), descripcion: 'Últimos 6 meses' };
    }
    case 'año_actual':
    case 'este_año': {
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

  // 1. Coincidencia directa por texto completo en nombre_sede
  const directa = sedes.find(s => {
    const sNorm = normalizarTexto(s.nombre_sede);
    return sNorm === cleanTerm || sNorm.includes(cleanTerm) || cleanTerm.includes(sNorm);
  });
  if (directa) return directa;

  // 2. Si el término contiene un número de sede ("sede 2", "2", "sucursal 2")
  const matchNum = cleanTerm.match(/(?:sede|sucursal|caja|tienda|pos|sde|sed)?\s*(\d+)/i);
  if (matchNum && matchNum[1]) {
    const numBuscado = matchNum[1];
    // Prioridad A: Buscar una sede cuyo nombre contenga ese número explícito (ej: "Sede 2" o "1. ⭐ Sede AV 32")
    const porNombreConNumero = sedes.find(s => {
      const sNorm = normalizarTexto(s.nombre_sede);
      const matchSedeNum = sNorm.match(/(?:sede|sucursal|caja|tienda|pos)?\s*(\d+)/i) || sNorm.match(/\b(\d+)\b/);
      return matchSedeNum && matchSedeNum[1] === numBuscado;
    });
    if (porNombreConNumero) return porNombreConNumero;

    // Prioridad B: Por índice ordinal
    const idx = parseInt(numBuscado, 10) - 1;
    if (idx >= 0 && idx < sedes.length) {
      return sedes[idx];
    }
  }

  // 3. Coincidencia por palabras clave como "principal", "matriz", "central"
  if (cleanTerm.includes('principal') || cleanTerm.includes('matriz') || cleanTerm.includes('central') || cleanTerm.includes('principa') || cleanTerm.includes('pricipal')) {
    const principal = sedes.find(s => {
      const sNorm = normalizarTexto(s.nombre_sede);
      return sNorm.includes('principal') || sNorm.includes('central') || sNorm.includes('matriz');
    });
    if (principal) return principal;
    return sedes[0];
  }

  // 4. Coincidencia difusa Levenshtein
  const difusa = sedes.find(s => esCoincidenciaAproximada(s.nombre_sede, cleanTerm));
  return difusa || null;
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
  args: { fecha?: string; periodo?: string; turno?: 'todo_el_dia' | 'cenas_nocturno' | 'almuerzo'; sede_nombre?: string }
) {
  const { supabase, empresaId, sedeId, sedes } = ctx;
  const rawInput = (args.periodo || args.fecha || '').trim();
  const isSingleDate = /^\d{4}-\d{2}-\d{2}$/.test(rawInput);

  let inicioRango: string;
  let finRango: string;
  let descripcionPeriodo: string;
  let fechaTasaRef: string;

  if (isSingleDate || !rawInput) {
    const fechaStr = isSingleDate ? rawInput : toLocalDateKey(new Date(), DEFAULT_TIMEZONE);
    const { start, end } = getLocalDayRange(fechaStr, DEFAULT_TIMEZONE);
    inicioRango = start;
    finRango = end;
    descripcionPeriodo = `Fecha ${fechaStr}`;
    fechaTasaRef = fechaStr;
  } else {
    const r = calcularRangoFechas(rawInput);
    inicioRango = r.inicio;
    finRango = r.fin;
    descripcionPeriodo = r.descripcion;
    fechaTasaRef = toLocalDateKey(new Date(), DEFAULT_TIMEZONE);
  }

  let targetSedeId: string | undefined = undefined;
  let sedeIdentificada = 'General / Todas las sedes';
  if (args.sede_nombre) {
    const sNorm = normalizarTexto(args.sede_nombre);
    const esGeneral = ['todas', 'ambas', 'todas las sedes', 'consolidado', 'general', 'global', 'ambas sedes'].includes(sNorm);
    if (!esGeneral) {
      const sFound = resolverSede(args.sede_nombre, sedes);
      if (sFound) {
        targetSedeId = sFound.id;
        sedeIdentificada = sFound.nombre_sede;
      }
    }
  } else if (!ctx.user.app_metadata?.user_role?.includes('MASTER') && ctx.rol !== 'MASTER' && ctx.rol !== 'SUPERADMIN' && sedeId && sedeId !== 'ALL') {
    targetSedeId = sedeId;
  }

  const tasaInfo = await getTasaBcvForDateAction(fechaTasaRef);
  const tasa = tasaInfo.tasa || 1;

  const sedeNombres: Record<string, string> = {};
  const balancePorSede: Record<string, {
    sede_id: string;
    nombre_sede: string;
    ventas_usd: number;
    facturas: number;
    compras_insumos_usd: number;
    gastos_operativos_usd: number;
    total_egresos_usd: number;
    balance_neto_usd: number;
  }> = {};

  sedes.forEach((s, idx) => {
    const label = `Sede ${idx + 1} (${s.nombre_sede})`;
    sedeNombres[s.id] = label;
    balancePorSede[s.id] = {
      sede_id: s.id,
      nombre_sede: label,
      ventas_usd: 0,
      facturas: 0,
      compras_insumos_usd: 0,
      gastos_operativos_usd: 0,
      total_egresos_usd: 0,
      balance_neto_usd: 0
    };
  });

  // Consultar Ventas Facturas con paginación exhaustiva y filtros dorados
  let allFacturas: any[] = [];
  let fromV = 0;
  const batchV = 1000;

  while (true) {
    let queryVentas = supabase
      .from('ventas_facturas')
      .select('id, sede_id, total, fecha_venta, numero_documento, tipo_documento, numero_orden, ventas_pagos(tipo_pago, monto)')
      .eq('empresa_id', empresaId)
      .eq('estado_activo', true)
      .gte('fecha_venta', inicioRango)
      .lte('fecha_venta', finRango)
      .neq('numero_documento', 'TEST')
      .range(fromV, fromV + batchV - 1);

    if (targetSedeId) {
      queryVentas = queryVentas.eq('sede_id', targetSedeId);
    }

    const { data: batch, error: vErr } = await queryVentas;
    if (vErr) return { error: `Error consultando ventas: ${vErr.message}` };
    if (!batch || batch.length === 0) break;
    allFacturas.push(...batch);
    if (batch.length < batchV) break;
    fromV += batchV;
  }

  let totalVentasUsd = 0;
  let totalCenasUsd = 0;
  let countFacturas = 0;
  let countCenas = 0;

  for (const fac of allFacturas) {
    const isCortesia = fac.ventas_pagos?.some((p: any) => {
      const tp = (p.tipo_pago || '').toLowerCase();
      return tp.includes('cortes') || tp.includes('regal');
    }) ||
    (fac.tipo_documento && (fac.tipo_documento.toLowerCase().includes('cortes') || fac.tipo_documento.toLowerCase().includes('regal'))) ||
    (fac.numero_orden && (fac.numero_orden.toLowerCase().includes('cortes') || fac.numero_orden.toLowerCase().includes('regal')));

    if (isCortesia) continue;

    const isRefund = (fac.tipo_documento && (
      fac.tipo_documento.toLowerCase().includes('refund') ||
      fac.tipo_documento.toLowerCase().includes('devolucion') ||
      fac.tipo_documento.toLowerCase().includes('nota_credito') ||
      fac.tipo_documento.toLowerCase().includes('nc')
    )) || Number(fac.total || 0) < 0;

    const rawTotal = Number(fac.total || 0);
    const monto = isRefund ? -Math.abs(rawTotal) : Math.abs(rawTotal);

    totalVentasUsd += monto;
    countFacturas++;

    if (fac.sede_id && balancePorSede[fac.sede_id]) {
      balancePorSede[fac.sede_id].ventas_usd += monto;
      balancePorSede[fac.sede_id].facturas += 1;
    }

    const fDate = new Date(fac.fecha_venta);
    const hourLocal = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: DEFAULT_TIMEZONE, hour: 'numeric', hour12: false }).format(fDate), 10);
    if (hourLocal >= 18 || hourLocal <= 4) {
      totalCenasUsd += monto;
      countCenas++;
    }
  }

  // Consultar Compras con paginación y excluir ANULADAS
  let allCompras: any[] = [];
  let fromC = 0;
  const batchC = 1000;

  while (true) {
    let queryCompras = supabase
      .from('compras_puntuales')
      .select('id, id_sede, monto_divisas, monto_bs, proveedor, detalles, estado')
      .eq('id_empresa', empresaId)
      .neq('estado', 'ANULADA')
      .gte('fecha_registro', inicioRango)
      .lte('fecha_registro', finRango)
      .range(fromC, fromC + batchC - 1);

    if (targetSedeId) {
      queryCompras = queryCompras.eq('id_sede', targetSedeId);
    }

    const { data: batch, error: cErr } = await queryCompras;
    if (cErr) return { error: `Error consultando compras: ${cErr.message}` };
    if (!batch || batch.length === 0) break;
    allCompras.push(...batch);
    if (batch.length < batchC) break;
    fromC += batchC;
  }

  let totalComprasUsd = 0;
  let totalComprasBs = 0;
  let totalInsumosUsd = 0;
  let totalGastosOperativosUsd = 0;

  for (const comp of allCompras) {
    const mUsd = Number(comp.monto_divisas || 0);
    const mBs = Number(comp.monto_bs || (mUsd * tasa));
    totalComprasUsd += mUsd;
    totalComprasBs += mBs;

    const det = comp.detalles;
    const esInsumo = (typeof det === 'string' && det.includes('"is_insumos":true')) || (typeof det === 'object' && det?.is_insumos);
    if (esInsumo) {
      totalInsumosUsd += mUsd;
    } else {
      totalGastosOperativosUsd += mUsd;
    }

    if (comp.id_sede && balancePorSede[comp.id_sede]) {
      if (esInsumo) {
        balancePorSede[comp.id_sede].compras_insumos_usd += mUsd;
      } else {
        balancePorSede[comp.id_sede].gastos_operativos_usd += mUsd;
      }
      balancePorSede[comp.id_sede].total_egresos_usd += mUsd;
    }
  }

  Object.values(balancePorSede).forEach(s => {
    s.ventas_usd = Number(s.ventas_usd.toFixed(2));
    s.compras_insumos_usd = Number(s.compras_insumos_usd.toFixed(2));
    s.gastos_operativos_usd = Number(s.gastos_operativos_usd.toFixed(2));
    s.total_egresos_usd = Number(s.total_egresos_usd.toFixed(2));
    s.balance_neto_usd = Number((s.ventas_usd - s.total_egresos_usd).toFixed(2));
  });

  const totalVentasBs = totalVentasUsd * tasa;
  const totalCenasBs = totalCenasUsd * tasa;

  return {
    periodo: descripcionPeriodo,
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
    compras_y_gastos: {
      total_egresos_usd: Number(totalComprasUsd.toFixed(2)),
      total_egresos_bs: Number(totalComprasBs.toFixed(2)),
      compras_insumos_usd: Number(totalInsumosUsd.toFixed(2)),
      gastos_operativos_usd: Number(totalGastosOperativosUsd.toFixed(2)),
      total_registros: allCompras.length
    },
    balance_neto: {
      balance_usd: Number((totalVentasUsd - totalComprasUsd).toFixed(2)),
      balance_bs: Number((totalVentasBs - totalComprasBs).toFixed(2)),
      margen_operativo_pct: totalVentasUsd > 0 ? `${(((totalVentasUsd - totalComprasUsd) / totalVentasUsd) * 100).toFixed(1)}%` : '0%'
    },
    desglose_por_sede: Object.values(balancePorSede)
  };
}

/**
 * 3. Consulta ventas por método de pago (ej. Pago Móvil, Zelle, Efectivo, o "todos") desglosadas por cada sede
 */
async function toolConsultarVentasPorMetodoPago(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: {
    metodo_pago?: string;
    periodo_o_fecha?: string;
    sede_nombre?: string;
  }
) {
  const { supabase, empresaId, sedes } = ctx;
  const { inicio, fin, descripcion } = calcularRangoFechas(args.periodo_o_fecha || 'hoy');
  const rawMetodo = (args.metodo_pago || 'todos').toLowerCase().trim();
  const metodoBuscado = rawMetodo.replace(/[_\s-]/g, '');
  const esTodosMetodos = !rawMetodo || ['todos', 'todo', 'general', 'resumen', 'todoslosmetodos', 'all'].includes(metodoBuscado);

  let targetSedeId: string | null = null;
  if (args.sede_nombre) {
    const sNorm = normalizarTexto(args.sede_nombre);
    const esGeneral = ['todas', 'ambas', 'todas las sedes', 'consolidado', 'general', 'global', 'ambas sedes'].includes(sNorm);
    if (!esGeneral) {
      const sFound = resolverSede(args.sede_nombre, sedes);
      if (sFound) {
        targetSedeId = sFound.id;
      }
    }
  }

  let allFacturas: any[] = [];
  let from = 0;
  const batchSize = 1000;

  while (true) {
    let query = supabase
      .from('ventas_facturas')
      .select(`
        id,
        sede_id,
        total,
        fecha_venta,
        tipo_documento,
        numero_orden,
        ventas_pagos (
          tipo_pago,
          monto
        )
      `)
      .eq('empresa_id', empresaId)
      .gte('fecha_venta', inicio)
      .lte('fecha_venta', fin)
      .eq('estado_activo', true)
      .neq('numero_documento', 'TEST')
      .range(from, from + batchSize - 1);

    if (targetSedeId) {
      query = query.eq('sede_id', targetSedeId);
    }

    const { data: batch, error } = await query;
    if (error) return { error: `Error consultando ventas por método de pago: ${error.message}` };
    if (!batch || batch.length === 0) break;

    allFacturas.push(...batch);
    if (batch.length < batchSize) break;
    from += batchSize;
  }

  const facturas = allFacturas;
  const tasaHoy = (await getTasaBcvForDateAction(new Date().toISOString().substring(0, 10))).tasa || 1;

  const sedeNombres: Record<string, string> = {};
  const desglosadoPorSede: Record<string, {
    sede_id: string;
    nombre_sede: string;
    total_usd: number;
    total_bs: number;
    transacciones: number;
    por_metodo: Record<string, number>;
  }> = {};

  sedes.forEach((s, idx) => {
    const label = `Sede ${idx + 1} (${s.nombre_sede})`;
    sedeNombres[s.id] = label;
    desglosadoPorSede[s.id] = {
      sede_id: s.id,
      nombre_sede: label,
      total_usd: 0,
      total_bs: 0,
      transacciones: 0,
      por_metodo: {}
    };
  });

  const resumenGlobalPorMetodo: Record<string, { total_usd: number; transacciones: number }> = {};
  let totalGeneralUsd = 0;
  let totalTransacciones = 0;

  for (const fac of facturas || []) {
    const sId = fac.sede_id || 'sin_sede';
    const sNombre = sedeNombres[sId] || 'Sede Principal / Sin Asignar';

    const isCortesiaDoc = (fac.tipo_documento && (fac.tipo_documento.toLowerCase().includes('cortes') || fac.tipo_documento.toLowerCase().includes('regal'))) ||
                          (fac.numero_orden && (fac.numero_orden.toLowerCase().includes('cortes') || fac.numero_orden.toLowerCase().includes('regal')));

    const isRefund = (fac.tipo_documento && (
      fac.tipo_documento.toLowerCase().includes('refund') ||
      fac.tipo_documento.toLowerCase().includes('devolucion') ||
      fac.tipo_documento.toLowerCase().includes('nota_credito') ||
      fac.tipo_documento.toLowerCase().includes('nc')
    )) || Number(fac.total || 0) < 0;

    const sign = isRefund ? -1 : 1;

    if (!desglosadoPorSede[sId]) {
      desglosadoPorSede[sId] = {
        sede_id: sId,
        nombre_sede: sNombre,
        total_usd: 0,
        total_bs: 0,
        transacciones: 0,
        por_metodo: {}
      };
    }

    const pagos = (fac as any).ventas_pagos || [];
    for (const p of pagos) {
      const isPagoCortesia = isCortesiaDoc || (p.tipo_pago || '').toLowerCase().includes('cortes') || (p.tipo_pago || '').toLowerCase().includes('regal');
      if (isPagoCortesia) continue;

      const nombreMetodo = (p.tipo_pago || 'Efectivo').trim();
      const pClean = nombreMetodo.toLowerCase().replace(/[_\s-]/g, '');

      if (esTodosMetodos || pClean.includes(metodoBuscado) || metodoBuscado.includes(pClean) || esCoincidenciaAproximada(nombreMetodo, rawMetodo)) {
        const monto = sign * Math.abs(Number(p.monto || 0));
        desglosadoPorSede[sId].total_usd += monto;
        desglosadoPorSede[sId].total_bs += monto * tasaHoy;
        desglosadoPorSede[sId].transacciones += 1;
        desglosadoPorSede[sId].por_metodo[nombreMetodo] = Number(((desglosadoPorSede[sId].por_metodo[nombreMetodo] || 0) + monto).toFixed(2));

        if (!resumenGlobalPorMetodo[nombreMetodo]) {
          resumenGlobalPorMetodo[nombreMetodo] = { total_usd: 0, transacciones: 0 };
        }
        resumenGlobalPorMetodo[nombreMetodo].total_usd += monto;
        resumenGlobalPorMetodo[nombreMetodo].transacciones += 1;

        totalGeneralUsd += monto;
        totalTransacciones += 1;
      }
    }
  }

  return {
    metodo_pago_consultado: esTodosMetodos ? 'TODOS LOS MÉTODOS' : args.metodo_pago,
    periodo: descripcion,
    tasa_referencia_bcv: tasaHoy,
    total_general_usd: Number(totalGeneralUsd.toFixed(2)),
    total_general_bs: Number((totalGeneralUsd * tasaHoy).toFixed(2)),
    total_transacciones: totalTransacciones,
    resumen_global_por_metodo: Object.entries(resumenGlobalPorMetodo)
      .sort((a, b) => b[1].total_usd - a[1].total_usd)
      .map(([metodo, val]) => ({
        metodo,
        total_usd: Number(val.total_usd.toFixed(2)),
        transacciones: val.transacciones,
        porcentaje: totalGeneralUsd > 0 ? `${((val.total_usd / totalGeneralUsd) * 100).toFixed(1)}%` : '0%'
      })),
    desglose_por_sedes: Object.values(desglosadoPorSede).map(s => ({
      sede_id: s.sede_id,
      nombre_sede: s.nombre_sede,
      total_usd: Number(s.total_usd.toFixed(2)),
      total_bs: Number(s.total_bs.toFixed(2)),
      transacciones: s.transacciones,
      desglose_metodos: s.por_metodo
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
 * 7. Consulta métricas y ranking de ventas exhaustivo (con paginación anti-límite 1000 y desglose por sede)
 */
async function toolConsultarVentas(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: {
    periodo?: string;
    filtro_producto?: string;
    limite?: number;
    ordenar_por?: 'mas_vendidos' | 'menos_vendidos';
    sede_nombre?: string;
    solo_delivery?: boolean;
    canal?: 'todos' | 'delivery' | 'salon';
  }
) {
  const { supabase, empresaId, sedeId, sedes, user, rol } = ctx;
  const isMaster = user.app_metadata?.user_role === 'MASTER' || rol === 'MASTER' || rol === 'SUPERADMIN';
  const { inicio, fin, descripcion } = calcularRangoFechas(args.periodo || 'esta_semana');
  const limite = Math.min(Math.max(args.limite || 10, 1), 50);

  let targetSedeId: string | undefined = undefined;
  let sedeIdentificada = 'General / Todas las sedes';
  if (args.sede_nombre) {
    const sNorm = normalizarTexto(args.sede_nombre);
    const esGeneral = ['todas', 'ambas', 'todas las sedes', 'consolidado', 'general', 'global', 'ambas sedes'].includes(sNorm);
    if (!esGeneral) {
      const sFound = resolverSede(args.sede_nombre, sedes);
      if (sFound) {
        targetSedeId = sFound.id;
        sedeIdentificada = sFound.nombre_sede;
      }
    }
  } else if (!isMaster && sedeId && sedeId !== 'ALL') {
    targetSedeId = sedeId;
  }

  // Mapa de nombres amigables de sede
  const sedeNombres: Record<string, string> = {};
  sedes.forEach((s, idx) => {
    sedeNombres[s.id] = `Sede ${idx + 1} (${s.nombre_sede})`;
  });

  const esFiltroDelivery = args.solo_delivery === true || args.canal === 'delivery';
  const esFiltroSalon = args.canal === 'salon';
  const canalRpc = esFiltroDelivery ? 'delivery' : (esFiltroSalon ? 'salon' : 'todos');

  // 0. Motor SQL Ultra-Rápido 360° (Procesa 100% de facturas y detalles en PostgreSQL en <100ms)
  const { data: rpcData, error: rpcErr } = await supabase.rpc('get_copilot_ventas_360', {
    p_empresa_id: empresaId,
    p_fecha_inicio: inicio,
    p_fecha_fin: fin,
    p_sede_id: targetSedeId,
    p_canal: canalRpc,
    p_filtro_producto: args.filtro_producto || null,
    p_ordenar_por: args.ordenar_por || 'mas_vendidos',
    p_limite: limite
  });

  if (!rpcErr && rpcData) {
    const totalUsd = Number(rpcData.total_ventas_usd || 0);
    const totalFacs = Number(rpcData.total_facturas || 0);
    const totalFlete = Number(rpcData.total_flete_delivery_usd || 0);
    const pedidosDeliv = Number(rpcData.pedidos_delivery_despachados || 0);

    const desgloseSedesRpc = (rpcData.desglose_sedes || []).map((s: any) => {
      const sTotal = Number(s.total_usd || 0);
      const sFacs = Number(s.total_facturas || 0);
      const pct = totalUsd > 0 ? Number(((sTotal / totalUsd) * 100).toFixed(1)) : 0;
      return {
        sede_id: s.sede_id,
        nombre_sede: sedeNombres[s.sede_id] || s.nombre_sede,
        total_usd: Number(sTotal.toFixed(2)),
        total_facturas: sFacs,
        porcentaje_del_total: `${pct}%`,
        ticket_promedio: sFacs > 0 ? Number((sTotal / sFacs).toFixed(2)) : 0,
        pedidos_delivery: Number(s.pedidos_delivery || 0),
        total_flete_delivery_usd: Number(Number(s.flete_delivery_usd || 0).toFixed(2))
      };
    });

    return {
      periodo: descripcion,
      canal_filtrado: esFiltroDelivery ? 'DELIVERY' : (esFiltroSalon ? 'SALON' : 'TODOS'),
      rango_fechas: { inicio, fin },
      sede_consultada: sedeIdentificada,
      filtro_producto: args.filtro_producto || null,
      total_facturas_emitidas: totalFacs,
      total_ventas_usd: Number(totalUsd.toFixed(2)),
      promedio_ticket_usd: totalFacs > 0 ? Number((totalUsd / totalFacs).toFixed(2)) : 0,
      pedidos_delivery_despachados: pedidosDeliv,
      total_flete_delivery_usd: Number(totalFlete.toFixed(2)),
      desglose_por_sede: desgloseSedesRpc,
      desglose_por_dia_semana: rpcData.desglose_dia_semana || [],
      horas_pico_ventas: rpcData.horas_pico || [],
      ventas_por_categoria: rpcData.ventas_por_categoria || [],
      total_unidades_coincidentes: Number(rpcData.total_unidades_productos || 0),
      top_productos_mas_vendidos: rpcData.top_productos || []
    };
  }

  const desglosadoPorSede: Record<string, {
    sede_id: string;
    nombre_sede: string;
    total_usd: number;
    total_facturas: number;
    flete_delivery_usd: number;
  }> = {};

  for (const s of sedes) {
    desglosadoPorSede[s.id] = {
      sede_id: s.id,
      nombre_sede: sedeNombres[s.id] || s.nombre_sede,
      total_usd: 0,
      total_facturas: 0,
      flete_delivery_usd: 0
    };
  }

  // 1. Paginación exhaustiva de respaldo para ventas_facturas
  let allFacturas: Array<{
    id: string;
    total: number;
    sede_id: string;
    fecha_venta: string;
    tipo_documento?: string;
    numero_orden?: string;
    cliente_nombre?: string;
    notas?: string;
    ventas_pagos?: Array<{ tipo_pago?: string; monto?: number }>;
  }> = [];
  let from = 0;
  const batchSize = 1000;

  while (true) {
    let query = supabase
      .from('ventas_facturas')
      .select('id, total, sede_id, fecha_venta, tipo_documento, numero_orden, cliente_nombre, notas, ventas_pagos(tipo_pago, monto)')
      .eq('empresa_id', empresaId)
      .gte('fecha_venta', inicio)
      .lte('fecha_venta', fin)
      .eq('estado_activo', true)
      .neq('numero_documento', 'TEST')
      .order('fecha_venta', { ascending: false })
      .range(from, from + batchSize - 1);

    if (targetSedeId) {
      query = query.eq('sede_id', targetSedeId);
    }

    const { data: batch, error } = await query;
    if (error) return { error: `Error consultando ventas: ${error.message}` };
    if (!batch || batch.length === 0) break;

    allFacturas.push(...batch);
    if (batch.length < batchSize) break;
    from += batchSize;
  }

  // Identificación de Delivery por productos de flete y/o atributos de orden
  const { data: prodDeliveryList } = await supabase
    .from('productos')
    .select('id, nombre')
    .eq('empresa_id', empresaId)
    .or('nombre.ilike.%delivery%,nombre.ilike.%flete%,nombre.ilike.%despacho%,nombre.ilike.%envio%,nombre.ilike.%envío%');

  const deliveryProdIds = (prodDeliveryList || []).map(p => p.id);
  const deliveryFleteMap = new Map<string, number>();

  if (deliveryProdIds.length > 0 && allFacturas.length > 0) {
    const chunkSize = 200;
    for (let i = 0; i < allFacturas.length; i += chunkSize) {
      const facIds = allFacturas.slice(i, i + chunkSize).map(f => f.id);
      const { data: dDets } = await supabase
        .from('ventas_detalles')
        .select('factura_id, total')
        .in('factura_id', facIds)
        .in('producto_id', deliveryProdIds);

      for (const d of dDets || []) {
        const prev = deliveryFleteMap.get(d.factura_id) || 0;
        deliveryFleteMap.set(d.factura_id, prev + Number(d.total || 0));
      }
    }
  }

  let totalRecaudado = 0;
  let facturasValidasCount = 0;
  let totalFleteRecaudado = 0;

  const facturasFiltradas: Array<any & { _sign: number }> = [];
  const refundSignMap = new Map<string, number>();

  const nombresDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const ventasPorDiaSemana: Record<string, {
    dia: string;
    orden: number;
    total_usd: number;
    total_facturas: number;
    fechas_distintas: Set<string>;
  }> = {
    'Lunes': { dia: 'Lunes', orden: 1, total_usd: 0, total_facturas: 0, fechas_distintas: new Set() },
    'Martes': { dia: 'Martes', orden: 2, total_usd: 0, total_facturas: 0, fechas_distintas: new Set() },
    'Miércoles': { dia: 'Miércoles', orden: 3, total_usd: 0, total_facturas: 0, fechas_distintas: new Set() },
    'Jueves': { dia: 'Jueves', orden: 4, total_usd: 0, total_facturas: 0, fechas_distintas: new Set() },
    'Viernes': { dia: 'Viernes', orden: 5, total_usd: 0, total_facturas: 0, fechas_distintas: new Set() },
    'Sábado': { dia: 'Sábado', orden: 6, total_usd: 0, total_facturas: 0, fechas_distintas: new Set() },
    'Domingo': { dia: 'Domingo', orden: 7, total_usd: 0, total_facturas: 0, fechas_distintas: new Set() }
  };

  const ventasPorHora: Record<string, { hora: string; total_usd: number; pedidos: number }> = {};

  for (const fac of allFacturas) {
    // Excluir Cortesías / Regalías
    const isCortesia = fac.ventas_pagos?.some((p: any) => {
      const tp = (p.tipo_pago || '').toLowerCase();
      return tp.includes('cortes') || tp.includes('regal');
    }) ||
    (fac.tipo_documento && (fac.tipo_documento.toLowerCase().includes('cortes') || fac.tipo_documento.toLowerCase().includes('regal'))) ||
    (fac.numero_orden && (fac.numero_orden.toLowerCase().includes('cortes') || fac.numero_orden.toLowerCase().includes('regal')));

    if (isCortesia) continue;

    const fleteMonto = deliveryFleteMap.get(fac.id) || 0;
    const esDeliveryDoc = fleteMonto > 0 ||
      (fac.cliente_nombre && fac.cliente_nombre.toLowerCase().includes('delivery')) ||
      (fac.numero_orden && fac.numero_orden.toLowerCase().includes('delivery')) ||
      (fac.notas && fac.notas.toLowerCase().includes('delivery'));

    if (esFiltroDelivery && !esDeliveryDoc) {
      continue;
    }
    if (esFiltroSalon && esDeliveryDoc) {
      continue;
    }

    const isRefund = (fac.tipo_documento && (
      fac.tipo_documento.toLowerCase().includes('refund') ||
      fac.tipo_documento.toLowerCase().includes('devolucion') ||
      fac.tipo_documento.toLowerCase().includes('nota_credito') ||
      fac.tipo_documento.toLowerCase().includes('nc')
    )) || Number(fac.total || 0) < 0;

    const sign = isRefund ? -1 : 1;
    const rawTotal = Number(fac.total || 0);
    const facMonto = sign * Math.abs(rawTotal);

    facturasFiltradas.push({ ...fac, _sign: sign });
    refundSignMap.set(fac.id, sign);

    totalRecaudado += facMonto;
    totalFleteRecaudado += sign * fleteMonto;
    facturasValidasCount++;

    // Desglose por día de la semana y hora (Hora Venezuela UTC-4)
    if (fac.fecha_venta) {
      const fechaUtc = new Date(fac.fecha_venta);
      if (!isNaN(fechaUtc.getTime())) {
        const fechaVen = new Date(fechaUtc.getTime() - 4 * 60 * 60 * 1000);
        const diaNombre = nombresDias[fechaVen.getUTCDay()];
        const fechaStr = fechaVen.toISOString().substring(0, 10);
        if (ventasPorDiaSemana[diaNombre]) {
          ventasPorDiaSemana[diaNombre].total_usd += facMonto;
          ventasPorDiaSemana[diaNombre].total_facturas += 1;
          ventasPorDiaSemana[diaNombre].fechas_distintas.add(fechaStr);
        }

        const horaNum = fechaVen.getUTCHours();
        const horaLabel = `${String(horaNum).padStart(2, '0')}:00 - ${String(horaNum).padStart(2, '0')}:59`;
        if (!ventasPorHora[horaLabel]) {
          ventasPorHora[horaLabel] = { hora: horaLabel, total_usd: 0, pedidos: 0 };
        }
        ventasPorHora[horaLabel].total_usd += facMonto;
        ventasPorHora[horaLabel].pedidos += 1;
      }
    }

    const sId = fac.sede_id;
    if (sId) {
      if (!desglosadoPorSede[sId]) {
        desglosadoPorSede[sId] = {
          sede_id: sId,
          nombre_sede: sedeNombres[sId] || `Sede (${sId})`,
          total_usd: 0,
          total_facturas: 0,
          flete_delivery_usd: 0
        };
      }
      desglosadoPorSede[sId].total_usd += facMonto;
      desglosadoPorSede[sId].total_facturas += 1;
      desglosadoPorSede[sId].flete_delivery_usd += sign * fleteMonto;
    }
  }

  const totalFacturas = facturasValidasCount;

  // 2. Ranking de productos y filtro de producto (usando facturasFiltradas)
  const agrupadoPorProducto: Record<string, {
    producto_id: string;
    nombre: string;
    codigo_barras: string;
    cantidad_vendida: number;
    total_usd: number;
  }> = {};
  let totalUnidades = 0;

  if (args.filtro_producto && args.filtro_producto.trim().length > 0) {
    const busqueda = normalizarTexto(args.filtro_producto);
    const { data: prodsCoincidentes } = await supabase
      .from('productos')
      .select('id, nombre, codigo_barras')
      .eq('empresa_id', empresaId);

    const prodsFiltrados = (prodsCoincidentes || []).filter(p =>
      normalizarTexto(p.nombre).includes(busqueda) || esCoincidenciaAproximada(p.nombre, args.filtro_producto || '')
    );
    const prodIds = prodsFiltrados.map(p => p.id);

    if (prodIds.length > 0) {
      const chunkSize = 200;
      for (let i = 0; i < facturasFiltradas.length; i += chunkSize) {
        const facChunkIds = facturasFiltradas.slice(i, i + chunkSize).map(f => f.id);
        const { data: dets } = await supabase
          .from('ventas_detalles')
          .select('id, factura_id, producto_id, cantidad, precio_unitario, total, productos(id, nombre, codigo_barras)')
          .in('factura_id', facChunkIds)
          .in('producto_id', prodIds);

        for (const det of dets || []) {
          const sign = refundSignMap.get(det.factura_id) || 1;
          const prod = (det as any).productos;
          const prodId = det.producto_id || 'desconocido';
          const prodNombre = prod?.nombre || 'Producto';
          const prodCodigo = prod?.codigo_barras || '';
          const cant = sign * Math.abs(Number(det.cantidad || 0));
          const subtotal = sign * Math.abs(Number(det.total || 0));
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
    }
  } else {
    // Si no hay filtro, computar ranking sobre las facturas filtradas (hasta 2000 recientes)
    const sampleFacturas = facturasFiltradas.slice(0, 2000);
    const chunkSize = 250;
    for (let i = 0; i < sampleFacturas.length; i += chunkSize) {
      const facChunkIds = sampleFacturas.slice(i, i + chunkSize).map(f => f.id);
      const { data: dets } = await supabase
        .from('ventas_detalles')
        .select('id, factura_id, producto_id, cantidad, precio_unitario, total, productos(id, nombre, codigo_barras)')
        .in('factura_id', facChunkIds);

      for (const det of dets || []) {
        const sign = refundSignMap.get(det.factura_id) || 1;
        const prod = (det as any).productos;
        const prodId = det.producto_id || 'desconocido';
        const prodNombre = prod?.nombre || 'Producto';
        const prodCodigo = prod?.codigo_barras || '';
        const cant = sign * Math.abs(Number(det.cantidad || 0));
        const subtotal = sign * Math.abs(Number(det.total || 0));
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

  const desgloseSedesArray = Object.values(desglosadoPorSede).map(s => {
    const sTotal = Number(s.total_usd.toFixed(2));
    const pct = totalRecaudado > 0 ? Number(((sTotal / totalRecaudado) * 100).toFixed(1)) : 0;
    return {
      sede_id: s.sede_id,
      nombre_sede: s.nombre_sede,
      total_usd: sTotal,
      total_facturas: s.total_facturas,
      porcentaje_del_total: `${pct}%`,
      ticket_promedio: s.total_facturas > 0 ? Number((sTotal / s.total_facturas).toFixed(2)) : 0,
      ...(esFiltroDelivery || s.flete_delivery_usd > 0 ? {
        total_flete_delivery_usd: Number(s.flete_delivery_usd.toFixed(2))
      } : {})
    };
  });

  const desglosePorDiaSemana = Object.values(ventasPorDiaSemana)
    .sort((a, b) => a.orden - b.orden)
    .map(d => {
      const diasActivos = d.fechas_distintas.size;
      return {
        dia: d.dia,
        total_usd: Number(d.total_usd.toFixed(2)),
        total_facturas: d.total_facturas,
        dias_operados_en_periodo: diasActivos,
        promedio_por_dia_usd: diasActivos > 0 ? Number((d.total_usd / diasActivos).toFixed(2)) : 0
      };
    });

  const horasPico = Object.values(ventasPorHora)
    .sort((a, b) => b.total_usd - a.total_usd)
    .slice(0, 6)
    .map(h => ({
      franja_horaria: h.hora,
      total_usd: Number(h.total_usd.toFixed(2)),
      pedidos: h.pedidos
    }));

  return {
    periodo: descripcion,
    canal_filtrado: esFiltroDelivery ? 'DELIVERY' : (esFiltroSalon ? 'SALON' : 'TODOS'),
    rango_fechas: { inicio, fin },
    sede_consultada: sedeIdentificada,
    filtro_producto: args.filtro_producto || null,
    total_facturas_emitidas: totalFacturas,
    total_ventas_usd: Number(totalRecaudado.toFixed(2)),
    promedio_ticket_usd: totalFacturas > 0 ? Number((totalRecaudado / totalFacturas).toFixed(2)) : 0,
    ...(esFiltroDelivery || totalFleteRecaudado > 0 ? {
      total_flete_delivery_usd: Number(totalFleteRecaudado.toFixed(2)),
      pedidos_delivery_despachados: facturasValidasCount
    } : {}),
    desglose_por_sede: desgloseSedesArray,
    desglose_por_dia_semana: desglosePorDiaSemana,
    horas_pico_ventas: horasPico,
    total_unidades_coincidentes: Number(totalUnidades.toFixed(2)),
    top_productos_mas_vendidos: topProductos
  };
}

/**
 * 8. Consulta consumo de materia prima, stock e inventario general o por insumo
 */
async function toolConsultarConsumoInsumo(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: { nombre_insumo?: string; periodo?: string; sede_nombre?: string }
) {
  const { supabase, empresaId, sedes } = ctx;
  const { inicio, fin, descripcion } = calcularRangoFechas(args.periodo || 'este_mes');

  let targetSedeId: string | null = null;
  if (args.sede_nombre) {
    const sNorm = normalizarTexto(args.sede_nombre);
    const esGeneral = ['todas', 'ambas', 'todas las sedes', 'consolidado', 'general', 'global', 'ambas sedes'].includes(sNorm);
    if (!esGeneral) {
      const sFound = resolverSede(args.sede_nombre, sedes);
      if (sFound) targetSedeId = sFound.id;
    }
  }

  const termRaw = (args.nombre_insumo || 'todos').trim();
  const termNorm = normalizarTexto(termRaw);
  const esConsultaGeneral = !termRaw || ['todos', 'todo', 'general', 'inventario', 'bajo stock', 'bajostock', 'stock', 'critico', 'alerta', 'valor'].includes(termNorm);

  if (esConsultaGeneral) {
    let qAll = supabase
      .from('inventario_insumos')
      .select('id, nombre, categoria, unidad_medida, cantidad_actual, stock_minimo, costo_promedio, sede_id')
      .eq('empresa_id', empresaId)
      .order('nombre', { ascending: true });

    if (targetSedeId) {
      qAll = qAll.or(`sede_id.eq.${targetSedeId},sede_id.is.null`);
    }

    const { data: todosInsumos, error: errAll } = await qAll;
    if (errAll) return { error: `Error consultando inventario: ${errAll.message}` };

    const items = todosInsumos || [];
    let valorTotalInventarioUsd = 0;
    const bajoStock: any[] = [];
    const agotados: any[] = [];

    const itemsValorizados = items.map(ins => {
      const cant = Number(ins.cantidad_actual || 0);
      const min = Number(ins.stock_minimo || 0);
      const costo = Number(ins.costo_promedio || 0);
      const valorUsd = cant > 0 ? cant * costo : 0;
      valorTotalInventarioUsd += valorUsd;

      const itemObj = {
        id: ins.id,
        nombre: ins.nombre,
        categoria: ins.categoria || 'General',
        unidad_medida: ins.unidad_medida,
        stock_actual: Number(cant.toFixed(2)),
        stock_minimo: Number(min.toFixed(2)),
        costo_unitario_usd: Number(costo.toFixed(4)),
        valor_total_usd: Number(valorUsd.toFixed(2))
      };

      if (cant <= 0) {
        agotados.push(itemObj);
      } else if (min > 0 && cant <= min) {
        bajoStock.push(itemObj);
      }

      return itemObj;
    });

    itemsValorizados.sort((a, b) => b.valor_total_usd - a.valor_total_usd);

    return {
      modo: 'RESUMEN_INVENTARIO_GENERAL',
      total_insumos_registrados: items.length,
      valor_total_inventario_usd: Number(valorTotalInventarioUsd.toFixed(2)),
      total_insumos_agotados: agotados.length,
      total_insumos_bajo_stock_minimo: bajoStock.length,
      insumos_bajo_stock_minimo: bajoStock.slice(0, 25),
      insumos_agotados_muestra: agotados.slice(0, 25),
      top_insumos_mayor_valor_usd: itemsValorizados.slice(0, 20)
    };
  }

  let queryInsumos = supabase
    .from('inventario_insumos')
    .select('id, nombre, unidad_medida, cantidad_actual, stock_minimo, costo_promedio, palabras_clave, sede_id')
    .eq('empresa_id', empresaId)
    .ilike('nombre', `%${termRaw}%`);

  if (targetSedeId) {
    queryInsumos = queryInsumos.or(`sede_id.eq.${targetSedeId},sede_id.is.null`);
  }

  const { data: insumos, error: insErr } = await queryInsumos;
  if (insErr) return { error: `Error buscando insumo: ${insErr.message}` };

  let listaInsumos = insumos && insumos.length > 0 ? insumos : [];

  if (listaInsumos.length === 0) {
    const { data: insumosAlt } = await supabase
      .from('inventario_insumos')
      .select('id, nombre, unidad_medida, cantidad_actual, stock_minimo, costo_promedio, palabras_clave, sede_id')
      .eq('empresa_id', empresaId)
      .limit(300);

    listaInsumos = (insumosAlt || []).filter(i =>
      esCoincidenciaAproximada(i.nombre, termRaw) ||
      (Array.isArray(i.palabras_clave) && i.palabras_clave.some((p: string) => esCoincidenciaAproximada(p, termRaw)))
    );

    if (listaInsumos.length === 0) {
      return {
        encontrado: false,
        mensaje: `No se encontró ningún insumo que coincida con "${termRaw}" en el inventario.`
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

      const cantidadPorProducto: Record<string, number> = {};
      let from = 0;
      const batchSize = 1000;
      while (true) {
        let vQuery = supabase
          .from('ventas_facturas')
          .select(`
            id,
            tipo_documento,
            total,
            ventas_detalles!inner (
              producto_id,
              cantidad
            )
          `)
          .eq('empresa_id', empresaId)
          .eq('estado_activo', true)
          .neq('numero_documento', 'TEST')
          .gte('fecha_venta', inicio)
          .lte('fecha_venta', fin)
          .in('ventas_detalles.producto_id', prodIds)
          .range(from, from + batchSize - 1);

        if (targetSedeId) vQuery = vQuery.eq('sede_id', targetSedeId);

        const { data: facturasProd } = await vQuery;
        if (!facturasProd || facturasProd.length === 0) break;

        for (const f of facturasProd) {
          const isRefund = (f.tipo_documento && (
            f.tipo_documento.toLowerCase().includes('refund') ||
            f.tipo_documento.toLowerCase().includes('devolucion') ||
            f.tipo_documento.toLowerCase().includes('nota_credito') ||
            f.tipo_documento.toLowerCase().includes('nc')
          )) || Number(f.total || 0) < 0;
          const sign = isRefund ? -1 : 1;

          const dets = (f as any).ventas_detalles || [];
          for (const d of dets) {
            if (prodIds.includes(d.producto_id)) {
              cantidadPorProducto[d.producto_id] = (cantidadPorProducto[d.producto_id] || 0) + sign * Math.abs(Number(d.cantidad || 0));
            }
          }
        }

        if (facturasProd.length < batchSize) break;
        from += batchSize;
      }

      for (const rec of recetas) {
        const vendidos = cantidadPorProducto[rec.producto_id] || 0;
        consumoTeorico += vendidos * Number(rec.cantidad_necesaria || 0);
      }
    }

    const cantActual = Number(ins.cantidad_actual || 0);
    const costoProm = Number(ins.costo_promedio || 0);

    resultados.push({
      insumo_id: ins.id,
      nombre: ins.nombre,
      unidad_medida: ins.unidad_medida,
      stock_actual: Number(cantActual.toFixed(2)),
      stock_minimo: Number(ins.stock_minimo || 0),
      costo_unitario_usd: Number(costoProm.toFixed(4)),
      valor_stock_usd: Number((cantActual * costoProm).toFixed(2)),
      consumo_real_registrado: Number(totalSalidasReales.toFixed(2)),
      consumo_teorico_por_recetas: Number(consumoTeorico.toFixed(2)),
      productos_en_receta: productosAfectados
    });
  }

  return {
    periodo: descripcion,
    termino_busqueda: termRaw,
    insumos_encontrados: resultados
  };
}

/**
 * 9. Auditoría de compras sospechosas (excluyendo ANULADAS y paginando)
 */
async function toolAuditarComprasSospechosas(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: { dias_atras?: number; margen_tolerancia_usd?: number }
) {
  const { supabase, empresaId, sedes } = ctx;
  const dias = Math.min(Math.max(args.dias_atras || 30, 1), 180);
  const margen = typeof args.margen_tolerancia_usd === 'number' ? Math.abs(args.margen_tolerancia_usd) : 0.05;

  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - dias);

  const sedeMap: Record<string, string> = {};
  sedes.forEach((s, i) => { sedeMap[s.id] = `Sede ${i + 1} (${s.nombre_sede})`; });

  const { data: compras, error } = await supabase
    .from('compras_puntuales')
    .select('id, id_sede, fecha_registro, proveedor, monto_divisas, monto_bs, tasa_cambio, detalles, estado')
    .eq('id_empresa', empresaId)
    .neq('estado', 'ANULADA')
    .gte('fecha_registro', fechaLimite.toISOString())
    .order('fecha_registro', { ascending: false });

  if (error) return { error: `Error consultando compras: ${error.message}` };

  if (!compras || compras.length < 2) {
    return {
      compras_analizadas: (compras || []).length,
      sospechosas: [],
      mensaje: 'No se encontraron suficientes compras activas en el periodo para detectar duplicados.'
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
            compra_a: { id: c1.id, sede: sedeMap[c1.id_sede] || 'General', proveedor: c1.proveedor, monto_usd: monto1, detalles: c1.detalles },
            compra_b: { id: c2.id, sede: sedeMap[c2.id_sede] || 'General', proveedor: c2.proveedor, monto_usd: monto2, detalles: c2.detalles }
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
 * 10. Busca combos inactivos (consultando 100% de detalles con promo_id)
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

  const combosVendidos = new Set<string>();
  let from = 0;
  const batchSize = 1000;
  while (true) {
    const { data: detsPromo, error: detErr } = await supabase
      .from('ventas_detalles')
      .select('promo_id, ventas_facturas!inner(empresa_id, estado_activo, fecha_venta)')
      .not('promo_id', 'is', null)
      .eq('ventas_facturas.empresa_id', empresaId)
      .eq('ventas_facturas.estado_activo', true)
      .gte('ventas_facturas.fecha_venta', fechaLimite.toISOString())
      .range(from, from + batchSize - 1);

    if (detErr || !detsPromo || detsPromo.length === 0) break;
    for (const d of detsPromo) {
      if (d.promo_id) combosVendidos.add(d.promo_id);
    }
    if (detsPromo.length < batchSize) break;
    from += batchSize;
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

/**
 * 15. Proponer y configurar la actualización de precio de un combo, promoción o producto existente
 */
async function toolProponerActualizarPrecio(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: {
    nombre_combo_o_producto: string;
    nuevo_precio: number;
    nuevo_nombre?: string;
  }
) {
  const { supabase, empresaId } = ctx;
  const busqueda = normalizarTexto(args.nombre_combo_o_producto);
  const nuevoPrecio = Number(args.nuevo_precio);

  if (isNaN(nuevoPrecio) || nuevoPrecio < 0) {
    return { exito: false, error: 'El nuevo precio debe ser un número positivo válido.' };
  }

  // 1. Buscar en promociones_combos
  const { data: promos } = await supabase
    .from('promociones_combos')
    .select('id, nombre, precio_fijo, producto_id, tipo, regla_precio')
    .eq('empresa_id', empresaId);

  // 2. Buscar en productos
  const { data: prods } = await supabase
    .from('productos')
    .select('id, nombre, precio_venta, costo, es_compuesto')
    .eq('empresa_id', empresaId)
    .neq('archivado', true);

  const todasPromos = promos || [];
  const todosProds = prods || [];

  // Match en promociones
  let promo = todasPromos.find(p => normalizarTexto(p.nombre) === busqueda);
  if (!promo) {
    promo = todasPromos.find(p => {
      const n = normalizarTexto(p.nombre);
      return n.includes(busqueda) || busqueda.includes(n);
    });
  }
  if (!promo) {
    promo = todasPromos.find(p => esCoincidenciaAproximada(p.nombre, args.nombre_combo_o_producto, 2));
  }

  // Match en productos
  let prod = todosProds.find(p => normalizarTexto(p.nombre) === busqueda);
  if (!prod && promo?.producto_id) {
    prod = todosProds.find(p => p.id === promo.producto_id);
  }
  if (!prod) {
    prod = todosProds.find(p => {
      const n = normalizarTexto(p.nombre);
      return n.includes(busqueda) || busqueda.includes(n);
    });
  }
  if (!prod) {
    prod = todosProds.find(p => esCoincidenciaAproximada(p.nombre, args.nombre_combo_o_producto, 2));
  }

  if (!promo && !prod) {
    const sugerencias = [
      ...todasPromos.map(p => p.nombre),
      ...todosProds.map(p => p.nombre)
    ]
      .filter(nom => esCoincidenciaAproximada(nom, args.nombre_combo_o_producto, 4))
      .slice(0, 5);

    return {
      exito: false,
      error: `No encontré ningún combo o producto con el nombre "${args.nombre_combo_o_producto}".`,
      sugerencias: sugerencias.length > 0 ? sugerencias : todasPromos.slice(0, 5).map(p => p.nombre)
    };
  }

  const nombreOriginal = prod?.nombre || promo?.nombre || args.nombre_combo_o_producto;
  const precioAnterior = Number(prod?.precio_venta ?? promo?.precio_fijo ?? 0);

  // Si el nombre original tiene un precio embebido (ej: "PROMO 2 PASTICHOS PERSONALES CON BEBIDA $8"),
  // actualizar inteligentemente el nombre para que refleje el nuevo precio si no se especificó nuevo_nombre
  let nuevoNombre = args.nuevo_nombre?.trim();
  if (!nuevoNombre && nombreOriginal.includes('$')) {
    nuevoNombre = nombreOriginal.replace(/\$\s*\d+(\.\d+)?/g, `$${nuevoPrecio}`).trim();
  }

  return {
    exito: true,
    es_promocion: !!promo,
    combo_id: promo?.id || null,
    producto_id: prod?.id || promo?.producto_id || null,
    nombre_actual: nombreOriginal,
    nuevo_nombre: nuevoNombre || nombreOriginal,
    precio_anterior: precioAnterior,
    nuevo_precio: nuevoPrecio,
    diferencia_usd: Math.round((nuevoPrecio - precioAnterior) * 100) / 100
  };
}

/**
 * 16. Proponer y simular actualización o redondeo masivo de precios del catálogo
 */
async function toolProponerAjusteMasivoPrecios(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: {
    criterio_ajuste: string;
    direccion?: 'cercano' | 'arriba' | 'abajo';
    porcentaje?: number;
    redondear_tras_porcentaje?: boolean;
    terminacion_deseada?: number;
    terminacion_filtro?: number;
    filtro_categoria?: string;
    filtro_tipo?: 'todos' | 'solo_productos' | 'solo_combos';
  }
) {
  const { supabase, empresaId } = ctx;
  const direccion = args.direccion || 'cercano';
  const criterio = args.criterio_ajuste || 'redondeo_cincuenta_centavos';
  const filtroTipo = args.filtro_tipo || 'todos';
  const filtroCategoria = args.filtro_categoria ? normalizarTexto(args.filtro_categoria) : '';

  // 1. Obtener productos activos de la empresa con sus categorías
  const { data: prods, error: errProds } = await supabase
    .from('productos')
    .select('id, nombre, precio_venta, costo, categoria_id, categorias ( id, nombre )')
    .eq('empresa_id', empresaId)
    .neq('archivado', true);

  if (errProds) {
    return { exito: false, error: `Error al consultar productos: ${errProds.message}` };
  }

  // 2. Obtener promociones y combos activos de la empresa
  const { data: promos, error: errPromos } = await supabase
    .from('promociones_combos')
    .select('id, nombre, precio_fijo, producto_id, tipo, regla_precio, estado_activo')
    .eq('empresa_id', empresaId);

  if (errPromos) {
    console.warn('[Copilot] No se pudieron cargar promociones:', errPromos.message);
  }

  const todasPromos = (promos || []).filter(p => p.estado_activo !== false);
  const todosProds = prods || [];

  // Mapeo para no duplicar productos vinculados directamente a promociones/combos
  const promoProductoIds = new Set(todasPromos.map(p => p.producto_id).filter(Boolean));

  // Función de cálculo de nuevo precio según criterio y dirección
  const calcularPrecio = (precioActual: number): number => {
    let nuevo = precioActual;

    if (criterio === 'porcentaje' && typeof args.porcentaje === 'number') {
      nuevo = precioActual * (1 + args.porcentaje / 100);
      if (!args.redondear_tras_porcentaje) {
        return Math.max(0, Math.round(nuevo * 100) / 100);
      }
      // Redondeo a $0.50 tras porcentaje
      if (direccion === 'arriba') nuevo = Math.ceil(nuevo * 2) / 2;
      else if (direccion === 'abajo') nuevo = Math.floor(nuevo * 2) / 2;
      else nuevo = Math.round(nuevo * 2) / 2;
      return Math.max(0, Math.round(nuevo * 100) / 100);
    }

    if (criterio === 'redondeo_entero' || criterio === 'eliminar_centavos') {
      if (direccion === 'arriba') nuevo = Math.ceil(nuevo);
      else if (direccion === 'abajo') nuevo = Math.floor(nuevo);
      else nuevo = Math.round(nuevo);
    } else if (criterio === 'redondeo_cincuenta_centavos') {
      if (direccion === 'arriba') nuevo = Math.ceil(nuevo * 2) / 2;
      else if (direccion === 'abajo') nuevo = Math.floor(nuevo * 2) / 2;
      else nuevo = Math.round(nuevo * 2) / 2;
    } else if (criterio === 'fijar_terminacion' && typeof args.terminacion_deseada === 'number') {
      const entero = Math.floor(nuevo);
      const dec = args.terminacion_deseada >= 1 ? args.terminacion_deseada / 100 : args.terminacion_deseada;
      nuevo = entero + dec;
    }

    return Math.max(0, Math.round(nuevo * 100) / 100);
  };

  interface ItemModificado {
    id: string;
    comboId?: string | null;
    productoId?: string | null;
    tipo: 'producto' | 'combo';
    nombre: string;
    nuevo_nombre: string;
    categoria: string;
    precio_anterior: number;
    nuevo_precio: number;
    diferencia_usd: number;
  }

  const itemsModificados: ItemModificado[] = [];

  // Procesar Combos / Promociones
  if (filtroTipo !== 'solo_productos') {
    for (const promo of todasPromos) {
      if (filtroCategoria && !filtroCategoria.includes('combo') && !filtroCategoria.includes('promo')) {
        const nomNorm = normalizarTexto(promo.nombre);
        if (!nomNorm.includes(filtroCategoria)) continue;
      }

      const precioActual = Number(promo.precio_fijo || 0);
      if (precioActual <= 0) continue;

      if (typeof args.terminacion_filtro === 'number') {
        const decActual = Math.round((precioActual % 1) * 100);
        const decFiltro = Math.round(args.terminacion_filtro >= 1 ? args.terminacion_filtro : args.terminacion_filtro * 100);
        if (Math.abs(decActual - decFiltro) > 1) continue;
      }

      const nuevoPrecio = calcularPrecio(precioActual);
      if (Math.abs(nuevoPrecio - precioActual) > 0.001) {
        let nuevoNombre = promo.nombre;
        if (nuevoNombre.includes('$')) {
          nuevoNombre = nuevoNombre.replace(/\$\s*\d+(\.\d+)?/g, `$${nuevoPrecio}`).trim();
        }

        itemsModificados.push({
          id: promo.id,
          comboId: promo.id,
          productoId: promo.producto_id || null,
          tipo: 'combo',
          nombre: promo.nombre,
          nuevo_nombre: nuevoNombre,
          categoria: 'Promociones y Combos',
          precio_anterior: precioActual,
          nuevo_precio: nuevoPrecio,
          diferencia_usd: Math.round((nuevoPrecio - precioActual) * 100) / 100
        });
      }
    }
  }

  // Procesar Productos individuales
  if (filtroTipo !== 'solo_combos') {
    for (const prod of todosProds) {
      if (promoProductoIds.has(prod.id)) continue;

      const catNombre = (prod.categorias as any)?.nombre || 'General';
      const catNorm = normalizarTexto(catNombre);

      if (filtroCategoria && !catNorm.includes(filtroCategoria)) {
        const prodNorm = normalizarTexto(prod.nombre);
        if (!prodNorm.includes(filtroCategoria)) continue;
      }

      const precioActual = Number(prod.precio_venta || 0);
      if (precioActual <= 0) continue;

      if (typeof args.terminacion_filtro === 'number') {
        const decActual = Math.round((precioActual % 1) * 100);
        const decFiltro = Math.round(args.terminacion_filtro >= 1 ? args.terminacion_filtro : args.terminacion_filtro * 100);
        if (Math.abs(decActual - decFiltro) > 1) continue;
      }

      const nuevoPrecio = calcularPrecio(precioActual);
      if (Math.abs(nuevoPrecio - precioActual) > 0.001) {
        let nuevoNombre = prod.nombre;
        if (nuevoNombre.includes('$')) {
          nuevoNombre = nuevoNombre.replace(/\$\s*\d+(\.\d+)?/g, `$${nuevoPrecio}`).trim();
        }

        itemsModificados.push({
          id: prod.id,
          productoId: prod.id,
          tipo: 'producto',
          nombre: prod.nombre,
          nuevo_nombre: nuevoNombre,
          categoria: catNombre,
          precio_anterior: precioActual,
          nuevo_precio: nuevoPrecio,
          diferencia_usd: Math.round((nuevoPrecio - precioActual) * 100) / 100
        });
      }
    }
  }

  let descCriterio = 'Redondeo a múltiplos de $0.50';
  if (criterio === 'redondeo_entero' || criterio === 'eliminar_centavos') {
    descCriterio = `Redondeo a enteros (${direccion === 'arriba' ? 'al alza' : direccion === 'abajo' ? 'a la baja' : 'al más cercano'})`;
  } else if (criterio === 'porcentaje') {
    descCriterio = `${(args.porcentaje || 0) >= 0 ? '+' : ''}${args.porcentaje}%${args.redondear_tras_porcentaje ? ' con redondeo a $0.50' : ''}`;
  } else if (criterio === 'fijar_terminacion') {
    descCriterio = `Fijar terminación en .${args.terminacion_deseada}`;
  }

  if (itemsModificados.length === 0) {
    return {
      exito: false,
      total_afectados: 0,
      mensaje: `Todos los precios evaluados ya cumplen con el criterio (${descCriterio}). No se encontraron precios pendientes por modificar.`
    };
  }

  const sumaDif = itemsModificados.reduce((acc, it) => acc + it.diferencia_usd, 0);
  const cambioPromedio = Math.round((sumaDif / itemsModificados.length) * 100) / 100;

  return {
    exito: true,
    criterio,
    descripcion_criterio: descCriterio,
    total_afectados: itemsModificados.length,
    items: itemsModificados,
    resumen: {
      total_productos: itemsModificados.filter(i => i.tipo === 'producto').length,
      total_combos: itemsModificados.filter(i => i.tipo === 'combo').length,
      cambio_promedio_usd: cambioPromedio
    }
  };
}

/**
 * 16. Consulta Cuentas por Cobrar (Deudores, Créditos pendientes y Saldos por cliente/sede)
 */
async function toolConsultarCuentasPorCobrar(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: { cliente_nombre?: string; sede_nombre?: string }
) {
  const { supabase, empresaId, sedes } = ctx;

  let targetSedeId: string | null = null;
  if (args.sede_nombre) {
    const sNorm = normalizarTexto(args.sede_nombre);
    const esGeneral = ['todas', 'ambas', 'todas las sedes', 'consolidado', 'general', 'global', 'ambas sedes'].includes(sNorm);
    if (!esGeneral) {
      const sFound = resolverSede(args.sede_nombre, sedes);
      if (sFound) targetSedeId = sFound.id;
    }
  }

  const sedeNombres: Record<string, string> = {};
  const deudaPorSede: Record<string, { sede: string; deuda_total_usd: number; facturas_pendientes: number }> = {};
  sedes.forEach((s, idx) => {
    const label = `Sede ${idx + 1} (${s.nombre_sede})`;
    sedeNombres[s.id] = label;
    deudaPorSede[s.id] = { sede: label, deuda_total_usd: 0, facturas_pendientes: 0 };
  });

  let allDeudas: any[] = [];
  let from = 0;
  const batchSize = 1000;

  while (true) {
    let q = supabase
      .from('ventas_facturas')
      .select(`
        id,
        sede_id,
        numero_documento,
        numero_orden,
        tipo_documento,
        fecha_venta,
        fecha_vencimiento,
        total,
        saldo_pendiente,
        estado_pago,
        cliente_nombre,
        notas,
        clientes (
          nombre,
          rif_cedula,
          telefono
        ),
        ventas_pagos (
          tipo_pago,
          monto
        )
      `)
      .eq('empresa_id', empresaId)
      .eq('estado_activo', true)
      .neq('numero_documento', 'TEST')
      .gt('saldo_pendiente', 0.01)
      .order('fecha_venta', { ascending: false })
      .range(from, from + batchSize - 1);

    if (targetSedeId) q = q.eq('sede_id', targetSedeId);

    const { data: batch, error } = await q;
    if (error) return { error: `Error consultando cuentas por cobrar: ${error.message}` };
    if (!batch || batch.length === 0) break;

    allDeudas.push(...batch);
    if (batch.length < batchSize) break;
    from += batchSize;
  }

  const filtroCli = args.cliente_nombre ? normalizarTexto(args.cliente_nombre) : '';
  let totalDeudaUsd = 0;
  let totalFacturasPendientes = 0;

  const porCliente: Record<string, {
    cliente: string;
    telefono: string;
    documento_id: string;
    deuda_total_usd: number;
    facturas_pendientes: number;
    fecha_mas_antigua: string;
    facturas_detalle: any[];
  }> = {};

  for (const fac of allDeudas) {
    const isCortesia = fac.ventas_pagos?.some((p: any) => {
      const tp = (p.tipo_pago || '').toLowerCase();
      return tp.includes('cortes') || tp.includes('regal');
    }) ||
    (fac.tipo_documento && (fac.tipo_documento.toLowerCase().includes('cortes') || fac.tipo_documento.toLowerCase().includes('regal'))) ||
    (fac.numero_orden && (fac.numero_orden.toLowerCase().includes('cortes') || fac.numero_orden.toLowerCase().includes('regal')));

    if (isCortesia) continue;

    const saldo = Number(fac.saldo_pendiente || 0);
    if (saldo <= 0.01) continue;

    const cliObj = (fac as any).clientes;
    const nombreCliente = (cliObj?.nombre || fac.cliente_nombre || 'Cliente General / Sin Nombre').trim();

    if (filtroCli) {
      const nomNorm = normalizarTexto(nombreCliente);
      if (!nomNorm.includes(filtroCli) && !esCoincidenciaAproximada(nombreCliente, args.cliente_nombre || '')) {
        continue;
      }
    }

    totalDeudaUsd += saldo;
    totalFacturasPendientes++;

    const sId = fac.sede_id;
    if (sId && deudaPorSede[sId]) {
      deudaPorSede[sId].deuda_total_usd = Number((deudaPorSede[sId].deuda_total_usd + saldo).toFixed(2));
      deudaPorSede[sId].facturas_pendientes += 1;
    }

    const cliKey = nombreCliente.toUpperCase();
    const fechaStr = (fac.fecha_venta || '').substring(0, 10);
    if (!porCliente[cliKey]) {
      porCliente[cliKey] = {
        cliente: nombreCliente,
        telefono: cliObj?.telefono || 'N/A',
        documento_id: cliObj?.rif_cedula || 'N/A',
        deuda_total_usd: 0,
        facturas_pendientes: 0,
        fecha_mas_antigua: fechaStr,
        facturas_detalle: []
      };
    }

    porCliente[cliKey].deuda_total_usd = Number((porCliente[cliKey].deuda_total_usd + saldo).toFixed(2));
    porCliente[cliKey].facturas_pendientes += 1;
    if (fechaStr && (!porCliente[cliKey].fecha_mas_antigua || fechaStr < porCliente[cliKey].fecha_mas_antigua)) {
      porCliente[cliKey].fecha_mas_antigua = fechaStr;
    }

    if (porCliente[cliKey].facturas_detalle.length < 8) {
      porCliente[cliKey].facturas_detalle.push({
        documento: fac.numero_documento || fac.numero_orden,
        fecha: fechaStr,
        sede: sedeNombres[sId] || 'General',
        total_factura_usd: Number(Number(fac.total || 0).toFixed(2)),
        saldo_pendiente_usd: Number(saldo.toFixed(2)),
        notas: fac.notas || null
      });
    }
  }

  const rankingDeudores = Object.values(porCliente).sort((a, b) => b.deuda_total_usd - a.deuda_total_usd);

  return {
    total_deuda_por_cobrar_usd: Number(totalDeudaUsd.toFixed(2)),
    total_facturas_pendientes: totalFacturasPendientes,
    total_clientes_con_deuda: rankingDeudores.length,
    desglose_por_sede: Object.values(deudaPorSede),
    ranking_deudores: rankingDeudores.slice(0, 30)
  };
}

/**
 * 17. Consulta Mermas, Desperdicios, Cortesías, Regalías y Ventas al Costo
 */
async function toolConsultarMermasYCortesias(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: { periodo?: string; sede_nombre?: string }
) {
  const { supabase, empresaId, sedes } = ctx;
  const { inicio, fin, descripcion } = calcularRangoFechas(args.periodo || 'este_mes');

  let targetSedeId: string | null = null;
  if (args.sede_nombre) {
    const sNorm = normalizarTexto(args.sede_nombre);
    const esGeneral = ['todas', 'ambas', 'todas las sedes', 'consolidado', 'general', 'global', 'ambas sedes'].includes(sNorm);
    if (!esGeneral) {
      const sFound = resolverSede(args.sede_nombre, sedes);
      if (sFound) targetSedeId = sFound.id;
    }
  }

  const sedeNombres: Record<string, string> = {};
  sedes.forEach((s, idx) => { sedeNombres[s.id] = `Sede ${idx + 1} (${s.nombre_sede})`; });

  // 1. Buscar Cortesías / Regalías en ventas_facturas
  let allFacturas: any[] = [];
  let from = 0;
  const batchSize = 1000;
  while (true) {
    let q = supabase
      .from('ventas_facturas')
      .select(`
        id,
        sede_id,
        numero_documento,
        numero_orden,
        tipo_documento,
        fecha_venta,
        total,
        cliente_nombre,
        cajero_nombre,
        notas,
        ventas_pagos (
          tipo_pago,
          monto
        )
      `)
      .eq('empresa_id', empresaId)
      .eq('estado_activo', true)
      .neq('numero_documento', 'TEST')
      .gte('fecha_venta', inicio)
      .lte('fecha_venta', fin)
      .range(from, from + batchSize - 1);

    if (targetSedeId) q = q.eq('sede_id', targetSedeId);

    const { data: batch, error } = await q;
    if (error || !batch || batch.length === 0) break;
    allFacturas.push(...batch);
    if (batch.length < batchSize) break;
    from += batchSize;
  }

  let totalCortesiasUsd = 0;
  let cantidadCortesias = 0;
  const cortesiasPorSede: Record<string, { sede: string; total_usd: number; ordenes: number }> = {};
  const cortesiasPorBeneficiario: Record<string, { beneficiario: string; total_usd: number; ordenes: number }> = {};
  const cortesiasDetalle: any[] = [];

  for (const fac of allFacturas) {
    const isCortesia = fac.ventas_pagos?.some((p: any) => {
      const tp = (p.tipo_pago || '').toLowerCase();
      return tp.includes('cortes') || tp.includes('regal');
    }) ||
    (fac.tipo_documento && (fac.tipo_documento.toLowerCase().includes('cortes') || fac.tipo_documento.toLowerCase().includes('regal'))) ||
    (fac.numero_orden && (fac.numero_orden.toLowerCase().includes('cortes') || fac.numero_orden.toLowerCase().includes('regal')));

    if (!isCortesia) continue;

    const monto = Math.abs(Number(fac.total || 0));
    totalCortesiasUsd += monto;
    cantidadCortesias++;

    const sNombre = sedeNombres[fac.sede_id] || 'General';
    if (!cortesiasPorSede[sNombre]) {
      cortesiasPorSede[sNombre] = { sede: sNombre, total_usd: 0, ordenes: 0 };
    }
    cortesiasPorSede[sNombre].total_usd = Number((cortesiasPorSede[sNombre].total_usd + monto).toFixed(2));
    cortesiasPorSede[sNombre].ordenes += 1;

    const benef = (fac.cliente_nombre || fac.notas || 'Sin Beneficiario Especificado').trim();
    if (!cortesiasPorBeneficiario[benef]) {
      cortesiasPorBeneficiario[benef] = { beneficiario: benef, total_usd: 0, ordenes: 0 };
    }
    cortesiasPorBeneficiario[benef].total_usd = Number((cortesiasPorBeneficiario[benef].total_usd + monto).toFixed(2));
    cortesiasPorBeneficiario[benef].ordenes += 1;

    if (cortesiasDetalle.length < 25) {
      cortesiasDetalle.push({
        fecha: (fac.fecha_venta || '').substring(0, 10),
        sede: sNombre,
        orden: fac.numero_orden || fac.numero_documento,
        beneficiario: benef,
        cajero: fac.cajero_nombre || 'N/A',
        valor_usd: Number(monto.toFixed(2))
      });
    }
  }

  // 2. Buscar Mermas en tabla shrinkages y movimientos_inventario
  let qShrink = supabase
    .from('shrinkages')
    .select('id, sede_id, quantity, unit_cost, total_loss, notes, created_at')
    .eq('empresa_id', empresaId)
    .gte('created_at', inicio)
    .lte('created_at', fin);

  if (targetSedeId) qShrink = qShrink.eq('sede_id', targetSedeId);
  const { data: shrinkRows } = await qShrink;

  let totalMermasUsd = 0;
  const mermasDetalle: any[] = [];
  for (const sh of shrinkRows || []) {
    const loss = Number(sh.total_loss || (Number(sh.quantity || 0) * Number(sh.unit_cost || 0)));
    totalMermasUsd += loss;
    mermasDetalle.push({
      fecha: (sh.created_at || '').substring(0, 10),
      sede: sedeNombres[sh.sede_id] || 'General',
      cantidad: Number(sh.quantity || 0),
      perdida_usd: Number(loss.toFixed(2)),
      motivo: sh.notes || 'Merma registrada'
    });
  }

  // 3. Buscar Salidas de Almacén por Merma o Venta al Costo en movimientos_inventario
  let qMovs = supabase
    .from('movimientos_inventario')
    .select('id, insumo_id, cantidad, motivo, fecha_movimiento, inventario_insumos(nombre, unidad_medida, costo_promedio)')
    .eq('empresa_id', empresaId)
    .eq('tipo_movimiento', 'SALIDA')
    .gte('fecha_movimiento', inicio)
    .lte('fecha_movimiento', fin);

  const { data: movsSalida } = await qMovs;
  let totalVentasCostoUsd = 0;
  const ventasCostoDetalle: any[] = [];

  for (const m of movsSalida || []) {
    const mot = (m.motivo || '').toLowerCase();
    const ins = (m as any).inventario_insumos;
    const cant = Number(m.cantidad || 0);
    const costo = Number(ins?.costo_promedio || 0);
    const valor = cant * costo;

    if (mot.includes('venta al costo') || mot.includes('costo')) {
      totalVentasCostoUsd += valor;
      if (ventasCostoDetalle.length < 25) {
        ventasCostoDetalle.push({
          fecha: (m.fecha_movimiento || '').substring(0, 10),
          insumo: ins?.nombre || 'Insumo',
          cantidad: `${cant} ${ins?.unidad_medida || ''}`.trim(),
          costo_total_usd: Number(valor.toFixed(2)),
          motivo: m.motivo
        });
      }
    } else if (mot.includes('merma') || mot.includes('dañad') || mot.includes('vencid') || mot.includes('desperdicio')) {
      totalMermasUsd += valor;
      if (mermasDetalle.length < 25) {
        mermasDetalle.push({
          fecha: (m.fecha_movimiento || '').substring(0, 10),
          insumo: ins?.nombre || 'Insumo',
          cantidad: `${cant} ${ins?.unidad_medida || ''}`.trim(),
          perdida_usd: Number(valor.toFixed(2)),
          motivo: m.motivo
        });
      }
    }
  }

  return {
    periodo: descripcion,
    cortesias_y_regalias: {
      total_valor_menu_usd: Number(totalCortesiasUsd.toFixed(2)),
      cantidad_ordenes: cantidadCortesias,
      desglose_por_sede: Object.values(cortesiasPorSede),
      top_beneficiarios: Object.values(cortesiasPorBeneficiario).sort((a, b) => b.total_usd - a.total_usd).slice(0, 15),
      ultimas_cortesias: cortesiasDetalle
    },
    mermas_y_desperdicios: {
      total_perdida_usd: Number(totalMermasUsd.toFixed(2)),
      total_registros: mermasDetalle.length,
      detalle_mermas: mermasDetalle
    },
    ventas_al_costo_personal: {
      total_costo_usd: Number(totalVentasCostoUsd.toFixed(2)),
      total_registros: ventasCostoDetalle.length,
      detalle: ventasCostoDetalle
    }
  };
}

/**
 * 18. Consulta Desempeño de Equipo (Cajeros, Meseros, Repartidores y Propinas)
 */
async function toolConsultarDesempenoEquipo(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: { periodo?: string; sede_nombre?: string }
) {
  const { supabase, empresaId, sedes } = ctx;
  const { inicio, fin, descripcion } = calcularRangoFechas(args.periodo || 'este_mes');

  let targetSedeId: string | null = null;
  if (args.sede_nombre) {
    const sNorm = normalizarTexto(args.sede_nombre);
    const esGeneral = ['todas', 'ambas', 'todas las sedes', 'consolidado', 'general', 'global', 'ambas sedes'].includes(sNorm);
    if (!esGeneral) {
      const sFound = resolverSede(args.sede_nombre, sedes);
      if (sFound) targetSedeId = sFound.id;
    }
  }

  const sedeNombres: Record<string, string> = {};
  sedes.forEach((s, idx) => { sedeNombres[s.id] = `Sede ${idx + 1} (${s.nombre_sede})`; });

  const { data: perfilesList } = await supabase
    .from('perfiles')
    .select('id, nombre_completo, rol, sede_id')
    .eq('empresa_id', empresaId);

  const { data: usuariosPos } = await supabase
    .from('usuarios')
    .select('id, nombre, rol')
    .eq('empresa_id', empresaId);

  const mapaUsuarios: Record<string, string> = {};
  (perfilesList || []).forEach(p => { if (p.id && p.nombre_completo) mapaUsuarios[p.id] = p.nombre_completo; });
  (usuariosPos || []).forEach(u => { if (u.id && u.nombre) mapaUsuarios[u.id] = u.nombre; });

  let allFacturas: any[] = [];
  let from = 0;
  const batchSize = 1000;
  while (true) {
    let q = supabase
      .from('ventas_facturas')
      .select(`
        id,
        sede_id,
        total,
        propina,
        pago_repartidor,
        tipo_documento,
        numero_orden,
        usuario_id,
        cajero_nombre,
        mesero_nombre,
        repartidor_id,
        ventas_pagos (
          tipo_pago
        )
      `)
      .eq('empresa_id', empresaId)
      .eq('estado_activo', true)
      .neq('numero_documento', 'TEST')
      .gte('fecha_venta', inicio)
      .lte('fecha_venta', fin)
      .range(from, from + batchSize - 1);

    if (targetSedeId) q = q.eq('sede_id', targetSedeId);

    const { data: batch, error } = await q;
    if (error || !batch || batch.length === 0) break;
    allFacturas.push(...batch);
    if (batch.length < batchSize) break;
    from += batchSize;
  }

  const porCajero: Record<string, { nombre: string; sede: string; ventas_usd: number; facturas: number }> = {};
  const porMesero: Record<string, { nombre: string; sede: string; ventas_usd: number; mesas_atendidas: number; propinas_usd: number }> = {};
  const porRepartidor: Record<string, { repartidor: string; despachos: number; ventas_entregadas_usd: number; pago_flete_acumulado_usd: number }> = {};

  let totalPropinasUsd = 0;
  let totalPagosRepartidorUsd = 0;

  for (const fac of allFacturas) {
    const isCortesia = fac.ventas_pagos?.some((p: any) => {
      const tp = (p.tipo_pago || '').toLowerCase();
      return tp.includes('cortes') || tp.includes('regal');
    }) ||
    (fac.tipo_documento && (fac.tipo_documento.toLowerCase().includes('cortes') || fac.tipo_documento.toLowerCase().includes('regal'))) ||
    (fac.numero_orden && (fac.numero_orden.toLowerCase().includes('cortes') || fac.numero_orden.toLowerCase().includes('regal')));

    if (isCortesia) continue;

    const isRefund = (fac.tipo_documento && (
      fac.tipo_documento.toLowerCase().includes('refund') ||
      fac.tipo_documento.toLowerCase().includes('devolucion') ||
      fac.tipo_documento.toLowerCase().includes('nota_credito') ||
      fac.tipo_documento.toLowerCase().includes('nc')
    )) || Number(fac.total || 0) < 0;

    const sign = isRefund ? -1 : 1;
    const monto = sign * Math.abs(Number(fac.total || 0));
    const propina = sign * Math.abs(Number(fac.propina || 0));
    const pagoRep = sign * Math.abs(Number(fac.pago_repartidor || 0));
    const sNombre = sedeNombres[fac.sede_id] || 'General';

    totalPropinasUsd += propina;
    totalPagosRepartidorUsd += pagoRep;

    const nombreCajero = (fac.cajero_nombre || mapaUsuarios[fac.usuario_id] || 'Caja Principal').trim();
    const cajKey = `${nombreCajero}__${sNombre}`;
    if (!porCajero[cajKey]) {
      porCajero[cajKey] = { nombre: nombreCajero, sede: sNombre, ventas_usd: 0, facturas: 0 };
    }
    porCajero[cajKey].ventas_usd += monto;
    porCajero[cajKey].facturas += 1;

    if (fac.mesero_nombre || propina > 0) {
      const nombreMesero = (fac.mesero_nombre || nombreCajero).trim();
      const mesKey = `${nombreMesero}__${sNombre}`;
      if (!porMesero[mesKey]) {
        porMesero[mesKey] = { nombre: nombreMesero, sede: sNombre, ventas_usd: 0, mesas_atendidas: 0, propinas_usd: 0 };
      }
      porMesero[mesKey].ventas_usd += monto;
      porMesero[mesKey].mesas_atendidas += 1;
      porMesero[mesKey].propinas_usd += propina;
    }

    if (fac.repartidor_id || pagoRep > 0) {
      const repNombre = mapaUsuarios[fac.repartidor_id] || fac.repartidor_id || 'Repartidor General';
      if (!porRepartidor[repNombre]) {
        porRepartidor[repNombre] = { repartidor: repNombre, despachos: 0, ventas_entregadas_usd: 0, pago_flete_acumulado_usd: 0 };
      }
      porRepartidor[repNombre].despachos += 1;
      porRepartidor[repNombre].ventas_entregadas_usd += monto;
      porRepartidor[repNombre].pago_flete_acumulado_usd += pagoRep;
    }
  }

  return {
    periodo: descripcion,
    total_propinas_recaudadas_usd: Number(totalPropinasUsd.toFixed(2)),
    total_pagos_repartidores_usd: Number(totalPagosRepartidorUsd.toFixed(2)),
    ranking_cajeros: Object.values(porCajero)
      .sort((a, b) => b.ventas_usd - a.ventas_usd)
      .map(c => ({
        ...c,
        ventas_usd: Number(c.ventas_usd.toFixed(2)),
        ticket_promedio_usd: c.facturas > 0 ? Number((c.ventas_usd / c.facturas).toFixed(2)) : 0
      })),
    ranking_meseros_y_propinas: Object.values(porMesero)
      .sort((a, b) => b.ventas_usd - a.ventas_usd)
      .map(m => ({
        ...m,
        ventas_usd: Number(m.ventas_usd.toFixed(2)),
        propinas_usd: Number(m.propinas_usd.toFixed(2))
      })),
    ranking_repartidores_delivery: Object.values(porRepartidor)
      .sort((a, b) => b.despachos - a.despachos)
      .map(r => ({
        ...r,
        ventas_entregadas_usd: Number(r.ventas_entregadas_usd.toFixed(2)),
        pago_flete_acumulado_usd: Number(r.pago_flete_acumulado_usd.toFixed(2))
      }))
  };
}

/**
 * 19. Consulta Compras de Insumos, Gastos Operativos y Ranking de Proveedores
 */
async function toolConsultarComprasYProveedores(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: { periodo?: string; filtro_proveedor_o_concepto?: string; sede_nombre?: string }
) {
  const { supabase, empresaId, sedes } = ctx;
  const { inicio, fin, descripcion } = calcularRangoFechas(args.periodo || 'este_mes');

  let targetSedeId: string | null = null;
  if (args.sede_nombre) {
    const sNorm = normalizarTexto(args.sede_nombre);
    const esGeneral = ['todas', 'ambas', 'todas las sedes', 'consolidado', 'general', 'global', 'ambas sedes'].includes(sNorm);
    if (!esGeneral) {
      const sFound = resolverSede(args.sede_nombre, sedes);
      if (sFound) targetSedeId = sFound.id;
    }
  }

  const sedeNombres: Record<string, string> = {};
  const comprasPorSede: Record<string, { sede: string; insumos_usd: number; gastos_operativos_usd: number; total_usd: number }> = {};
  sedes.forEach((s, idx) => {
    const label = `Sede ${idx + 1} (${s.nombre_sede})`;
    sedeNombres[s.id] = label;
    comprasPorSede[s.id] = { sede: label, insumos_usd: 0, gastos_operativos_usd: 0, total_usd: 0 };
  });

  let allCompras: any[] = [];
  let from = 0;
  const batchSize = 1000;
  while (true) {
    let q = supabase
      .from('compras_puntuales')
      .select('id, id_sede, fecha_registro, proveedor, monto_divisas, monto_bs, tasa_cambio, metodo_pago, detalles, estado')
      .eq('id_empresa', empresaId)
      .neq('estado', 'ANULADA')
      .gte('fecha_registro', inicio)
      .lte('fecha_registro', fin)
      .order('fecha_registro', { ascending: false })
      .range(from, from + batchSize - 1);

    if (targetSedeId) q = q.eq('id_sede', targetSedeId);

    const { data: batch, error } = await q;
    if (error) return { error: `Error consultando compras y gastos: ${error.message}` };
    if (!batch || batch.length === 0) break;

    allCompras.push(...batch);
    if (batch.length < batchSize) break;
    from += batchSize;
  }

  const filtro = args.filtro_proveedor_o_concepto ? normalizarTexto(args.filtro_proveedor_o_concepto) : '';
  let totalInsumosUsd = 0;
  let totalGastosOpUsd = 0;

  const porProveedor: Record<string, { proveedor: string; tipo: string; total_usd: number; compras_count: number }> = {};
  const registrosRecientes: any[] = [];

  for (const c of allCompras) {
    const prov = (c.proveedor || 'Proveedor General').trim();
    const detsStr = JSON.stringify(c.detalles || '');
    if (filtro) {
      if (!normalizarTexto(prov).includes(filtro) && !normalizarTexto(detsStr).includes(filtro)) {
        continue;
      }
    }

    const montoUsd = Number(c.monto_divisas || 0);
    const esGastoOp = Array.isArray(c.detalles) && c.detalles.length > 0 && c.detalles[0]?.es_gasto_operativo === true;

    if (esGastoOp) {
      totalGastosOpUsd += montoUsd;
    } else {
      totalInsumosUsd += montoUsd;
    }

    const sId = c.id_sede;
    if (sId && comprasPorSede[sId]) {
      if (esGastoOp) comprasPorSede[sId].gastos_operativos_usd = Number((comprasPorSede[sId].gastos_operativos_usd + montoUsd).toFixed(2));
      else comprasPorSede[sId].insumos_usd = Number((comprasPorSede[sId].insumos_usd + montoUsd).toFixed(2));
      comprasPorSede[sId].total_usd = Number((comprasPorSede[sId].total_usd + montoUsd).toFixed(2));
    }

    const provKey = prov.toUpperCase();
    if (!porProveedor[provKey]) {
      porProveedor[provKey] = {
        proveedor: prov,
        tipo: esGastoOp ? 'Gasto Operativo' : 'Proveedor de Insumos',
        total_usd: 0,
        compras_count: 0
      };
    }
    porProveedor[provKey].total_usd = Number((porProveedor[provKey].total_usd + montoUsd).toFixed(2));
    porProveedor[provKey].compras_count += 1;

    if (registrosRecientes.length < 25) {
      registrosRecientes.push({
        fecha: (c.fecha_registro || '').substring(0, 10),
        sede: sedeNombres[sId] || 'General',
        proveedor_o_concepto: prov,
        tipo: esGastoOp ? 'GASTO OPERATIVO' : 'COMPRA INSUMOS',
        monto_usd: Number(montoUsd.toFixed(2)),
        metodo_pago: c.metodo_pago || 'N/A'
      });
    }
  }

  return {
    periodo: descripcion,
    total_general_egresos_usd: Number((totalInsumosUsd + totalGastosOpUsd).toFixed(2)),
    total_compras_insumos_usd: Number(totalInsumosUsd.toFixed(2)),
    total_gastos_operativos_usd: Number(totalGastosOpUsd.toFixed(2)),
    desglose_por_sede: Object.values(comprasPorSede),
    ranking_proveedores_y_gastos: Object.values(porProveedor).sort((a, b) => b.total_usd - a.total_usd).slice(0, 25),
    ultimos_registros: registrosRecientes
  };
}

/**
 * 20. Consulta Cierres de Caja (Arqueos Z) y Mesas/Cuentas Abiertas en Tiempo Real
 */
async function toolConsultarCierresYMesasAbiertas(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: { periodo?: string; sede_nombre?: string }
) {
  const { supabase, empresaId, sedes } = ctx;
  const { inicio, fin, descripcion } = calcularRangoFechas(args.periodo || 'esta_semana');

  let targetSedeId: string | null = null;
  if (args.sede_nombre) {
    const sNorm = normalizarTexto(args.sede_nombre);
    const esGeneral = ['todas', 'ambas', 'todas las sedes', 'consolidado', 'general', 'global', 'ambas sedes'].includes(sNorm);
    if (!esGeneral) {
      const sFound = resolverSede(args.sede_nombre, sedes);
      if (sFound) targetSedeId = sFound.id;
    }
  }

  const sedeNombres: Record<string, string> = {};
  sedes.forEach((s, idx) => { sedeNombres[s.id] = `Sede ${idx + 1} (${s.nombre_sede})`; });

  // 1. Consultar Mesas / Cuentas Abiertas actualmente en POS
  let qMesas = supabase
    .from('pos_cuentas_abiertas')
    .select('id, sede_id, numero_documento, nombre_cuenta, total, fecha_apertura, actualizado_en, detalles')
    .eq('empresa_id', empresaId)
    .order('actualizado_en', { ascending: false });

  if (targetSedeId) qMesas = qMesas.eq('sede_id', targetSedeId);
  const { data: cuentasAbiertas } = await qMesas;

  let totalEnMesasAbiertasUsd = 0;
  const mesasActivas = (cuentasAbiertas || []).map(c => {
    const monto = Number(c.total || 0);
    totalEnMesasAbiertasUsd += monto;
    return {
      sede: sedeNombres[c.sede_id] || 'General',
      cuenta_o_mesa: c.nombre_cuenta || c.numero_documento || 'Mesa Abierta',
      total_acumulado_usd: Number(monto.toFixed(2)),
      abierta_desde: c.fecha_apertura,
      ultima_actividad: c.actualizado_en
    };
  });

  // 2. Consultar Cierres de Caja en el periodo
  const fechaInicioDate = inicio.substring(0, 10);
  const fechaFinDate = fin.substring(0, 10);

  let qCierres = supabase
    .from('cierres_caja')
    .select('id, sede_id, fecha_cierre, tasa_cambio, sistema_ventas_brutas, sistema_gastos_operativos, sistema_total_esperado, real_efectivo_bs, real_efectivo_usd, real_bancos_bs, real_bancos_usd, diferencia_total, fecha_registro')
    .eq('empresa_id', empresaId)
    .gte('fecha_cierre', fechaInicioDate)
    .lte('fecha_cierre', fechaFinDate)
    .order('fecha_cierre', { ascending: false });

  if (targetSedeId) qCierres = qCierres.eq('sede_id', targetSedeId);
  const { data: cierres } = await qCierres;

  let cierresConDescuadre = 0;
  let diferenciaAcumuladaUsd = 0;

  const historialCierres = (cierres || []).map(c => {
    const dif = Number(c.diferencia_total || 0);
    if (Math.abs(dif) > 0.5) cierresConDescuadre++;
    diferenciaAcumuladaUsd += dif;

    return {
      fecha_cierre: c.fecha_cierre,
      sede: sedeNombres[c.sede_id] || 'General',
      sistema_ventas_brutas_usd: Number(Number(c.sistema_ventas_brutas || 0).toFixed(2)),
      sistema_gastos_usd: Number(Number(c.sistema_gastos_operativos || 0).toFixed(2)),
      sistema_esperado_usd: Number(Number(c.sistema_total_esperado || 0).toFixed(2)),
      real_efectivo_usd: Number(Number(c.real_efectivo_usd || 0).toFixed(2)),
      real_bancos_usd: Number(Number(c.real_bancos_usd || 0).toFixed(2)),
      diferencia_descuadre_usd: Number(dif.toFixed(2)),
      estado_arqueo: Math.abs(dif) <= 0.5 ? 'CUADRADO' : (dif < 0 ? 'FALTANTE' : 'SOBRANTE')
    };
  });

  return {
    periodo_cierres: descripcion,
    pos_en_vivo: {
      mesas_o_cuentas_abiertas_ahora: mesasActivas.length,
      monto_total_en_mesas_abiertas_usd: Number(totalEnMesasAbiertasUsd.toFixed(2)),
      detalle_cuentas_abiertas: mesasActivas
    },
    cierres_de_caja: {
      total_cierres_registrados: historialCierres.length,
      cierres_con_descuadre: cierresConDescuadre,
      diferencia_neta_acumulada_usd: Number(diferenciaAcumuladaUsd.toFixed(2)),
      historial_cierres: historialCierres
    }
  };
}

/**
 * 21. Consulta Clientes VIP, Fidelidad, Frecuencia de Compra e Historial por Cliente
 */
async function toolConsultarClientesVipYFidelidad(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: { periodo?: string; cliente_nombre?: string; sede_nombre?: string }
) {
  const { supabase, empresaId, sedes } = ctx;
  const { inicio, fin, descripcion } = calcularRangoFechas(args.periodo || 'ultimos_3_meses');

  let targetSedeId: string | null = null;
  if (args.sede_nombre) {
    const sNorm = normalizarTexto(args.sede_nombre);
    const esGeneral = ['todas', 'ambas', 'todas las sedes', 'consolidado', 'general', 'global', 'ambas sedes'].includes(sNorm);
    if (!esGeneral) {
      const sFound = resolverSede(args.sede_nombre, sedes);
      if (sFound) targetSedeId = sFound.id;
    }
  }

  const { count: totalClientesCatalogo } = await supabase
    .from('clientes')
    .select('id', { count: 'exact', head: true })
    .eq('empresa_id', empresaId);

  let allFacturas: any[] = [];
  let from = 0;
  const batchSize = 1000;
  while (true) {
    let q = supabase
      .from('ventas_facturas')
      .select(`
        id,
        sede_id,
        fecha_venta,
        total,
        tipo_documento,
        numero_orden,
        cliente_id,
        cliente_nombre,
        clientes (
          nombre,
          telefono,
          rif_cedula
        ),
        ventas_pagos (
          tipo_pago
        )
      `)
      .eq('empresa_id', empresaId)
      .eq('estado_activo', true)
      .neq('numero_documento', 'TEST')
      .gte('fecha_venta', inicio)
      .lte('fecha_venta', fin)
      .range(from, from + batchSize - 1);

    if (targetSedeId) q = q.eq('sede_id', targetSedeId);

    const { data: batch, error } = await q;
    if (error || !batch || batch.length === 0) break;
    allFacturas.push(...batch);
    if (batch.length < batchSize) break;
    from += batchSize;
  }

  const filtroCli = args.cliente_nombre ? normalizarTexto(args.cliente_nombre) : '';
  const porCliente: Record<string, {
    nombre: string;
    telefono: string;
    rif_cedula: string;
    total_comprado_usd: number;
    visitas_o_facturas: number;
    ultima_compra: string;
  }> = {};

  for (const fac of allFacturas) {
    const isCortesia = fac.ventas_pagos?.some((p: any) => {
      const tp = (p.tipo_pago || '').toLowerCase();
      return tp.includes('cortes') || tp.includes('regal');
    }) ||
    (fac.tipo_documento && (fac.tipo_documento.toLowerCase().includes('cortes') || fac.tipo_documento.toLowerCase().includes('regal'))) ||
    (fac.numero_orden && (fac.numero_orden.toLowerCase().includes('cortes') || fac.numero_orden.toLowerCase().includes('regal')));

    if (isCortesia) continue;

    const cliObj = (fac as any).clientes;
    const rawNombre = (cliObj?.nombre || fac.cliente_nombre || '').trim();
    const norm = normalizarTexto(rawNombre);

    // Ignorar genéricos si no se está filtrando específicamente
    if (!filtroCli && (!rawNombre || ['cliente generico', 'consumidor final', 'mostrador', 'delivery', 'mesa', 'efectivo'].includes(norm))) {
      continue;
    }

    if (filtroCli && !norm.includes(filtroCli) && !esCoincidenciaAproximada(rawNombre, args.cliente_nombre || '')) {
      continue;
    }

    const isRefund = (fac.tipo_documento && (
      fac.tipo_documento.toLowerCase().includes('refund') ||
      fac.tipo_documento.toLowerCase().includes('devolucion') ||
      fac.tipo_documento.toLowerCase().includes('nota_credito') ||
      fac.tipo_documento.toLowerCase().includes('nc')
    )) || Number(fac.total || 0) < 0;

    const sign = isRefund ? -1 : 1;
    const monto = sign * Math.abs(Number(fac.total || 0));
    const fechaStr = (fac.fecha_venta || '').substring(0, 10);

    const key = rawNombre.toUpperCase() || 'GENERICO';
    if (!porCliente[key]) {
      porCliente[key] = {
        nombre: rawNombre || 'Cliente General',
        telefono: cliObj?.telefono || 'N/A',
        rif_cedula: cliObj?.rif_cedula || 'N/A',
        total_comprado_usd: 0,
        visitas_o_facturas: 0,
        ultima_compra: fechaStr
      };
    }

    porCliente[key].total_comprado_usd += monto;
    porCliente[key].visitas_o_facturas += 1;
    if (fechaStr > porCliente[key].ultima_compra) {
      porCliente[key].ultima_compra = fechaStr;
    }
  }

  const lista = Object.values(porCliente).map(c => ({
    ...c,
    total_comprado_usd: Number(c.total_comprado_usd.toFixed(2)),
    ticket_promedio_usd: c.visitas_o_facturas > 0 ? Number((c.total_comprado_usd / c.visitas_o_facturas).toFixed(2)) : 0
  }));

  const topPorMonto = [...lista].sort((a, b) => b.total_comprado_usd - a.total_comprado_usd).slice(0, 20);
  const topPorFrecuencia = [...lista].sort((a, b) => b.visitas_o_facturas - a.visitas_o_facturas).slice(0, 15);

  return {
    periodo: descripcion,
    total_clientes_registrados_en_sistema: totalClientesCatalogo || 0,
    clientes_identificados_en_periodo: lista.length,
    top_clientes_vip_por_monto_usd: topPorMonto,
    top_clientes_mas_frecuentes: topPorFrecuencia
  };
}

/**
 * 22. Ingeniería de Menú: Rentabilidad por Plato, Food Cost y Margen Real
 */
async function toolConsultarRentabilidadMenu(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: { periodo?: string; categoria?: string }
) {
  const { supabase, empresaId } = ctx;
  const { inicio, fin, descripcion } = calcularRangoFechas(args.periodo || 'este_mes');

  const { data: productos } = await supabase
    .from('productos')
    .select('id, nombre, precio_venta, costo, es_compuesto, categorias(nombre)')
    .eq('empresa_id', empresaId)
    .neq('archivado', true);

  const { data: recetas } = await supabase
    .from('recetas')
    .select('producto_id, cantidad_necesaria, inventario_insumos(costo_promedio)')
    .eq('empresa_id', empresaId);

  const costoRecetaMap: Record<string, number> = {};
  for (const r of recetas || []) {
    if (!r.producto_id) continue;
    const costoIns = Number((r as any).inventario_insumos?.costo_promedio || 0);
    const cant = Number(r.cantidad_necesaria || 0);
    costoRecetaMap[r.producto_id] = (costoRecetaMap[r.producto_id] || 0) + (costoIns * cant);
  }

  // Obtener ventas por producto desde nuestro motor SQL 360°
  const { data: rpcVentas } = await supabase.rpc('get_copilot_ventas_360', {
    p_empresa_id: empresaId,
    p_fecha_inicio: inicio,
    p_fecha_fin: fin,
    p_sede_id: null,
    p_canal: 'todos',
    p_filtro_producto: args.categoria || null,
    p_ordenar_por: 'mas_vendidos',
    p_limite: 250
  });

  const ventasMap: Record<string, { cantidad: number; ingreso_usd: number }> = {};
  for (const tp of rpcVentas?.top_productos || []) {
    ventasMap[tp.producto_id] = {
      cantidad: Number(tp.cantidad_vendida || 0),
      ingreso_usd: Number(tp.total_usd || 0)
    };
  }

  const analisisPlatos: any[] = [];
  const alertasFoodCostAlto: any[] = [];
  const sinCostoConfigurado: string[] = [];

  for (const p of productos || []) {
    const catNombre = (p as any).categorias?.nombre || 'General';
    if (args.categoria && !normalizarTexto(catNombre).includes(normalizarTexto(args.categoria))) {
      continue;
    }

    const precioVenta = Number(p.precio_venta || 0);
    if (precioVenta <= 0) continue;

    const costoUnitario = costoRecetaMap[p.id] > 0 ? costoRecetaMap[p.id] : Number(p.costo || 0);
    const v = ventasMap[p.id] || { cantidad: 0, ingreso_usd: 0 };

    if (costoUnitario <= 0) {
      if (v.cantidad > 0) sinCostoConfigurado.push(p.nombre);
      continue;
    }

    const margenUnitarioUsd = precioVenta - costoUnitario;
    const foodCostPct = (costoUnitario / precioVenta) * 100;
    const margenPct = 100 - foodCostPct;
    const utilidadTotalGeneradaUsd = v.cantidad * margenUnitarioUsd;

    const item = {
      nombre: p.nombre,
      categoria: catNombre,
      precio_venta_usd: Number(precioVenta.toFixed(2)),
      costo_preparacion_usd: Number(costoUnitario.toFixed(2)),
      ganancia_por_unidad_usd: Number(margenUnitarioUsd.toFixed(2)),
      food_cost_pct: `${foodCostPct.toFixed(1)}%`,
      margen_rentabilidad_pct: `${margenPct.toFixed(1)}%`,
      unidades_vendidas: v.cantidad,
      utilidad_neta_generada_usd: Number(utilidadTotalGeneradaUsd.toFixed(2))
    };

    analisisPlatos.push(item);
    if (foodCostPct >= 45) {
      alertasFoodCostAlto.push(item);
    }
  }

  const platosEstrellaPorUtilidad = [...analisisPlatos]
    .sort((a, b) => b.utilidad_neta_generada_usd - a.utilidad_neta_generada_usd)
    .slice(0, 15);

  const mayorMargenUnitario = [...analisisPlatos]
    .sort((a, b) => b.ganancia_por_unidad_usd - a.ganancia_por_unidad_usd)
    .slice(0, 15);

  return {
    periodo: descripcion,
    platos_con_costo_analizados: analisisPlatos.length,
    platos_estrella_mayor_utilidad_total_usd: platosEstrellaPorUtilidad,
    platos_mayor_ganancia_por_unidad: mayorMargenUnitario,
    alertas_food_cost_elevado_mas_45_pct: alertasFoodCostAlto.slice(0, 15),
    productos_vendidos_sin_receta_o_costo: sinCostoConfigurado.slice(0, 20),
    ventas_por_categoria: rpcVentas?.ventas_por_categoria || []
  };
}

/**
 * 23. Comparativa de Crecimiento entre Periodos y Proyección de Cierre de Mes
 */
async function toolConsultarComparativaCrecimiento(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: { tipo_comparativa?: string; sede_nombre?: string }
) {
  const { supabase, empresaId, sedes } = ctx;
  const modo = (args.tipo_comparativa || 'mes_actual_vs_mes_anterior').toLowerCase();

  let targetSedeId: string | null = null;
  if (args.sede_nombre) {
    const sNorm = normalizarTexto(args.sede_nombre);
    const esGeneral = ['todas', 'ambas', 'todas las sedes', 'consolidado', 'general', 'global', 'ambas sedes'].includes(sNorm);
    if (!esGeneral) {
      const sFound = resolverSede(args.sede_nombre, sedes);
      if (sFound) targetSedeId = sFound.id;
    }
  }

  const esSemanal = modo.includes('semana');
  const rangoActual = calcularRangoFechas(esSemanal ? 'esta_semana' : 'este_mes');
  const rangoAnterior = calcularRangoFechas(esSemanal ? 'semana_pasada' : 'mes_anterior');

  const [resActual, resAnterior] = await Promise.all([
    supabase.rpc('get_copilot_ventas_360', {
      p_empresa_id: empresaId,
      p_fecha_inicio: rangoActual.inicio,
      p_fecha_fin: rangoActual.fin,
      p_sede_id: targetSedeId,
      p_canal: 'todos',
      p_filtro_producto: null,
      p_ordenar_por: 'mas_vendidos',
      p_limite: 5
    }),
    supabase.rpc('get_copilot_ventas_360', {
      p_empresa_id: empresaId,
      p_fecha_inicio: rangoAnterior.inicio,
      p_fecha_fin: rangoAnterior.fin,
      p_sede_id: targetSedeId,
      p_canal: 'todos',
      p_filtro_producto: null,
      p_ordenar_por: 'mas_vendidos',
      p_limite: 5
    })
  ]);

  const dAct = resActual.data || {};
  const dAnt = resAnterior.data || {};

  const ventasAct = Number(dAct.total_ventas_usd || 0);
  const ventasAnt = Number(dAnt.total_ventas_usd || 0);
  const difUsd = ventasAct - ventasAnt;
  const variacionPct = ventasAnt > 0 ? ((difUsd / ventasAnt) * 100) : 0;

  // Cálculo de proyección de cierre de mes (Run-rate diario)
  const hoyCaracas = toLocalDateKey(new Date(), DEFAULT_TIMEZONE);
  const [y, m, d] = hoyCaracas.split('-').map(Number);
  const diasEnMes = new Date(y, m, 0).getDate();
  const diasTranscurridos = Math.max(d, 1);
  const promedioDiarioActualUsd = ventasAct / diasTranscurridos;
  const proyeccionCierreMesUsd = promedioDiarioActualUsd * diasEnMes;

  const sedesComparativa = sedes.map((s, idx) => {
    const sAct = (dAct.desglose_sedes || []).find((x: any) => x.sede_id === s.id);
    const sAnt = (dAnt.desglose_sedes || []).find((x: any) => x.sede_id === s.id);
    const vAct = Number(sAct?.total_usd || 0);
    const vAnt = Number(sAnt?.total_usd || 0);
    const sDif = vAct - vAnt;
    const sPct = vAnt > 0 ? ((sDif / vAnt) * 100) : 0;
    return {
      sede: `Sede ${idx + 1} (${s.nombre_sede})`,
      periodo_actual_usd: Number(vAct.toFixed(2)),
      periodo_anterior_usd: Number(vAnt.toFixed(2)),
      diferencia_usd: Number(sDif.toFixed(2)),
      variacion_pct: `${sPct >= 0 ? '+' : ''}${sPct.toFixed(1)}%`
    };
  });

  return {
    comparativa: esSemanal ? 'ESTA SEMANA vs SEMANA PASADA' : 'ESTE MES vs MES ANTERIOR',
    periodo_actual: {
      descripcion: rangoActual.descripcion,
      total_ventas_usd: Number(ventasAct.toFixed(2)),
      total_facturas: Number(dAct.total_facturas || 0)
    },
    periodo_anterior: {
      descripcion: rangoAnterior.descripcion,
      total_ventas_usd: Number(ventasAnt.toFixed(2)),
      total_facturas: Number(dAnt.total_facturas || 0)
    },
    variacion_global: {
      diferencia_usd: Number(difUsd.toFixed(2)),
      porcentaje: `${variacionPct >= 0 ? '+' : ''}${variacionPct.toFixed(1)}%`
    },
    ...(!esSemanal ? {
      proyeccion_cierre_de_mes: {
        dias_transcurridos: diasTranscurridos,
        dias_totales_del_mes: diasEnMes,
        ritmo_venta_diaria_promedio_usd: Number(promedioDiarioActualUsd.toFixed(2)),
        venta_proyectada_fin_de_mes_usd: Number(proyeccionCierreMesUsd.toFixed(2)),
        superara_mes_anterior: proyeccionCierreMesUsd >= ventasAnt
      }
    } : {}),
    comparativa_por_sede: sedesComparativa
  };
}

/**
 * 24. Auditoría de Seguridad: Facturas Anuladas, Devoluciones/Notas de Crédito y Descuentos en Caja
 */
async function toolConsultarAuditoriaSeguridad(
  ctx: Awaited<ReturnType<typeof getCopilotAuthContext>>,
  args: { periodo?: string; sede_nombre?: string }
) {
  const { supabase, empresaId, sedes } = ctx;
  const { inicio, fin, descripcion } = calcularRangoFechas(args.periodo || 'este_mes');

  let targetSedeId: string | null = null;
  if (args.sede_nombre) {
    const sNorm = normalizarTexto(args.sede_nombre);
    const esGeneral = ['todas', 'ambas', 'todas las sedes', 'consolidado', 'general', 'global', 'ambas sedes'].includes(sNorm);
    if (!esGeneral) {
      const sFound = resolverSede(args.sede_nombre, sedes);
      if (sFound) targetSedeId = sFound.id;
    }
  }

  const sedeNombres: Record<string, string> = {};
  sedes.forEach((s, idx) => { sedeNombres[s.id] = `Sede ${idx + 1} (${s.nombre_sede})`; });

  // 1. Facturas anuladas (estado_activo = false)
  let qAnuladas = supabase
    .from('ventas_facturas')
    .select('id, sede_id, numero_documento, numero_orden, fecha_venta, total, cajero_nombre, cliente_nombre, notas')
    .eq('empresa_id', empresaId)
    .eq('estado_activo', false)
    .neq('numero_documento', 'TEST')
    .gte('fecha_venta', inicio)
    .lte('fecha_venta', fin)
    .order('fecha_venta', { ascending: false });

  if (targetSedeId) qAnuladas = qAnuladas.eq('sede_id', targetSedeId);
  const { data: anuladas } = await qAnuladas;

  let montoAnuladasUsd = 0;
  const detalleAnuladas = (anuladas || []).map(f => {
    const m = Math.abs(Number(f.total || 0));
    montoAnuladasUsd += m;
    return {
      fecha: (f.fecha_venta || '').substring(0, 10),
      sede: sedeNombres[f.sede_id] || 'General',
      documento: f.numero_documento || f.numero_orden,
      cajero: f.cajero_nombre || 'N/A',
      cliente: f.cliente_nombre || 'N/A',
      monto_usd: Number(m.toFixed(2)),
      notas: f.notas || null
    };
  });

  // 2. Devoluciones / Notas de Crédito y Descuentos otorgados
  let qDescuentos = supabase
    .from('ventas_facturas')
    .select('id, sede_id, numero_documento, numero_orden, tipo_documento, fecha_venta, total, descuento, cajero_nombre, cliente_nombre, notas')
    .eq('empresa_id', empresaId)
    .eq('estado_activo', true)
    .neq('numero_documento', 'TEST')
    .gte('fecha_venta', inicio)
    .lte('fecha_venta', fin)
    .or('descuento.gt.0,total.lt.0,tipo_documento.ilike.%refund%,tipo_documento.ilike.%devolucion%,tipo_documento.ilike.%nc%')
    .order('fecha_venta', { ascending: false });

  if (targetSedeId) qDescuentos = qDescuentos.eq('sede_id', targetSedeId);
  const { data: descRows } = await qDescuentos;

  let totalDescuentosUsd = 0;
  let totalDevolucionesUsd = 0;
  const detalleDescuentos: any[] = [];
  const detalleDevoluciones: any[] = [];

  for (const f of descRows || []) {
    const desc = Number(f.descuento || 0);
    const isRef = Number(f.total || 0) < 0 ||
      (f.tipo_documento && (
        f.tipo_documento.toLowerCase().includes('refund') ||
        f.tipo_documento.toLowerCase().includes('devolucion') ||
        f.tipo_documento.toLowerCase().includes('nc')
      ));

    if (desc > 0) {
      totalDescuentosUsd += desc;
      if (detalleDescuentos.length < 20) {
        detalleDescuentos.push({
          fecha: (f.fecha_venta || '').substring(0, 10),
          sede: sedeNombres[f.sede_id] || 'General',
          documento: f.numero_documento || f.numero_orden,
          cajero: f.cajero_nombre || 'N/A',
          descuento_otorgado_usd: Number(desc.toFixed(2)),
          total_cobrado_usd: Number(Number(f.total || 0).toFixed(2))
        });
      }
    }

    if (isRef) {
      const mRef = Math.abs(Number(f.total || 0));
      totalDevolucionesUsd += mRef;
      if (detalleDevoluciones.length < 20) {
        detalleDevoluciones.push({
          fecha: (f.fecha_venta || '').substring(0, 10),
          sede: sedeNombres[f.sede_id] || 'General',
          documento: f.numero_documento || f.numero_orden,
          tipo: f.tipo_documento,
          cajero: f.cajero_nombre || 'N/A',
          monto_devuelto_usd: Number(mRef.toFixed(2)),
          notas: f.notas || null
        });
      }
    }
  }

  return {
    periodo: descripcion,
    facturas_anuladas: {
      cantidad: detalleAnuladas.length,
      monto_total_anulado_usd: Number(montoAnuladasUsd.toFixed(2)),
      detalle: detalleAnuladas.slice(0, 20)
    },
    devoluciones_y_notas_credito: {
      cantidad: detalleDevoluciones.length,
      monto_total_devuelto_usd: Number(totalDevolucionesUsd.toFixed(2)),
      detalle: detalleDevoluciones
    },
    descuentos_en_caja: {
      cantidad_facturas_con_descuento: detalleDescuentos.length,
      monto_total_descontado_usd: Number(totalDescuentosUsd.toFixed(2)),
      detalle: detalleDescuentos
    }
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
      description: 'Consulta el balance financiero (Estado de Resultados / P&L: Ventas netas vs Compras de insumos y Gastos operativos, utilidad/balance neto y margen operativo) de un día específico o de un periodo completo (esta_semana, este_mes, mes_anterior, ultimos_3_meses), desglosado por sede y en USD/VES.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          fecha: {
            type: SchemaType.STRING,
            description: 'Fecha en formato YYYY-MM-DD (ej: "2026-10-14") o nombre del periodo ("hoy", "ayer", "esta_semana", "este_mes", "mes_anterior", "ultimos_3_meses").',
          },
          periodo: {
            type: SchemaType.STRING,
            description: 'Opcional. Periodo a consultar si no es un solo día: "hoy", "ayer", "esta_semana", "semana_pasada", "este_mes", "mes_anterior", "ultimos_30_dias", "ultimos_3_meses", "año_actual".',
          },
          turno: {
            type: SchemaType.STRING,
            description: 'Filtro de turno: "todo_el_dia", "cenas_nocturno" o "almuerzo".',
          },
          sede_nombre: {
            type: SchemaType.STRING,
            description: 'Opcional. Nombre o número de la sede a consultar (ej: "sede 1", "sede 2"). Dejar vacío para consultar todas las sedes consolidadas y desglosadas.',
          }
        }
      }
    },
    {
      name: 'consultar_ventas_por_metodo_pago',
      description: 'Consulta las ventas desglosadas por método de pago (Pago Móvil, Punto de Venta, Efectivo USD, Efectivo Bs, Zelle, Biopago, Transferencia, o "todos" para ver el resumen completo de todos los métodos de pago) por cada sede en un día o periodo.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          metodo_pago: {
            type: SchemaType.STRING,
            description: 'Nombre del método de pago a consultar (ej: "pago_movil", "efectivo_usd", "punto_de_venta", "zelle") o "todos" para obtener el desglose completo de todos los métodos de pago.',
          },
          periodo_o_fecha: {
            type: SchemaType.STRING,
            description: 'Fecha (YYYY-MM-DD) o periodo: "hoy", "ayer", "esta_semana", "semana_pasada", "este_mes", "mes_anterior", "ultimos_30_dias", "ultimos_3_meses", "ultimos_6_meses", "año_actual", o rango "YYYY-MM-DD..YYYY-MM-DD".',
          },
          sede_nombre: {
            type: SchemaType.STRING,
            description: 'Opcional. Nombre o número de sede específica a consultar (ej: "sede 1", "sede 2"). Dejar vacío para ver el desglose comparativo de todas las sedes.',
          }
        }
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
      description: 'Consulta el reporte y métricas de ventas agregadas en <100ms sobre el 100% de las facturas (total recaudado en USD, desglose por sede, desglose por día de la semana Lunes-Domingo, horas pico de venta, ventas por categoría, ranking de productos más/menos vendidos, y ventas por canal Delivery o Salón) en un periodo.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          periodo: {
            type: SchemaType.STRING,
            description: 'Periodo a consultar: hoy, ayer, esta_semana, semana_pasada, este_mes, mes_anterior, ultimos_30_dias, ultimos_3_meses (o ultimos_90_dias), ultimos_6_meses, año_actual, o rango "YYYY-MM-DD..YYYY-MM-DD".',
          },
          filtro_producto: {
            type: SchemaType.STRING,
            description: 'Texto o fragmento del nombre del producto o categoría a filtrar.',
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
            description: 'Opcional. Nombre o número de la sede a filtrar (ej: "sede 1", "sede 2"). Dejar vacío para ver el consolidado general y el desglose de todas las sedes.',
          },
          solo_delivery: {
            type: SchemaType.BOOLEAN,
            description: 'Opcional. Si es true, filtra EXCLUSIVAMENTE los pedidos y ventas realizados por Delivery (pedidos con cobro de flete/delivery o despacho a domicilio).',
          },
          canal: {
            type: SchemaType.STRING,
            description: 'Opcional. Canal de venta a consultar: "todos", "delivery" (para ventas de pedidos a domicilio/delivery) o "salon" (para ventas de salón/mesa/mostrador).',
          }
        },
        required: ['periodo']
      }
    },
    {
      name: 'consultar_consumo_insumo',
      description: 'Consulta el estado del inventario y almacén: puede consultar un insumo específico (stock actual, valor en USD, consumo real vs teórico por recetas) O pasar nombre_insumo="todos" o "bajo_stock" para obtener la valorización total del inventario, insumos agotados y alertas de stock mínimo.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          nombre_insumo: {
            type: SchemaType.STRING,
            description: 'Nombre del insumo (ej: "mozzarella", "harina") o "todos" / "bajo_stock" para ver el resumen general del inventario, valor total en USD y alertas de stock crítico.',
          },
          periodo: {
            type: SchemaType.STRING,
            description: 'Periodo de tiempo para evaluar el consumo: hoy, esta_semana, este_mes, ultimos_30_dias, ultimos_3_meses.',
          },
          sede_nombre: {
            type: SchemaType.STRING,
            description: 'Opcional. Sede a consultar.',
          }
        }
      }
    },
    {
      name: 'consultar_cuentas_por_cobrar',
      description: 'Consulta las cuentas por cobrar (clientes que deben dinero, facturas a crédito con saldo pendiente, monto total adeudado por sede y detalle de deudores).',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          cliente_nombre: {
            type: SchemaType.STRING,
            description: 'Opcional. Nombre del cliente específico para consultar cuánto debe.',
          },
          sede_nombre: {
            type: SchemaType.STRING,
            description: 'Opcional. Sede específica ("sede 1", "sede 2") o vacío para ver todas las sedes.',
          }
        }
      }
    },
    {
      name: 'consultar_mermas_y_cortesias',
      description: 'Consulta las cortesías/regalías entregadas (que se excluyen de la venta neta), las mermas o desperdicios de inventario y las ventas al costo al personal en un periodo.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          periodo: {
            type: SchemaType.STRING,
            description: 'Periodo a consultar: hoy, ayer, esta_semana, semana_pasada, este_mes, mes_anterior, ultimos_30_dias, ultimos_3_meses, año_actual.',
          },
          sede_nombre: {
            type: SchemaType.STRING,
            description: 'Opcional. Sede específica o vacío para todas las sedes.',
          }
        }
      }
    },
    {
      name: 'consultar_desempeno_equipo',
      description: 'Consulta el rendimiento del personal: ranking de ventas por cajero, ventas y propinas recaudadas por mesero, y pedidos de delivery entregados por repartidor en un periodo.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          periodo: {
            type: SchemaType.STRING,
            description: 'Periodo a consultar: hoy, ayer, esta_semana, semana_pasada, este_mes, mes_anterior, ultimos_30_dias, ultimos_3_meses.',
          },
          sede_nombre: {
            type: SchemaType.STRING,
            description: 'Opcional. Sede específica o vacío para todas las sedes.',
          }
        }
      }
    },
    {
      name: 'consultar_compras_y_proveedores',
      description: 'Consulta el desglose de compras de insumos/materia prima, gastos operativos y el ranking de proveedores a los que más se les ha comprado en un periodo.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          periodo: {
            type: SchemaType.STRING,
            description: 'Periodo a consultar: hoy, ayer, esta_semana, semana_pasada, este_mes, mes_anterior, ultimos_30_dias, ultimos_3_meses, año_actual.',
          },
          filtro_proveedor_o_concepto: {
            type: SchemaType.STRING,
            description: 'Opcional. Nombre del proveedor o concepto de gasto a buscar.',
          },
          sede_nombre: {
            type: SchemaType.STRING,
            description: 'Opcional. Sede específica o vacío para todas las sedes.',
          }
        }
      }
    },
    {
      name: 'consultar_cierres_y_mesas_abiertas',
      description: 'Consulta cuántas mesas o cuentas están abiertas en vivo ahora mismo en el POS y revisa el historial de cierres de caja (arqueos Z), verificando si hubo descuadres, faltantes o sobrantes de efectivo.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          periodo: {
            type: SchemaType.STRING,
            description: 'Periodo para revisar cierres de caja: hoy, ayer, esta_semana, este_mes, ultimos_30_dias.',
          },
          sede_nombre: {
            type: SchemaType.STRING,
            description: 'Opcional. Sede específica o vacío para todas las sedes.',
          }
        }
      }
    },
    {
      name: 'consultar_clientes_vip_y_fidelidad',
      description: 'Consulta el ranking de los mejores clientes (Clientes VIP por monto total comprado y por frecuencia de visitas) o el historial de compras de un cliente específico.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          periodo: {
            type: SchemaType.STRING,
            description: 'Periodo a consultar: este_mes, mes_anterior, ultimos_3_meses, ultimos_6_meses, año_actual.',
          },
          cliente_nombre: {
            type: SchemaType.STRING,
            description: 'Opcional. Nombre de un cliente específico para consultar cuánto ha comprado y cuántas veces ha venido.',
          },
          sede_nombre: {
            type: SchemaType.STRING,
            description: 'Opcional. Sede específica o vacío para todas las sedes.',
          }
        }
      }
    },
    {
      name: 'consultar_rentabilidad_menu',
      description: 'Ingeniería de Menú y Food Cost: analiza qué productos dejan mayor ganancia neta en dólares, cuáles tienen el mayor margen por unidad, cuáles tienen alerta de Food Cost elevado (>45%) y cuánto vende cada categoría.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          periodo: {
            type: SchemaType.STRING,
            description: 'Periodo a evaluar: este_mes, mes_anterior, ultimos_30_dias, ultimos_3_meses.',
          },
          categoria: {
            type: SchemaType.STRING,
            description: 'Opcional. Filtrar por categoría (ej: "Pizzeria", "Barra").',
          }
        }
      }
    },
    {
      name: 'consultar_comparativa_y_proyeccion',
      description: 'Compara el crecimiento de ventas entre dos periodos (Este Mes vs Mes Anterior, o Esta Semana vs Semana Pasada) desglosado por sede, y calcula la Proyección de Cierre de Mes según el ritmo diario de ventas.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          tipo_comparativa: {
            type: SchemaType.STRING,
            description: '"mes_actual_vs_mes_anterior" (por defecto) o "esta_semana_vs_semana_pasada".',
          },
          sede_nombre: {
            type: SchemaType.STRING,
            description: 'Opcional. Sede específica o vacío para comparar todas las sedes.',
          }
        }
      }
    },
    {
      name: 'consultar_auditoria_anulaciones_descuentos',
      description: 'Auditoría de seguridad en facturación: consulta facturas anuladas (estado_activo=false), devoluciones/notas de crédito emitidas y facturas con descuentos aplicados en caja.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          periodo: {
            type: SchemaType.STRING,
            description: 'Periodo a auditar: hoy, ayer, esta_semana, este_mes, mes_anterior, ultimos_30_dias, ultimos_3_meses.',
          },
          sede_nombre: {
            type: SchemaType.STRING,
            description: 'Opcional. Sede específica o vacío para todas las sedes.',
          }
        }
      }
    },
    {
      name: 'auditar_compras_sospechosas',
      description: 'Audita y detecta posibles compras duplicadas registradas en un mismo día con montos idénticos o casi iguales (excluyendo compras anuladas).',
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
    },
    {
      name: 'proponer_actualizar_precio',
      description: 'Propone actualizar el precio de venta de una promoción, combo o producto ya existente en el catálogo (ej: cambiar el precio de "Promo 2 Pastichos" o "Combo Fiesta" de $8 a $14 USD). Busca el registro existente por nombre, verifica el precio actual y genera la tarjeta interactiva con botón para que el usuario confirme el cambio de precio.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          nombre_combo_o_producto: {
            type: SchemaType.STRING,
            description: 'Nombre o parte del nombre del combo, promoción o producto existente cuyo precio se desea modificar.'
          },
          nuevo_precio: {
            type: SchemaType.NUMBER,
            description: 'Nuevo precio de venta en USD (ej: 14).'
          },
          nuevo_nombre: {
            type: SchemaType.STRING,
            description: 'Opcional. Si el nombre anterior contenía el precio (ej: "PROMO 2 PASTICHOS $8"), nuevo nombre sugerido (ej: "PROMO 2 PASTICHOS $14" o "PROMO 2 PASTICHOS").'
          }
        },
        required: ['nombre_combo_o_producto', 'nuevo_precio']
      }
    },
    {
      name: 'proponer_ajuste_masivo_precios',
      description: 'Propone una actualización, ajuste o redondeo MASIVO de precios en el catálogo de productos y/o promociones/combos de la empresa (ej: redondear todo el catálogo a múltiplos de $0.50, redondear a números enteros sin decimales, aumentar o descontar un porcentaje general, fijar terminaciones específicas, o filtrar solo por una categoría como "Pizzas" o solo combos). Genera la simulación completa y la tarjeta interactiva con botón de confirmación en bloque para el usuario.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          criterio_ajuste: {
            type: SchemaType.STRING,
            description: 'Tipo de ajuste a realizar: "redondeo_cincuenta_centavos" (a múltiplos de $0.50 como 1.00, 1.50, 2.00, 2.50), "redondeo_entero" (a enteros 1.00, 2.00, 3.00), "porcentaje" (sumar o restar un % a los precios), "fijar_terminacion" (forzar una terminación decimal específica como .00 o .50).'
          },
          direccion: {
            type: SchemaType.STRING,
            description: 'Dirección del redondeo: "cercano" (al más próximo, default), "arriba" (hacia arriba / alza), "abajo" (hacia abajo / baja).'
          },
          porcentaje: {
            type: SchemaType.NUMBER,
            description: 'Opcional. Porcentaje numérico si criterio_ajuste es "porcentaje" (ej: 10 para +10%, -5 para -5%).'
          },
          redondear_tras_porcentaje: {
            type: SchemaType.BOOLEAN,
            description: 'Opcional. Si es true y se aplica porcentaje, redondea los precios resultantes a múltiplos de $0.50.'
          },
          terminacion_deseada: {
            type: SchemaType.NUMBER,
            description: 'Opcional. Terminación decimal deseada (ej: 0.50, 0.00, 0.99) si criterio_ajuste es "fijar_terminacion".'
          },
          terminacion_filtro: {
            type: SchemaType.NUMBER,
            description: 'Opcional. Si el usuario pide modificar únicamente productos con cierta terminación de centavos (ej: 0.85 o 85).'
          },
          filtro_categoria: {
            type: SchemaType.STRING,
            description: 'Opcional. Nombre de categoría para limitar el ajuste (ej: "Pizzas", "Bebidas"). Si se omite o es "todo", aplica a todo el catálogo.'
          },
          filtro_tipo: {
            type: SchemaType.STRING,
            description: 'Opcional. "todos" (por defecto), "solo_productos", o "solo_combos".'
          }
        },
        required: ['criterio_ajuste']
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
    tipo: 'desactivar_combos' | 'fusionar_insumos' | 'ejecutar_despacho' | 'ejecutar_venta_costo' | 'guardar_receta' | 'agrupar_similares' | 'crear_combo' | 'actualizar_precio_combo' | 'ajuste_masivo_precios';
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
Eres "Niteo Copilot", el Director Financiero (CFO) y Asistente Operativo 360° de la plataforma Niteo.
Usuario: ${ctx.userName} (Rol: ${ctx.rol}).
Empresa: "${ctx.empresa.nombre_comercial}" (Moneda: ${ctx.empresa.moneda} ${ctx.empresa.simbolo_moneda}).
Catálogo Oficial de Sedes: ${sedesListStr}.
Privilegio Venta al Costo: ${ctx.permisoVentaCosto ? 'HABILITADO' : 'DENEGADO'}.
Zona horaria: ${DEFAULT_TIMEZONE} (Venezuela / Caracas).

PERSONALIDAD Y TONO (AMIGABLE, COMPRENSIVO Y ULTRA-EFICIENTE EN TOKENS):
- Sé cálido, empático, profesional y cordial (ej. "¡Hola! Con gusto te ayudo a revisar eso 😊", "¡Por supuesto! Aquí tienes el análisis:").
- NUNCA respondas seco, robótico ni cortante. Haz sentir al usuario acompañado y en confianza.
- AHORRO MÁXIMO DE TOKENS: Sé muy concreto y directo en la entrega de datos. Evita introducciones largas o despedidas innecesarias. Presenta los números clave en negritas, listas o tablas compactas de Markdown.

MATEMÁTICA DORADA Y COBERTURA 360° DE LA EMPRESA:
- Todas tus herramientas operan bajo "Matemática Dorada": procesan el 100% de los registros sin límite de 1,000 filas, excluyen facturas anuladas (estado_activo=false) y compras ANULADAS, restan devoluciones/notas de crédito (-ABS) y segregan las cortesías/regalías de la venta neta.
- Tienes cobertura 360° para responder CUALQUIER duda de la empresa combinando tus herramientas si hace falta:
  1. Ventas, Canales (Delivery vs Salón), Días de la Semana (Lunes a Domingo), Horas Pico, Categorías y Ranking de Productos -> "consultar_ventas".
  2. Rentabilidad, Utilidad Neta (P&L), Ventas vs Compras y Gastos Operativos (de un día o de todo el mes/semana) -> "consultar_balance_dia".
  3. Métodos de Pago (Zelle, Pago Móvil, Punto, Efectivo, o "todos" para ver el resumen completo) -> "consultar_ventas_por_metodo_pago".
  4. Cuentas por Cobrar, Deudores y Créditos pendientes -> "consultar_cuentas_por_cobrar".
  5. Cortesías, Regalías, Mermas, Desperdicios y Ventas al Costo al personal -> "consultar_mermas_y_cortesias".
  6. Desempeño de Personal (Cajeros, Meseros, Propinas recaudadas y Repartidores de Delivery) -> "consultar_desempeno_equipo".
  7. Compras de Insumos, Gastos Operativos y Ranking de Proveedores -> "consultar_compras_y_proveedores".
  8. Mesas/Cuentas Abiertas en vivo en el POS y Cierres de Caja / Arqueos Z / Descuadres -> "consultar_cierres_y_mesas_abiertas".
  9. Inventario, Valorización total en USD, Alertas de Bajo Stock y Consumo Real vs Teórico por recetas -> "consultar_consumo_insumo" (usa nombre_insumo="todos" o "bajo_stock" para resumen general del almacén).
  10. Clientes VIP, Fidelidad, Frecuencia de Visitas e Historial de un Cliente -> "consultar_clientes_vip_y_fidelidad".
  11. Ingeniería de Menú, Platos más Rentables, Alertas de Food Cost (>45%) y Margen por Plato -> "consultar_rentabilidad_menu".
  12. Comparativa de Crecimiento (Este Mes vs Mes Anterior o Semana Actual vs Pasada) y Proyección de Cierre de Mes -> "consultar_comparativa_y_proyeccion".
  13. Auditoría de Seguridad (Facturas Anuladas, Devoluciones y Descuentos aplicados en Caja) -> "consultar_auditoria_anulaciones_descuentos".

RESOLUCIÓN INTELIGENTE DE SEDES:
- Si el usuario dice "sede 1", "sucursal 1", "la 1", o similar, corresponde EXACTAMENTE a la primera sede: "${ctx.sedes[0]?.nombre_sede || 'Sede Principal'}".
- Si dice "sede 2", "sucursal 2", "la 2", corresponde a la segunda sede: "${ctx.sedes[1]?.nombre_sede || 'Sede Secundaria'}".
- Si pide comparar, dividir entre Sede 1 y Sede 2, o no especifica sede, DEJA sede_nombre VACÍO para obtener el consolidado general y el desglose comparativo de ambas sedes en una sola llamada.

TOLERANCIA A ERRORES ORTOGRÁFICOS Y TIPOGRÁFICOS (TYPOS):
- El usuario puede cometer faltas de ortografía o escribir rápido desde el celular (ej. "pisa" por "pizza", "mozarela" por "mozzarella", "sed 1" por "sede 1", "pago movl" por "pago móvil"). Entiende SIEMPRE su intención real y normaliza los términos al llamar a las herramientas.

REGLAS DE OPERACIÓN:
1. NUNCA INVENTES CIFRAS NI DATOS. Consulta siempre las herramientas para obtener datos verídicos de la base de datos.
2. CONSULTA DE VENTAS, DÍAS DE LA SEMANA, CANALES Y FINANZAS:
   - Si te preguntan por ventas de un periodo, qué día de la semana se vende más, a qué hora hay más movimiento, cuánto vendió cada categoría o cuáles son los productos más/menos vendidos, llama a "consultar_ventas".
   - CONSULTAS POR CANAL / DELIVERY: Si el usuario pregunta por DELIVERY o pedidos a domicilio, pasa SIEMPRE solo_delivery: true o canal: 'delivery' a "consultar_ventas".
   - SIEMPRE entrega directamente en tu respuesta: el total global en USD, el total de facturas emitidas, el ticket promedio y el desglose de cada sede (Sede 1 y Sede 2 con montos y porcentajes).
3. Si el usuario te indica una regla de conversión (ej. "una barra pesa 3kg"), calcula la división matemáticamente sobre los kg devueltos por la herramienta y explícalo claramente.
4. ASISTENCIA Y ESCANDALLO DE RECETAS:
   - Para consultar ingredientes, costos y márgenes de un producto, llama a "consultar_receta".
   - Para crear o actualizar una receta, llama a "proponer_receta".
5. CREACIÓN Y GESTIÓN DE COMBOS Y PROMOCIONES:
   - Si el usuario te pide crear un combo o promoción, llama a "proponer_combo".
6. ACTUALIZACIÓN Y REDONDEO DE PRECIOS (INDIVIDUAL Y MASIVO):
   - Para cambiar el precio de un producto o combo puntual, llama a "proponer_actualizar_precio".
   - Para redondear o ajustar precios de todo el catálogo o de una categoría, llama a "proponer_ajuste_masivo_precios".
7. Para acciones que modifican datos ("proponer_*"):
   - NUNCA afirmes haber ejecutado la mutación en la base de datos de inmediato. Describe la propuesta con los números exactos e invita al usuario a confirmar con el botón en pantalla.
    `.trim();

    const modelNamesToTry = [
      'gemini-flash-latest',
      'gemini-flash-lite-latest',
      'gemini-2.5-flash',
      'gemini-2.0-flash'
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
                case 'consultar_cuentas_por_cobrar':
                  toolResult = await toolConsultarCuentasPorCobrar(ctx, call.args || {});
                  break;
                case 'consultar_mermas_y_cortesias':
                  toolResult = await toolConsultarMermasYCortesias(ctx, call.args || {});
                  break;
                case 'consultar_desempeno_equipo':
                  toolResult = await toolConsultarDesempenoEquipo(ctx, call.args || {});
                  break;
                case 'consultar_compras_y_proveedores':
                  toolResult = await toolConsultarComprasYProveedores(ctx, call.args || {});
                  break;
                case 'consultar_cierres_y_mesas_abiertas':
                  toolResult = await toolConsultarCierresYMesasAbiertas(ctx, call.args || {});
                  break;
                case 'consultar_clientes_vip_y_fidelidad':
                  toolResult = await toolConsultarClientesVipYFidelidad(ctx, call.args || {});
                  break;
                case 'consultar_rentabilidad_menu':
                  toolResult = await toolConsultarRentabilidadMenu(ctx, call.args || {});
                  break;
                case 'consultar_comparativa_y_proyeccion':
                  toolResult = await toolConsultarComparativaCrecimiento(ctx, call.args || {});
                  break;
                case 'consultar_auditoria_anulaciones_descuentos':
                  toolResult = await toolConsultarAuditoriaSeguridad(ctx, call.args || {});
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
                case 'proponer_actualizar_precio': {
                  toolResult = await toolProponerActualizarPrecio(ctx, call.args || {});
                  if (toolResult?.exito) {
                    accionPropuesta = {
                      tipo: 'actualizar_precio_combo',
                      titulo: `Actualizar Precio: ${toolResult.nombre_actual} ($${toolResult.precio_anterior} ➔ $${toolResult.nuevo_precio} USD)`,
                      detalles: {
                        comboId: toolResult.combo_id,
                        productoId: toolResult.producto_id,
                        nombreActual: toolResult.nombre_actual,
                        nuevoNombre: toolResult.nuevo_nombre,
                        precioAnterior: toolResult.precio_anterior,
                        nuevoPrecio: toolResult.nuevo_precio,
                        diferenciaUsd: toolResult.diferencia_usd
                      }
                    };
                  }
                  break;
                }
                case 'proponer_ajuste_masivo_precios': {
                  toolResult = await toolProponerAjusteMasivoPrecios(ctx, call.args || {});
                  if (toolResult?.exito && toolResult.total_afectados > 0) {
                    accionPropuesta = {
                      tipo: 'ajuste_masivo_precios',
                      titulo: `Ajuste Masivo de Precios: ${toolResult.total_afectados} ítems (${toolResult.descripcion_criterio})`,
                      items: toolResult.items,
                      detalles: {
                        criterio: toolResult.criterio,
                        descripcionCriterio: toolResult.descripcion_criterio,
                        totalAfectados: toolResult.total_afectados,
                        totalProductos: toolResult.resumen.total_productos,
                        totalCombos: toolResult.resumen.total_combos,
                        cambioPromedioUsd: toolResult.resumen.cambio_promedio_usd,
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

            let formattedResponse = toolResult || { exito: true };
            if (call.name === 'proponer_ajuste_masivo_precios' && toolResult?.items) {
              formattedResponse = {
                exito: toolResult.exito,
                total_afectados: toolResult.total_afectados,
                descripcion_criterio: toolResult.descripcion_criterio,
                resumen: toolResult.resumen,
                ejemplos: toolResult.items.slice(0, 10).map((it: any) => ({
                  nombre: it.nombre,
                  precio_anterior: it.precio_anterior,
                  nuevo_precio: it.nuevo_precio,
                  diferencia: it.diferencia_usd
                })),
                nota_para_asistente: 'Se ha presentado la tarjeta interactiva completa en pantalla con el botón para que el usuario confirme y aplique el cambio.'
              };
            }

            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: formattedResponse
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
  accion: 'desactivar_combos' | 'fusionar_insumos' | 'agrupar_similares' | 'ejecutar_despacho' | 'ejecutar_venta_costo' | 'guardar_receta' | 'crear_combo' | 'actualizar_precio_combo' | 'ajuste_masivo_precios';
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

      case 'actualizar_precio_combo': {
        const { comboId, productoId, nuevoPrecio, nuevoNombre, nombreActual } = payload;
        const { supabase, empresaId } = ctx;
        const precio = Number(nuevoPrecio);

        if (isNaN(precio) || precio < 0) {
          return { success: false, mensaje: 'El nuevo precio debe ser un número válido.' };
        }

        // 1. Si está vinculado a promociones_combos
        if (comboId) {
          const updatePayload: any = { precio_fijo: precio };
          if (nuevoNombre) updatePayload.nombre = nuevoNombre;
          await supabase
            .from('promociones_combos')
            .update(updatePayload)
            .eq('id', comboId)
            .eq('empresa_id', empresaId);
        }

        // 2. Si está vinculado a productos
        if (productoId) {
          const updateProdPayload: any = { precio_venta: precio };
          if (nuevoNombre) updateProdPayload.nombre = nuevoNombre;
          await supabase
            .from('productos')
            .update(updateProdPayload)
            .eq('id', productoId)
            .eq('empresa_id', empresaId);
        }

        revalidatePath('/dashboard/promociones');
        revalidatePath('/dashboard/catalogo');
        revalidatePath('/dashboard/terminal');
        revalidatePath('/dashboard/pos');

        const nomFinal = nuevoNombre || nombreActual || 'Combo';
        return {
          success: true,
          mensaje: `¡Precio de "${nomFinal}" actualizado correctamente a $${precio.toFixed(2)} USD en catálogo y punto de venta!`
        };
      }

      case 'ajuste_masivo_precios': {
        const { items } = payload;
        const { supabase, empresaId } = ctx;

        if (!items || !Array.isArray(items) || items.length === 0) {
          return { success: false, mensaje: 'No hay productos o combos seleccionados para actualizar.' };
        }

        let totalActualizados = 0;
        const batchSize = 15;

        for (let i = 0; i < items.length; i += batchSize) {
          const chunk = items.slice(i, i + batchSize);
          await Promise.all(
            chunk.map(async (it: any) => {
              const precio = Number(it.nuevo_precio);
              if (isNaN(precio) || precio < 0) return;

              // 1. Actualizar en promociones_combos si es combo o tiene comboId
              if (it.comboId || it.tipo === 'combo') {
                const cId = it.comboId || it.id;
                const updatePayload: any = { precio_fijo: precio };
                if (it.nuevo_nombre && it.nuevo_nombre !== it.nombre) {
                  updatePayload.nombre = it.nuevo_nombre;
                }
                const { error: errPromo } = await supabase
                  .from('promociones_combos')
                  .update(updatePayload)
                  .eq('id', cId)
                  .eq('empresa_id', empresaId);
                if (!errPromo) totalActualizados++;
              }

              // 2. Actualizar en productos si es producto o combo con productoId
              if (it.productoId || it.tipo === 'producto') {
                const pId = it.productoId || it.id;
                const updatePayload: any = { precio_venta: precio };
                if (it.nuevo_nombre && it.nuevo_nombre !== it.nombre) {
                  updatePayload.nombre = it.nuevo_nombre;
                }
                const { error: errProd } = await supabase
                  .from('productos')
                  .update(updatePayload)
                  .eq('id', pId)
                  .eq('empresa_id', empresaId);
                if (!errProd && !it.comboId && it.tipo === 'producto') {
                  totalActualizados++;
                }
              }
            })
          );
        }

        revalidatePath('/dashboard/promociones');
        revalidatePath('/dashboard/catalogo');
        revalidatePath('/dashboard/terminal');
        revalidatePath('/dashboard/pos');

        return {
          success: true,
          mensaje: `¡Se actualizaron con éxito los precios de ${totalActualizados} registros en el catálogo y punto de venta!`
        };
      }

      default:
        return { success: false, mensaje: 'Acción no reconocida' };
    }
  } catch (err: any) {
    return { success: false, mensaje: err?.message || 'Error al ejecutar acción' };
  }
}
