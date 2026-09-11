// src/hooks/useDashboardData.ts
// Lee datos del dashboard DIRECTAMENTE desde Supabase (browser → PostgREST).
// Vercel no ve estas peticiones → 0 invocaciones de función para lecturas.
'use client';

import { createClient } from '@/utils/supabase/client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  startOfMonth, endOfDay, startOfToday, subDays,
  subMonths, startOfDay,
} from 'date-fns';

export type DashboardRow = {
  dia: string;
  ventas_brutas: number;
  cogs: number;
  gastos_operativos: number;
  mermas: number;
  utilidad_neta: number;
};

export type Sede = {
  id: string;
  nombre: string;
  direccion?: string;
};

function getDateRange(range: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  switch (range) {
    case 'today':
      return { startDate: startOfToday(), endDate: endOfDay(now) };
    case '7days':
      return { startDate: startOfDay(subDays(now, 7)), endDate: endOfDay(now) };
    case 'lastMonth': {
      const firstOfThisMonth = startOfMonth(now);
      return {
        startDate: startOfMonth(subMonths(now, 1)),
        endDate: endOfDay(subDays(firstOfThisMonth, 1)),
      };
    }
    case 'thisMonth':
    default:
      return { startDate: startOfMonth(now), endDate: endOfDay(now) };
  }
}

// ─── Hook: Sedes ─────────────────────────────────────────────────────────────
// Lee las sedes una sola vez por sesión. No hay re-fetch salvo montaje inicial.
const fetchSedes = async (empresaId: string) => {
  const supabase = createClient();
  const { data } = await supabase
    .from('sedes')
    .select('id, nombre_sede, direccion')
    .eq('empresa_id', empresaId);
  return data?.map(s => ({ id: s.id, nombre: s.nombre_sede, direccion: s.direccion })) || [];
};

export function useSedes(empresaId: string, userRole: string, userSedeId: string | null) {
  const isGlobal = ['MASTER', 'ADMIN', 'GERENTE'].includes(userRole);
  
  const { data } = useSWR(
    (empresaId && isGlobal) ? `sedes-${empresaId}` : null,
    () => fetchSedes(empresaId),
    { revalidateOnFocus: false }
  );

  return data ?? [];
}

// ─── Hook principal: Dashboard KPIs ──────────────────────────────────────────
// Carga UNA VEZ por [range, sedeId]. Los filtros/KPIs se calculan en JS.
import useSWR from 'swr';

const fetchDashboard = async ([_, empresaId, range, sedeId]: [string, string, string, string | null]) => {
  if (!empresaId) return [];
  const { startDate, endDate } = getDateRange(range);
  const supabase = createClient();
  const { data: rows, error: rpcError } = await supabase.rpc(
    'get_dashboard_rentabilidad',
    {
      p_empresa_id: empresaId,
      p_fecha_inicio: startDate.toISOString(),
      p_fecha_fin: endDate.toISOString(),
      p_sede_id: sedeId,
    },
  );
  if (rpcError) throw new Error(rpcError.message);
  return (rows || []).map((r: any) => ({
    ...r,
    dia: r.dia ?? r.fecha ?? r.date ?? 'N/A',
  }));
};

export function useDashboardData(
  range: string,
  sedeId: string | null,
  empresaId: string,
) {
  const { data, error, isLoading, mutate } = useSWR(
    empresaId ? ['dashboard', empresaId, range, sedeId] : null,
    fetchDashboard,
    { keepPreviousData: true }
  );

  return { data: data ?? [], isLoading, error: error?.message ?? null, refetch: mutate };
}
