'use server';

import { createClient } from '@/utils/supabase/server';
import { obtenerComprasNetasSede } from './informes-actions';

export interface ReporteFinancieroResponse {
  success: boolean;
  error?: string;
  data: {
    total_ingresos: number;
    total_egresos: number;
    ganancia_neta: number;
    food_cost_porcentaje: number;
    margen_bruto_porcentaje: number;
    ticket_promedio: number;
    total_facturas: number;
    ingresos_por_dia: { fecha: string; total: number; facturas?: number }[];
    egresos_por_dia: { fecha: string; total: number }[];
    sede_info?: { id: string; nombre: string } | null;
    compras_netas_breakdown: {
      compras_locales: number;
      despachos_recibidos?: number;
      despachos_entregados?: number;
      ventas_costo: number;
      compra_neta: number;
    };
  };
}

export async function getReporteFinanciero(
  fechaInicio: string,
  fechaFin: string,
  sedeId?: string | null
): Promise<ReporteFinancieroResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'No autorizado',
        data: getEmptyReport(),
      };
    }

    const { data: profile } = await supabase
      .from('perfiles')
      .select('empresa_id, rol, sede_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return {
        success: false,
        error: 'Perfil no encontrado',
        data: getEmptyReport(),
      };
    }

    const isPrivileged = ['MASTER', 'ADMIN', 'GERENTE', 'GERENTE_GENERAL'].includes(profile.rol);
    if (!isPrivileged) {
      return {
        success: false,
        error: 'No tienes permisos para ver las finanzas',
        data: getEmptyReport(),
      };
    }

    const finalSedeId = (!isPrivileged && profile.sede_id)
      ? profile.sede_id
      : (sedeId === 'ALL' ? null : (sedeId || null));

    const p_fecha_inicio = fechaInicio.includes('T') ? fechaInicio : `${fechaInicio}T00:00:00.000Z`;
    const p_fecha_fin = fechaFin.includes('T') ? fechaFin : `${fechaFin}T23:59:59.999Z`;

    // ── 1. OBTENER INGRESOS (VENTAS NETAS AGRUPADAS DÍA POR DÍA) ────────────
    // Usamos el RPC get_reporte_ventas_diarias que procesa ventas_facturas con precisión
    // evitando el límite de filas de PostgREST y las fechas nulas de ventas_pagos.
    const { data: ventasDiarias, error: ventasErr } = await supabase.rpc('get_reporte_ventas_diarias', {
      p_empresa_id: profile.empresa_id,
      p_sede_id: finalSedeId,
      p_fecha_inicio: fechaInicio,
      p_fecha_fin: fechaFin,
    });

    if (ventasErr) {
      console.error('Error en get_reporte_ventas_diarias:', ventasErr);
      throw new Error(`Error consultando ventas: ${ventasErr.message}`);
    }

    let totalIngresos = 0;
    let totalFacturas = 0;
    const ingresosPorDia: { fecha: string; total: number; facturas: number }[] = [];

    for (const r of (ventasDiarias || [])) {
      const monto = Number(r.total_ventas || 0);
      const facturas = Number(r.cantidad_facturas || 0);
      totalIngresos += monto;
      totalFacturas += facturas;

      // Convertir 'dd/MM/yyyy' a 'yyyy-MM-dd' para sincronizar con fechas de egresos
      let fechaISO = r.fecha;
      if (r.fecha && r.fecha.includes('/')) {
        const parts = r.fecha.split('/');
        if (parts.length === 3) {
          fechaISO = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }

      ingresosPorDia.push({
        fecha: fechaISO,
        total: monto,
        facturas,
      });
    }

    ingresosPorDia.sort((a, b) => a.fecha.localeCompare(b.fecha));

    // ── 2. OBTENER EGRESOS (COMPRAS NETAS) ───────────────────────────────────
    let totalEgresos = 0;
    const egresosPorDiaMap: Record<string, number> = {};
    let sedeInfo: { id: string; nombre: string } | null = null;
    let breakdown: {
      compras_locales: number;
      despachos_recibidos?: number;
      despachos_entregados?: number;
      ventas_costo: number;
      compra_neta: number;
    };

    if (finalSedeId) {
      // Caso A: Sede Específica -> Aplicar Compras Netas de esa sede
      const netasRes = await obtenerComprasNetasSede(finalSedeId, fechaInicio, fechaFin);
      if (!netasRes.success || !netasRes.data) {
        throw new Error(netasRes.error || 'Error al calcular compras netas de la sede');
      }

      totalEgresos = netasRes.data.compra_neta_usd;
      sedeInfo = netasRes.data.sede;

      breakdown = {
        compras_locales: netasRes.data.compras_locales.total_usd,
        despachos_recibidos: netasRes.data.despachos_recibidos.total_usd,
        despachos_entregados: netasRes.data.despachos_entregados.total_usd,
        ventas_costo: netasRes.data.ventas_costo?.total_usd || 0,
        compra_neta: netasRes.data.compra_neta_usd,
      };

      for (const m of netasRes.data.movimientos) {
        const fecha = (m.fecha || '').split('T')[0];
        if (fecha) {
          const impacto = m.signo === '+' ? m.monto_usd : -m.monto_usd;
          egresosPorDiaMap[fecha] = (egresosPorDiaMap[fecha] || 0) + impacto;
        }
      }
    } else {
      // Caso B: Consolidado Global (Todas las sedes de la empresa)
      // Compras directas locales de todas las sedes − Ventas al Costo globales
      // (Los despachos entre sedes de la misma empresa se cancelan entre sí: suma recibidos = suma entregados)
      const [comprasGlobalRes, ventasCostoGlobalRes] = await Promise.all([
        supabase
          .from('compras_puntuales')
          .select('monto_divisas, monto_bs, fecha_registro')
          .eq('id_empresa', profile.empresa_id)
          .neq('estado', 'ANULADA')
          .gte('fecha_registro', p_fecha_inicio)
          .lte('fecha_registro', p_fecha_fin),
        supabase
          .from('movimientos_inventario')
          .select('costo_perdido, fecha_movimiento')
          .eq('empresa_id', profile.empresa_id)
          .eq('motivo', 'VENTA_AL_COSTO')
          .gte('fecha_movimiento', p_fecha_inicio)
          .lte('fecha_movimiento', p_fecha_fin)
      ]);

      if (comprasGlobalRes.error) {
        throw new Error(`Error en compras consolidadas: ${comprasGlobalRes.error.message}`);
      }

      let totalComprasLocales = 0;
      for (const c of (comprasGlobalRes.data || [])) {
        const monto = Number(c.monto_divisas || 0);
        totalComprasLocales += monto;
        const fecha = (c.fecha_registro || '').split('T')[0];
        if (fecha) {
          egresosPorDiaMap[fecha] = (egresosPorDiaMap[fecha] || 0) + monto;
        }
      }

      let totalVentasCosto = 0;
      for (const v of (ventasCostoGlobalRes.data || [])) {
        const costo = Number(v.costo_perdido || 0);
        totalVentasCosto += costo;
        const fecha = (v.fecha_movimiento || '').split('T')[0];
        if (fecha) {
          egresosPorDiaMap[fecha] = (egresosPorDiaMap[fecha] || 0) - costo;
        }
      }

      totalEgresos = totalComprasLocales - totalVentasCosto;

      breakdown = {
        compras_locales: totalComprasLocales,
        despachos_recibidos: 0,
        despachos_entregados: 0,
        ventas_costo: totalVentasCosto,
        compra_neta: totalEgresos,
      };
    }

    const egresosPorDia = Object.entries(egresosPorDiaMap)
      .map(([fecha, total]) => ({ fecha, total: Math.max(0, total) }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    // ── 3. MÉTRICAS FINANCIERAS Y RENTABILIDAD REAL ──────────────────────────
    const gananciaNeta = totalIngresos - totalEgresos;
    const foodCostPct = totalIngresos > 0 ? (totalEgresos / totalIngresos) * 100 : 0;
    const margenPct = totalIngresos > 0 ? (gananciaNeta / totalIngresos) * 100 : 0;
    const ticketPromedio = totalFacturas > 0 ? totalIngresos / totalFacturas : 0;

    return {
      success: true,
      data: {
        total_ingresos: Number(totalIngresos.toFixed(2)),
        total_egresos: Number(totalEgresos.toFixed(2)),
        ganancia_neta: Number(gananciaNeta.toFixed(2)),
        food_cost_porcentaje: Number(foodCostPct.toFixed(1)),
        margen_bruto_porcentaje: Number(margenPct.toFixed(1)),
        ticket_promedio: Number(ticketPromedio.toFixed(2)),
        total_facturas: totalFacturas,
        ingresos_por_dia: ingresosPorDia,
        egresos_por_dia: egresosPorDia,
        sede_info: sedeInfo,
        compras_netas_breakdown: breakdown,
      },
    };
  } catch (error: any) {
    console.error('Error fetching finanzas:', error);
    return {
      success: false,
      error: error.message || 'Error inesperado al calcular finanzas',
      data: getEmptyReport(),
    };
  }
}

function getEmptyReport() {
  return {
    total_ingresos: 0,
    total_egresos: 0,
    ganancia_neta: 0,
    food_cost_porcentaje: 0,
    margen_bruto_porcentaje: 0,
    ticket_promedio: 0,
    total_facturas: 0,
    ingresos_por_dia: [],
    egresos_por_dia: [],
    sede_info: null,
    compras_netas_breakdown: {
      compras_locales: 0,
      despachos_recibidos: 0,
      despachos_entregados: 0,
      ventas_costo: 0,
      compra_neta: 0,
    },
  };
}
