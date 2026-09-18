// src/hooks/useInformesData.ts
// Sprint 3 — lee catálogos e informes DIRECTAMENTE desde Supabase (browser → PostgREST).
// Patrón: "Load Once, Filter Locally" — cero Server Actions para lecturas.
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format, startOfDay, endOfDay, addDays, differenceInCalendarDays } from 'date-fns';

// Re-exporta useSedes para que los consumidores puedan importarlo desde aquí si quieren.
export { useSedes } from './useDashboardData';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ExtraFilters {
  categoriaFilter?: string;
  cajeroId?: string;
  clienteId?: string;
}

export interface CatalogoItem {
  id: string;
  nombre: string;
}

// ─── Hook: Catálogos de Informes (categorías, cajeros y clientes) ─────────────
// Carga los 3 catálogos UNA SOLA VEZ por empresaId usando Promise.all (paralelo).
// Si falla cualquier catálogo retorna array vacío — no quiebra la UI.

import useSWR from 'swr';

const fetchCatalogos = async (empresaId: string) => {
  const supabase = createClient();
  const [catRes, cajRes, cliRes] = await Promise.all([
    supabase.rpc('get_categorias_productos', { p_empresa_id: empresaId }),
    supabase.rpc('get_cajeros_empresa', { p_empresa_id: empresaId }),
    supabase.from('clientes').select('id, nombre').eq('empresa_id', empresaId).order('nombre')
  ]);
  
  return {
    categorias: (catRes?.data as any[] || []).map((r: any) => r.categoria as string).filter(Boolean),
    cajeros: (cajRes?.data as CatalogoItem[]) || [],
    clientes: (cliRes?.data as CatalogoItem[]) || []
  };
};

export function useCatalogosInformes(empresaId: string) {
  const { data, isLoading } = useSWR(
    empresaId ? `catalogos-${empresaId}` : null,
    () => fetchCatalogos(empresaId),
    { revalidateOnFocus: false }
  );

  return { 
    categorias: data?.categorias ?? [], 
    cajeros: data?.cajeros ?? [], 
    clientes: data?.clientes ?? [], 
    isLoading 
  };
}

