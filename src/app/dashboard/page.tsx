'use client';
// ─── DashboardPage — Refactor: "Load Once, Filter Locally" ───────────────────
// ANTES: cada cambio de filtro → Server Action → Vercel Function invocada
// AHORA: 1 query al montar/cambiar [range|sedeId] → Supabase directo (browser)
//        Filtros, KPIs, ordenamiento → JavaScript puro → 0 invocaciones Vercel
import { useEmpresa } from '@/components/providers/EmpresaProvider';
import React, { useState, useMemo, useCallback } from 'react';
import { useDashboardData, useSedes } from '@/hooks/useDashboardData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  Receipt, Loader2, Calendar, Store, FileOutput, AlertCircle,
} from 'lucide-react';
import RecentSalesWidget from '@/components/pos/RecentSalesWidget';
import ReportPreviewModal from '@/components/reports/ReportPreviewModal';

import Link from 'next/link';

export default function DashboardPage() {
  const { formatCurrency, empresaId, userRole, userSedeId, permisos = [] } = useEmpresa();
  const hasDashboard = userRole === 'MASTER' || userRole === 'SUPERADMIN' || permisos.includes('dashboard');
  const hasPos = userRole === 'MASTER' || userRole === 'SUPERADMIN' || permisos.includes('pos');

  // ── Filtros locales (sin query) ──────────────────────────────────────────
  const [range, setRange] = useState('thisMonth');
  const [sedeId, setSedeId] = useState<string | null>(null); // null = todas
  const [showExport, setShowExport] = useState(false);

  // ── Sedes: 1 query en montaje, nunca más ────────────────────────────────
  const sedes = useSedes(hasDashboard ? (empresaId ?? '') : '', userRole, userSedeId);

  // ── KPI data: 1 query por cambio de [range, sedeId] ─────────────────────
  const { data, isLoading, error, refetch } = useDashboardData(
    range,
    sedeId,
    hasDashboard ? (empresaId ?? '') : '',
  );

  // ── KPIs: calculados en JS, sin query extra ──────────────────────────────
  const kpis = useMemo(
    () =>
      data.reduce(
        (acc: any, curr: any) => ({
          ventas:   acc.ventas   + Number(curr.ventas_brutas),
          cogs:     acc.cogs     + Number(curr.cogs),
          gastos:   acc.gastos   + Number(curr.gastos_operativos),
          mermas:   acc.mermas   + Number(curr.mermas),
          utilidad: acc.utilidad + Number(curr.utilidad_neta),
        }),
        { ventas: 0, cogs: 0, gastos: 0, mermas: 0, utilidad: 0 },
      ),
    [data],
  );

  const handleSedeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSedeId(e.target.value === 'ALL' ? null : e.target.value);
  }, []);

  // Si el usuario no tiene permiso de ver métricas del dashboard general, mostrar el Hub de Trabajo
  if (!hasDashboard) {
    const modulesAvailable = [
      { id: 'pos', name: 'Punto de Venta (POS)', desc: 'Facturación y ventas en vivo.', icon: ShoppingCart, href: '/dashboard/ventas' },
      { id: 'caja', altId: 'finanzas', name: 'Cierre de Caja', desc: 'Arqueos y cuadres diarios.', icon: Receipt, href: '/dashboard/caja' },
      { id: 'inventario', name: 'Inventario & Recetas', desc: 'Existencias y catálogo de productos.', icon: Store, href: '/dashboard/inventario' },
      { id: 'compras', name: 'Compras & Gastos', desc: 'Registro de compras y facturas de insumos.', icon: ShoppingCart, href: '/dashboard/compras' },
      { id: 'reportes', name: 'Informes & Reportes', desc: 'Historiales y reportes del negocio.', icon: FileOutput, href: '/dashboard/informes' },
      { id: 'clientes', name: 'Directorio de Clientes', desc: 'Gestión de clientes y contactos.', icon: Store, href: '/dashboard/clientes' },
      { id: 'creditos', name: 'Créditos & Cobranzas', desc: 'Cuentas por cobrar y abonos.', icon: Receipt, href: '/dashboard/creditos' },
      { id: 'equipo', altId: 'usuarios', name: 'Equipo de Trabajo', desc: 'Gestión de colaboradores y accesos.', icon: Store, href: '/dashboard/equipo' },
    ].filter(m => permisos.includes(m.id) || (m.altId && permisos.includes(m.altId)));

    return (
      <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
        <div className="bg-neutral-900 border border-neutral-800 p-6 sm:p-8 rounded-2xl space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">Panel de Operaciones</h1>
          <p className="text-sm text-neutral-400">
            Bienvenido a Niteo. Selecciona uno de tus módulos activos para comenzar:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modulesAvailable.length > 0 ? (
            modulesAvailable.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className="bg-neutral-900 hover:bg-neutral-800/80 border border-neutral-800 hover:border-indigo-500/40 p-5 rounded-2xl flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                      <Icon size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white group-hover:text-indigo-300 transition-colors text-base">{mod.name}</h3>
                      <p className="text-xs text-neutral-500 mt-0.5">{mod.desc}</p>
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="col-span-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center text-neutral-500">
              <AlertCircle size={36} className="mx-auto mb-2 text-neutral-600" />
              <p className="text-sm font-medium text-neutral-400">Sin módulos asignados</p>
              <p className="text-xs text-neutral-600 mt-1">Tu usuario aún no tiene módulos asignados por el administrador.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* HEADER & FILTROS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Resumen de la Empresa</h1>
          <p className="text-gray-500">Rentabilidad Neta y Desempeño Operativo</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {sedes.length > 0 && (
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
              <Store size={18} className="text-indigo-400 ml-2" />
              <select
                value={sedeId ?? 'ALL'}
                onChange={handleSedeChange}
                className="bg-transparent border-none text-sm font-semibold focus:ring-0 text-gray-700 dark:text-gray-300 pr-8 cursor-pointer outline-none"
              >
                <option value="ALL" className="bg-neutral-900 text-white">Todas las Sedes</option>
                {sedes.map(s => (
                  <option key={s.id} value={s.id} className="bg-neutral-900 text-white">{s.nombre}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
            <Calendar size={18} className="text-gray-400 ml-2" />
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="bg-transparent border-none text-sm font-semibold focus:ring-0 text-gray-700 dark:text-gray-300 pr-8 cursor-pointer outline-none"
            >
              <option value="today"     className="bg-neutral-900 text-white">Hoy</option>
              <option value="7days"     className="bg-neutral-900 text-white">Últimos 7 Días</option>
              <option value="thisMonth" className="bg-neutral-900 text-white">Este Mes (MTD)</option>
              <option value="lastMonth" className="bg-neutral-900 text-white">Mes Anterior</option>
            </select>
          </div>
          <button
            onClick={() => setShowExport(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <FileOutput size={16} /> Exportar
          </button>
        </div>
      </div>

      {showExport && (
        <ReportPreviewModal
          data={data}
          kpis={kpis}
          range={range}
          onClose={() => setShowExport(false)}
        />
      )}

      {/* ERROR STATE */}
      {error && !isLoading && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
          <AlertCircle size={20} />
          <span className="text-sm font-medium">Error cargando datos: {error}</span>
          <button onClick={refetch} className="ml-auto text-sm underline font-semibold">Reintentar</button>
        </div>
      )}

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
      ) : (
        <>
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Ventas */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
              <div className="bg-green-100 text-green-600 p-3 rounded-xl"><DollarSign size={24} /></div>
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase">Ventas Brutas</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">{formatCurrency(kpis.ventas)}</h3>
              </div>
            </div>

            {/* COGS + Mermas */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
              <div className="bg-orange-100 text-orange-600 p-3 rounded-xl"><ShoppingCart size={24} /></div>
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase">Costo Insumos (COGS)</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">{formatCurrency(kpis.cogs + kpis.mermas)}</h3>
              </div>
            </div>

            {/* Gastos Operativos */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
              <div className="bg-purple-100 text-purple-600 p-3 rounded-xl"><Receipt size={24} /></div>
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase">Gastos Operativos</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">{formatCurrency(kpis.gastos)}</h3>
              </div>
            </div>

            {/* Utilidad Neta */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
              <div className={`${kpis.utilidad >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'} p-3 rounded-xl`}>
                {kpis.utilidad >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase">Utilidad Neta</p>
                <h3 className={`text-2xl font-black ${kpis.utilidad >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                  {formatCurrency(kpis.utilidad)}
                </h3>
              </div>
            </div>

          </div>

          {/* CHARTS & WIDGETS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <div className={`${hasPos ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800`}>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Análisis de Rentabilidad Diaria</h2>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="dia" stroke="#6b7280" tick={{ fontSize: 12 }} tickFormatter={(val) => val && typeof val === 'string' && val.includes('-') ? val.split('-').slice(1).join('/') : val} />
                    <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} tickFormatter={(val) => `$${val / 1000}k`} />
                    <Tooltip
                      formatter={(value: any) => [formatCurrency(Number(value)), '']}
                      labelFormatter={(label) => `Fecha: ${label}`}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="cogs" name="COGS (Insumos)" stackId="a" fill="#f97316" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="mermas" name="Mermas" stackId="a" fill="#ef4444" />
                    <Bar dataKey="gastos_operativos" name="Gastos Opex" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="ventas_brutas" name="Ventas Brutas" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="utilidad_neta" name="Utilidad Neta" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {hasPos && (
              <div className="lg:col-span-1 h-[480px]">
                <RecentSalesWidget />
              </div>
            )}

          </div>

          {/* DATA TABLE / LIST */}
          <div className="bg-white dark:bg-neutral-900 p-4 md:p-6 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-800 overflow-hidden">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Desglose por Día</h2>

            {/* VISTA MÓVIL (Tarjetas) */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {data.map((row: any, i: number) => (
                <div key={i} className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 border border-neutral-100 dark:border-neutral-800">
                  <div className="flex justify-between items-center mb-3 pb-3 border-b border-neutral-200 dark:border-neutral-700/50">
                    <span className="font-bold text-neutral-900 dark:text-white">{row.dia}</span>
                    <span className={`font-black ${row.utilidad_neta >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                      {formatCurrency(row.utilidad_neta)} Neta
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-neutral-500 dark:text-neutral-400 text-xs uppercase mb-1">Ventas</p>
                      <p className="text-green-600 font-bold">{formatCurrency(row.ventas_brutas)}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500 dark:text-neutral-400 text-xs uppercase mb-1">COGS</p>
                      <p className="text-orange-500 font-medium">{formatCurrency(row.cogs)}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500 dark:text-neutral-400 text-xs uppercase mb-1">Mermas</p>
                      <p className="text-red-500 font-medium">{formatCurrency(row.mermas)}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500 dark:text-neutral-400 text-xs uppercase mb-1">Gastos</p>
                      <p className="text-purple-500 font-medium">{formatCurrency(row.gastos_operativos)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* VISTA DESKTOP (Tabla) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 rounded-tl-lg">Día</th>
                    <th className="px-6 py-3">Ventas</th>
                    <th className="px-6 py-3">COGS</th>
                    <th className="px-6 py-3">Mermas</th>
                    <th className="px-6 py-3">Gastos</th>
                    <th className="px-6 py-3 rounded-tr-lg">Neta</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{row.dia}</td>
                      <td className="px-6 py-4 text-green-600 font-bold">{formatCurrency(row.ventas_brutas)}</td>
                      <td className="px-6 py-4 text-orange-500">{formatCurrency(row.cogs)}</td>
                      <td className="px-6 py-4 text-red-500">{formatCurrency(row.mermas)}</td>
                      <td className="px-6 py-4 text-purple-500">{formatCurrency(row.gastos_operativos)}</td>
                      <td className={`px-6 py-4 font-black ${row.utilidad_neta >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                        {formatCurrency(row.utilidad_neta)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </>
      )}
    </div>
  );
}
