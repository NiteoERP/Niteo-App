'use server';

import { createClient } from '@/utils/supabase/server';
import { obtenerComprasNetasSede } from './informes-actions';

export async function getReporteFinanciero(
  fechaInicio: string,
  fechaFin: string,
  sedeId?: string | null
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autorizado' };

    const { data: profile } = await supabase
      .from('perfiles')
      .select('empresa_id, rol, sede_id')
      .eq('id', user.id)
      .single();

    if (!profile) return { success: false, error: 'Perfil no encontrado' };

    const isPrivileged = ['MASTER', 'ADMIN', 'GERENTE', 'GERENTE_GENERAL'].includes(profile.rol);
    if (!isPrivileged) {
      return { success: false, error: 'No tienes permisos para ver las finanzas' };
    }

    const finalSedeId = (!isPrivileged && profile.sede_id) ? profile.sede_id : (sedeId === 'ALL' ? null : (sedeId || null));

    // ── Si se consulta una sede específica, aplicar COMPRAS NETAS: ──────────
    // Compras Netas = Compras Locales + Despachos Recibidos - Despachos Entregados
    if (finalSedeId) {
      const p_fecha_inicio = fechaInicio.includes('T') ? fechaInicio : `${fechaInicio}T00:00:00.000Z`;
      const p_fecha_fin = fechaFin.includes('T') ? fechaFin : `${fechaFin}T23:59:59.999Z`;

      // 1. Ingresos de la sede seleccionada (Ventas Pagos Aprobados de esa sede)
      const { data: pagosData, error: pagosErr } = await supabase
        .from('ventas_pagos')
        .select(`
          monto,
          fecha_pago,
          ventas_facturas!inner (
            id,
            empresa_id,
            sede_id,
            fecha_venta
          )
        `)
        .eq('ventas_facturas.empresa_id', profile.empresa_id)
        .eq('ventas_facturas.sede_id', finalSedeId)
        .gte('fecha_pago', p_fecha_inicio)
        .lte('fecha_pago', p_fecha_fin);

      if (pagosErr) throw pagosErr;

      let totalIngresos = 0;
      const ingresosPorDiaMap: Record<string, number> = {};

      for (const p of (pagosData || [])) {
        const monto = Number(p.monto || 0);
        totalIngresos += monto;
        const fecha = (p.fecha_pago || '').split('T')[0];
        if (fecha) {
          ingresosPorDiaMap[fecha] = (ingresosPorDiaMap[fecha] || 0) + monto;
        }
      }

      // 2. Compras Netas de la sede
      const netasRes = await obtenerComprasNetasSede(finalSedeId, fechaInicio, fechaFin);
      if (!netasRes.success || !netasRes.data) {
        throw new Error(netasRes.error || 'Error al calcular compras netas de la sede');
      }

      const totalEgresos = netasRes.data.compra_neta_usd;
      const egresosPorDiaMap: Record<string, number> = {};

      for (const m of netasRes.data.movimientos) {
        const fecha = (m.fecha || '').split('T')[0];
        if (fecha) {
          const impacto = m.signo === '+' ? m.monto_usd : -m.monto_usd;
          egresosPorDiaMap[fecha] = (egresosPorDiaMap[fecha] || 0) + impacto;
        }
      }

      const gananciaNeta = totalIngresos - totalEgresos;

      const ingresosPorDia = Object.entries(ingresosPorDiaMap)
        .map(([fecha, total]) => ({ fecha, total }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));

      const egresosPorDia = Object.entries(egresosPorDiaMap)
        .map(([fecha, total]) => ({ fecha, total }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));

      return {
        success: true,
        data: {
          total_ingresos: totalIngresos,
          total_egresos: totalEgresos,
          ganancia_neta: gananciaNeta,
          ingresos_por_dia: ingresosPorDia,
          egresos_por_dia: egresosPorDia,
          sede_info: netasRes.data.sede,
          compras_netas_breakdown: {
            compras_locales: netasRes.data.compras_locales.total_usd,
            despachos_recibidos: netasRes.data.despachos_recibidos.total_usd,
            despachos_entregados: netasRes.data.despachos_entregados.total_usd,
            compra_neta: netasRes.data.compra_neta_usd,
          },
        },
      };
    }

    // ── Si es consulta global (todas las sedes): ─────────────────────────────
    const { data, error } = await supabase.rpc('obtener_flujo_caja', {
      p_empresa_id: profile.empresa_id,
      p_fecha_inicio: fechaInicio,
      p_fecha_fin: fechaFin,
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error fetching finanzas:', error);
    return {
      success: false,
      error: error.message,
      data: {
        total_ingresos: 0,
        total_egresos: 0,
        ganancia_neta: 0,
        ingresos_por_dia: [],
        egresos_por_dia: [],
      },
    };
  }
}