// ─── Helper: Agregar fila de Totales a reportes numéricos ───────────────────
function appendReportTotals(reportId: string, rawData: any[]): any[] {
  if (!rawData || rawData.length === 0) return rawData;

  const lastRow = rawData[rawData.length - 1];
  const firstColVal = String(Object.values(lastRow)[0] ?? '').toUpperCase();
  if (firstColVal.includes('TOTAL')) return rawData;

  const sample = rawData[0];
  const keys = Object.keys(sample);

  if (reportId === 'ventas_diarias') {
    let sumFacturas = 0;
    let sumVentas = 0;
    let sumDesc = 0;
    for (const r of rawData) {
      sumFacturas += Number(r.cantidad_facturas || 0);
      sumVentas += Number(r.total_ventas || 0);
      sumDesc += Number(r.total_descuentos || 0);
    }
    const avgTicket = sumFacturas > 0 ? sumVentas / sumFacturas : 0;
    return [
      ...rawData,
      {
        fecha: 'TOTALES',
        cantidad_facturas: sumFacturas,
        total_ventas: sumVentas,
        total_descuentos: sumDesc,
        ticket_promedio: avgTicket,
      },
    ];
  }

  if (reportId === 'ventas_usuarios') {
    let sumFacturas = 0;
    let sumVentas = 0;
    for (const r of rawData) {
      sumFacturas += Number(r.cantidad_facturas || 0);
      sumVentas += Number(r.total_ventas || 0);
    }
    const avgTicket = sumFacturas > 0 ? sumVentas / sumFacturas : 0;
    return [
      ...rawData,
      {
        nombre_cajero: 'TOTALES',
        cantidad_facturas: sumFacturas,
        total_ventas: sumVentas,
        promedio_por_factura: avgTicket,
      },
    ];
  }

  if (reportId === 'ventas_clientes') {
    let sumVisitas = 0;
    let sumGastado = 0;
    for (const r of rawData) {
      sumVisitas += Number(r.visitas || 0);
      sumGastado += Number(r.total_gastado || 0);
    }
    const avgTicket = sumVisitas > 0 ? sumGastado / sumVisitas : 0;
    return [
      ...rawData,
      {
        cliente: 'TOTALES',
        visitas: sumVisitas,
        total_gastado: sumGastado,
        ticket_promedio: avgTicket,
      },
    ];
  }

  if (reportId === 'ventas_categoria') {
    let sumItems = 0;
    let sumVendido = 0;
    for (const r of rawData) {
      sumItems += Number(r.cantidad_items || 0);
      sumVendido += Number(r.total_vendido || 0);
    }
    const avgTicket = sumItems > 0 ? sumVendido / sumItems : 0;
    return [
      ...rawData,
      {
        categoria: 'TOTALES',
        cantidad_items: sumItems,
        total_vendido: sumVendido,
        ticket_promedio: avgTicket,
      },
    ];
  }

  if (reportId === 'productos_vendidos') {
    let sumUnidades = 0;
    let sumIngresos = 0;
    for (const r of rawData) {
      sumUnidades += Number(r.unidades_vendidas || 0);
      sumIngresos += Number(r.ingresos_total || 0);
    }
    const avgPrecio = sumUnidades > 0 ? sumIngresos / sumUnidades : 0;
    return [
      ...rawData,
      {
        codigo: '',
        producto: 'TOTALES',
        categoria: '',
        unidades_vendidas: sumUnidades,
        ingresos_total: sumIngresos,
        precio_promedio: avgPrecio,
      },
    ];
  }

  if (reportId === 'detalle_ventas') {
    let sumSub = 0;
    let sumDesc = 0;
    let sumTot = 0;
    for (const r of rawData) {
      sumSub += Number(r.subtotal || 0);
      sumDesc += Number(r.descuento || 0);
      sumTot += Number(r.total || 0);
    }
    return [
      ...rawData,
      {
        numero_orden: 'TOTALES',
        numero_documento: '',
        fecha_hora: '',
        cliente: '',
        cajero: '',
        productos: '',
        subtotal: sumSub,
        descuento: sumDesc,
        total: sumTot,
        metodos_pago: '',
        estado: '',
      },
    ];
  }

  if (reportId === 'cuentas_por_cobrar') {
    let sumDeuda = 0;
    let sumFacturas = 0;
    for (const r of rawData) {
      sumDeuda += Number(r.total_deuda || 0);
      sumFacturas += Number(r.total_facturas || 0);
    }
    return [
      ...rawData,
      {
        cliente_id: '',
        nombre_cliente: 'TOTALES',
        rif_cedula: '',
        total_deuda: sumDeuda,
        total_facturas: sumFacturas,
        nombre_sede: '',
      },
    ];
  }

  if (reportId === 'cuentas_abiertas') {
    let sumTot = 0;
    for (const r of rawData) {
      sumTot += Number(r.total || 0);
    }
    return [
      ...rawData,
      {
        id: '',
        numero_documento: '',
        nombre_cuenta: 'TOTALES',
        total: sumTot,
        fecha_apertura: '',
        nombre_sede: '',
      },
    ];
  }

  return rawData;
}

// ─── Hook: Generador de Reportes ──────────────────────────────────────────────
// generateReport() llama directamente a Supabase RPCs desde el browser.
// Casos especiales:
//   - ventas_metodos_pago → query directa a tabla ventas + pivot en JS
//   - compras_insumos / gastos_operativos / compras_operador → query a compras_puntuales + agregación en JS
// Todos con manejo de errores silencioso (setError en el estado, sin throw al usuario).

