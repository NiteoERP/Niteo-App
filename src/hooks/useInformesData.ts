// src/hooks/useInformesData.ts
// Sprint 3 — lee catálogos e informes DIRECTAMENTE desde Supabase (browser → PostgREST).
// Patrón: "Load Once, Filter Locally" — cero Server Actions para lecturas.
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format, startOfDay, endOfDay } from 'date-fns';

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
      const p_fecha_inicio = format(startOfDay(startDate), "yyyy-MM-dd'T'HH:mm:ssXXX");
      const p_fecha_fin = format(endOfDay(endDate), "yyyy-MM-dd'T'HH:mm:ssXXX");
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
            for (const row of joinedData) {
              const op = row.nombre_operador || 'Desconocido';
              if (!summary[op])
                summary[op] = { operador: op, cantidad: 0, total_divisas: 0, total_bs: 0 };
              summary[op].cantidad += 1;
              summary[op].total_divisas += Number(row.monto_divisas || 0);
              summary[op].total_bs += Number(row.monto_bs || 0);
            }
            const result = Object.values(summary)
              .sort((a, b) => b.total_divisas - a.total_divisas)
              .map(s => ({
                'OPERADOR': s.operador,
                'COMPRAS REALIZADAS': s.cantidad,
                'TOTAL DOLARES': `$ ${s.total_divisas.toFixed(2)}`,
                'TOTAL Bs.': `Bs.S ${s.total_bs.toFixed(2)}`,
              }));
            setReportData(result);
            return;
          }
        }

        // ── Ventas por método de pago (query directa + pivot en JS) ───────────
        if (reportId === 'ventas_metodos_pago') {
          const query = supabase
            .from('ventas')
            .select('fecha_venta, metodo_pago, total_usd')
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

          for (const row of rows) {
            const fecha = (row.fecha_venta as string)?.split('T')[0] ?? '';
            if (!byDate[fecha]) byDate[fecha] = { fecha, total_usd: 0, metodos: {} };
            const metodo = row.metodo_pago || 'Otro';
            byDate[fecha].metodos[metodo] = (byDate[fecha].metodos[metodo] || 0) + Number(row.total_usd || 0);
            byDate[fecha].total_usd += Number(row.total_usd || 0);
          }

          const formattedData = Object.values(byDate)
            .sort((a, b) => a.fecha.localeCompare(b.fecha))
            .map(row => {
              const obj: Record<string, any> = {
                Fecha: row.fecha,
                'Total (USD)': row.total_usd,
              };
              Object.entries(row.metodos).forEach(([m, v]) => { obj[m] = v; });
              return obj;
            });

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

        setReportData(data ?? []);
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