export function useGenerateReport(empresaId: string) {
  const [reportData, setReportData] = useState<any[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>('');

  const generateReport = useCallback(
    async (
      reportId: string,
      sedeId: string | null,
      startDate: Date,
      endDate: Date,
      extra: ExtraFilters = {}
    ) => {
      if (!empresaId) return;

      setIsGenerating(true);
      setError('');
      setReportData(null);

      const supabase = createClient();

      const p_empresa_id = empresaId;
      const p_sede_id = sedeId === 'ALL' ? null : sedeId;
      const p_fecha_inicio = `${format(startDate, 'yyyy-MM-dd')}T00:00:00+00:00`;
      const p_fecha_fin = `${format(endDate, 'yyyy-MM-dd')}T23:59:59.999+00:00`;
      const p_categoria = extra.categoriaFilter || null;
      const p_cajero_id = extra.cajeroId || null;
      const p_cliente_id = extra.clienteId || null;

      try {
        // ── Reportes de Compras (JS-level aggregation desde browser) ──────────
        if (['compras_insumos', 'compras_operador', 'gastos_operativos'].includes(reportId)) {
          const query = supabase
            .from('compras_puntuales')
            .select(
              'id, proveedor, fecha_registro, monto_divisas, monto_bs, tasa_cambio, detalles, metodo_pago, usuario_id'
            )
            .eq('id_empresa', p_empresa_id)
            .gte('fecha_registro', p_fecha_inicio)
            .lte('fecha_registro', p_fecha_fin)
            .order('fecha_registro', { ascending: false });

          if (p_sede_id) query.eq('id_sede', p_sede_id);

          const { data: rawData, error: qError } = await query;
          if (qError) throw new Error(qError.message);

          const rows = rawData ?? [];

          // Enrich with user profiles
          const userIds = [...new Set(rows.map((d: any) => d.usuario_id).filter(Boolean))];
          let profilesMap: Record<string, string> = {};
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from('perfiles')
              .select('id, nombre_completo')
              .in('id', userIds);
            if (profiles) {
              profiles.forEach((p: any) => { profilesMap[p.id] = p.nombre_completo; });
            }
          }

          const joinedData = rows.map((d: any) => ({
            ...d,
            nombre_operador: profilesMap[d.usuario_id] || 'Desconocido',
          }));

          if (reportId === 'compras_insumos') {
            let sumDivisas = 0;
            let sumBs = 0;
            const result = joinedData
              .filter((d: any) => {
                const det = d.detalles;
                if (typeof det === 'string' && det.includes('"is_insumos":true')) return true;
                if (typeof det === 'object' && det?.is_insumos) return true;
                return false;
              })
              .map((d: any) => {
                let obs = d.detalles;
                if (typeof obs === 'string' && obs.includes('{')) {
                  try { obs = JSON.parse(obs).texto; } catch (_) { /* noop */ }
                } else if (typeof obs === 'object') {
                  obs = (obs as any)?.texto || '';
                }
                sumDivisas += Number(d.monto_divisas || 0);
                sumBs += Number(d.monto_bs || 0);
                return {
                  'FECHA': new Date(d.fecha_registro).toLocaleDateString(),
                  'PROVEEDOR / GASTO': d.proveedor || 'Sin Nombre',
                  'DOLARES': `$ ${Number(d.monto_divisas ?? 0).toFixed(2)}`,
                  'TASA': d.tasa_cambio,
                  'Bs.': `Bs.S ${Number(d.monto_bs ?? 0).toFixed(2)}`,
                  'OBSERVACION': obs,
                  'OPERADOR': d.nombre_operador,
                };
              });
            if (result.length > 0) {
              result.push({
                'FECHA': 'TOTAL',
                'PROVEEDOR / GASTO': '',
                'DOLARES': `$ ${sumDivisas.toFixed(2)}`,
                'TASA': '',
                'Bs.': `Bs.S ${sumBs.toFixed(2)}`,
                'OBSERVACION': '',
                'OPERADOR': '',
              });
            }
            setReportData(result);
            return;
          }

          if (reportId === 'gastos_operativos') {
            let sumDivisas = 0;
            let sumBs = 0;
            const result = joinedData
              .filter((d: any) => {
                const det = d.detalles;
                if (typeof det === 'string' && det.includes('"is_insumos":true')) return false;
                if (typeof det === 'object' && det?.is_insumos) return false;
                return true;
              })
              .map((d: any) => {
                sumDivisas += Number(d.monto_divisas || 0);
                sumBs += Number(d.monto_bs || 0);
                return {
                  'FECHA': new Date(d.fecha_registro).toLocaleDateString(),
                  'PROVEEDOR / GASTO': d.proveedor || 'Sin Nombre',
                  'DOLARES': `$ ${Number(d.monto_divisas ?? 0).toFixed(2)}`,
                  'TASA': d.tasa_cambio,
                  'Bs.': `Bs.S ${Number(d.monto_bs ?? 0).toFixed(2)}`,
                  'OBSERVACION':
                    typeof d.detalles === 'string' ? d.detalles : (d.detalles as any)?.texto || '',
                  'OPERADOR': d.nombre_operador,
                };
              });
            if (result.length > 0) {
              result.push({
                'FECHA': 'TOTAL',
                'PROVEEDOR / GASTO': '',
                'DOLARES': `$ ${sumDivisas.toFixed(2)}`,
                'TASA': '',
                'Bs.': `Bs.S ${sumBs.toFixed(2)}`,
                'OBSERVACION': '',
                'OPERADOR': '',
              });
            }
            setReportData(result);
            return;
          }

          if (reportId === 'compras_operador') {
            const summary: Record<
              string,
              { operador: string; cantidad: number; total_divisas: number; total_bs: number }
            > = {};
            let sumCant = 0;
            let sumDiv = 0;
            let sumBs = 0;
            for (const row of joinedData) {
              const op = row.nombre_operador || 'Desconocido';
              if (!summary[op])
                summary[op] = { operador: op, cantidad: 0, total_divisas: 0, total_bs: 0 };
              summary[op].cantidad += 1;
              summary[op].total_divisas += Number(row.monto_divisas || 0);
              summary[op].total_bs += Number(row.monto_bs || 0);
              sumCant += 1;
              sumDiv += Number(row.monto_divisas || 0);
              sumBs += Number(row.monto_bs || 0);
            }
            const result: any[] = Object.values(summary)
              .sort((a, b) => b.total_divisas - a.total_divisas)
              .map(s => ({
                'OPERADOR': s.operador,
                'COMPRAS REALIZADAS': s.cantidad,
                'TOTAL DOLARES': `$ ${s.total_divisas.toFixed(2)}`,
                'TOTAL Bs.': `Bs.S ${s.total_bs.toFixed(2)}`,
              }));
            if (result.length > 0) {
              result.push({
                'OPERADOR': 'TOTALES',
                'COMPRAS REALIZADAS': sumCant,
                'TOTAL DOLARES': `$ ${sumDiv.toFixed(2)}`,
                'TOTAL Bs.': `Bs.S ${sumBs.toFixed(2)}`,
              });
            }
            setReportData(result);
            return;
          }
        }

        // ── Ventas por método de pago (query directa + pivot en JS) ───────────
        if (reportId === 'ventas_metodos_pago') {
          const query = supabase
            .from('ventas_facturas')
            .select(`
              fecha_venta,
              total,
              ventas_pagos (
                tipo_pago,
                monto
              )
            `)
            .eq('empresa_id', p_empresa_id)
            .gte('fecha_venta', p_fecha_inicio)
            .lte('fecha_venta', p_fecha_fin);

          if (p_sede_id) query.eq('sede_id', p_sede_id);

          const { data: ventasData, error: vError } = await query;
          if (vError) throw new Error(vError.message);

          const rows = ventasData ?? [];

          // Pivot en JS: agrupar por fecha y método de pago
          const byDate: Record<
            string,
            { fecha: string; total_usd: number; metodos: Record<string, number> }
          > = {};

          for (const row of rows as any[]) {
            const fecha = (row.fecha_venta as string)?.split('T')[0] ?? '';
            if (!byDate[fecha]) byDate[fecha] = { fecha, total_usd: 0, metodos: {} };
            const pagos = row.ventas_pagos || [];
            if (pagos.length > 0) {
              for (const p of pagos) {
                const metodo = p.tipo_pago || 'Otro';
                byDate[fecha].metodos[metodo] = (byDate[fecha].metodos[metodo] || 0) + Number(p.monto || 0);
              }
            } else {
              const metodo = 'Efectivo';
              byDate[fecha].metodos[metodo] = (byDate[fecha].metodos[metodo] || 0) + Number(row.total || 0);
            }
            byDate[fecha].total_usd += Number(row.total || 0);
          }

          // Si no hay ventas en ventas_facturas para esas fechas, verificar en cierres_transacciones
          if (rows.length === 0) {
            let qCierres = supabase
              .from('cierres_transacciones')
              .select(`
                monto,
                moneda,
                metodo,
                cierres_caja!inner (
                  fecha_cierre,
                  tasa_cambio,
                  sede_id,
                  empresa_id
                )
              `)
              .eq('cierres_caja.empresa_id', p_empresa_id)
              .gte('cierres_caja.fecha_cierre', p_fecha_inicio.split('T')[0])
              .lte('cierres_caja.fecha_cierre', p_fecha_fin.split('T')[0]);

            if (p_sede_id) qCierres = qCierres.eq('cierres_caja.sede_id', p_sede_id);

            const { data: cierresData } = await qCierres;
            if (cierresData && cierresData.length > 0) {
              for (const row of cierresData as any[]) {
                const c = row.cierres_caja;
                if (!c) continue;
                const fecha = c.fecha_cierre || '';
                if (!byDate[fecha]) byDate[fecha] = { fecha, total_usd: 0, metodos: {} };
                const monto = Number(row.monto) || 0;
                const isVES = row.moneda === 'VES';
                const amountUSD = isVES ? monto / (c.tasa_cambio || 1) : monto;
                const metodo = row.metodo?.toUpperCase() || 'DESCONOCIDO';
                byDate[fecha].metodos[metodo] = (byDate[fecha].metodos[metodo] || 0) + amountUSD;
                byDate[fecha].total_usd += amountUSD;
              }
            }
          }

          // Recolectar todos los métodos únicos encontrados en el período
          const allMethodsSet = new Set<string>();
          for (const day of Object.values(byDate)) {
            for (const m of Object.keys(day.metodos)) {
              if (m) allMethodsSet.add(m.trim());
            }
          }

          // Orden preferente de métodos conocidos
          const preferredOrder = ['Efectivo', 'Pago Movil', 'Punto', 'Zelle', 'Binance', 'Pt Bancrecer', 'Cashea', 'Credito'];
          const allMethods = Array.from(allMethodsSet).sort((a, b) => {
            const ia = preferredOrder.indexOf(a);
            const ib = preferredOrder.indexOf(b);
            if (ia !== -1 && ib !== -1) return ia - ib;
            if (ia !== -1) return -1;
            if (ib !== -1) return 1;
            return a.localeCompare(b);
          });

          if (allMethods.length === 0) {
            allMethods.push('Efectivo', 'Pago Movil', 'Punto', 'Zelle');
          }

          // Generar todos los días del período seleccionado
          const totalDays = Math.min(Math.max(differenceInCalendarDays(endDate, startDate) + 1, 1), 366);
          const formattedData: Record<string, any>[] = [];
          let grandTotal = 0;
          const methodTotals: Record<string, number> = {};
          allMethods.forEach(m => { methodTotals[m] = 0; });

          let cur = startOfDay(startDate);
          for (let i = 0; i < totalDays; i++) {
            const dateIso = format(cur, 'yyyy-MM-dd');
            const dateLabel = format(cur, 'dd/MM/yyyy');
            const dayData = byDate[dateIso] || { total_usd: 0, metodos: {} };

            grandTotal += dayData.total_usd;

            const rowObj: Record<string, any> = {
              Fecha: dateLabel,
              'Total (USD)': `$ ${dayData.total_usd.toFixed(2)}`,
            };

            for (const m of allMethods) {
              const val = Number(dayData.metodos[m] || 0);
              methodTotals[m] += val;
              rowObj[m] = `$ ${val.toFixed(2)}`;
            }

            formattedData.push(rowObj);
            cur = addDays(cur, 1);
          }

          // Fila de TOTALES al final
          if (formattedData.length > 0) {
            const totalRow: Record<string, any> = {
              Fecha: 'TOTALES',
              'Total (USD)': `$ ${grandTotal.toFixed(2)}`,
            };
            for (const m of allMethods) {
              totalRow[m] = `$ ${(methodTotals[m] || 0).toFixed(2)}`;
            }
            formattedData.push(totalRow);
          }

          setReportData(formattedData);
          return;
        }

        // ── Reportes RPC estándar ──────────────────────────────────────────────
        let rpcName = '';
        let rpcParams: Record<string, any> = {};

        switch (reportId) {
          case 'ventas_diarias':
            rpcName = 'get_reporte_ventas_diarias';
            rpcParams = { p_empresa_id, p_sede_id, p_fecha_inicio, p_fecha_fin };
            break;

          case 'ventas_productos':
            rpcName = 'get_reporte_ventas_productos';
            rpcParams = { p_empresa_id, p_sede_id, p_fecha_inicio, p_fecha_fin };
            break;

          case 'ventas_clientes':
            rpcName = 'get_reporte_ventas_clientes';
            rpcParams = {
              p_empresa_id, p_sede_id, p_fecha_inicio, p_fecha_fin,
              p_cajero_nombre: p_cajero_id,
            };
            break;

          case 'ventas_productos_clientes':
            rpcName = 'get_reporte_ventas_productos_clientes';
            rpcParams = { p_empresa_id, p_sede_id, p_fecha_inicio, p_fecha_fin };
            break;

          case 'ventas_usuarios':
            rpcName = 'get_reporte_ventas_usuarios';
            rpcParams = { p_empresa_id, p_sede_id, p_fecha_inicio, p_fecha_fin };
            break;

          case 'cuentas_por_cobrar':
            rpcName = 'get_reporte_cuentas_por_cobrar';
            rpcParams = { p_empresa_id, p_sede_id };
            break;

          case 'cuentas_abiertas':
            rpcName = 'get_reporte_cuentas_abiertas';
            rpcParams = { p_empresa_id, p_sede_id };
            break;

          case 'cierres_caja':
            rpcName = 'get_reporte_cierres_caja';
            rpcParams = { p_empresa_id, p_sede_id, p_fecha_inicio, p_fecha_fin };
            break;

          case 'detalle_ventas':
            rpcName = 'get_reporte_detalle_ventas';
            rpcParams = {
              p_empresa_id, p_sede_id, p_fecha_inicio, p_fecha_fin,
              p_cliente_id,
              p_cajero_nombre: p_cajero_id,
            };
            break;

          case 'ventas_categoria':
            rpcName = 'get_reporte_ventas_categoria';
            rpcParams = {
              p_empresa_id, p_sede_id, p_fecha_inicio, p_fecha_fin,
              p_categoria,
              p_cajero_nombre: p_cajero_id,
              p_cliente_id,
            };
            break;

          case 'productos_vendidos':
            rpcName = 'get_reporte_productos_vendidos';
            rpcParams = {
              p_empresa_id, p_sede_id, p_fecha_inicio, p_fecha_fin,
              p_categoria,
              p_cajero_nombre: p_cajero_id,
              p_cliente_id,
            };
            break;

          default:
            setError('Reporte no implementado todavía.');
            setIsGenerating(false);
            return;
        }

        const { data, error: rpcError } = await supabase.rpc(rpcName, rpcParams);

        if (rpcError) throw new Error(rpcError.message);

        const processed = appendReportTotals(reportId, data ?? []);
        setReportData(processed);
      } catch (err: any) {
        setError(err.message || 'Error de conexión.');
        setReportData(null);
      } finally {
        setIsGenerating(false);
      }
    },
    [empresaId]
  );

  return { reportData, isGenerating, error, generateReport, setReportData, setError };
}
