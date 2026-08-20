'use client';

import React, { useState, useEffect } from 'react';
import { getDashboardData, getSedes } from '@/actions/dashboard-actions';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Receipt, Loader2, Calendar, Store } from 'lucide-react';
import RecentSalesWidget from '@/components/pos/RecentSalesWidget';

export default function DashboardPage() {
  const [range, setRange] = useState('thisMonth');
  const [sedeId, setSedeId] = useState('ALL');
  const [sedes, setSedes] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const s = await getSedes();
        setSedes(s);
      } catch (err) { console.error(err); }
    };
    fetchInit();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const targetSede = sedeId === 'ALL' ? null : sedeId;
        const res = await getDashboardData(range, targetSede);
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [range, sedeId]);

  // Consolidar Totales para las Cards
  const kpis = data.reduce((acc, curr) => ({
    ventas: acc.ventas + Number(curr.ventas_brutas),
    cogs: acc.cogs + Number(curr.cogs),
    gastos: acc.gastos + Number(curr.gastos_operativos),
    mermas: acc.mermas + Number(curr.mermas),
    utilidad: acc.utilidad + Number(curr.utilidad_neta)
  }), { ventas: 0, cogs: 0, gastos: 0, mermas: 0, utilidad: 0 });

  const formatMoney = (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* HEADER & FILTROS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Company Highlights</h1>
          <p className="text-gray-500">Rentabilidad Neta y Desempeño Operativo</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {sedes.length > 0 && (
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
              <Store size={18} className="text-indigo-400 ml-2" />
              <select 
                value={sedeId} 
                onChange={(e) => setSedeId(e.target.value)}
                className="bg-transparent border-none text-sm font-semibold focus:ring-0 text-gray-700 dark:text-gray-300 pr-8 cursor-pointer outline-none"
              >
                <option value="ALL">Todas las Sedes</option>
                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
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
              <option value="today">Hoy</option>
              <option value="7days">Últimos 7 Días</option>
              <option value="thisMonth">Este Mes (MTD)</option>
              <option value="lastMonth">Mes Anterior</option>
            </select>
          </div>
        </div>
      </div>

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
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">{formatMoney(kpis.ventas)}</h3>
              </div>
            </div>

            {/* COGS + Mermas */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
              <div className="bg-orange-100 text-orange-600 p-3 rounded-xl"><ShoppingCart size={24} /></div>
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase">Costo Insumos (COGS)</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">{formatMoney(kpis.cogs + kpis.mermas)}</h3>
              </div>
            </div>

            {/* Gastos Operativos */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
              <div className="bg-purple-100 text-purple-600 p-3 rounded-xl"><Receipt size={24} /></div>
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase">Gastos Operativos</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">{formatMoney(kpis.gastos)}</h3>
              </div>
            </div>

            {/* Utilidad Neta */}
            <div className={`bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4`}>
              <div className={`${kpis.utilidad >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'} p-3 rounded-xl`}>
                {kpis.utilidad >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase">Utilidad Neta</p>
                <h3 className={`text-2xl font-black ${kpis.utilidad >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                  {formatMoney(kpis.utilidad)}
                </h3>
              </div>
            </div>

          </div>

          {/* CHARTS & WIDGETS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Análisis de Rentabilidad Diaria</h2>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="dia" stroke="#6b7280" tick={{fontSize: 12}} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                    <YAxis stroke="#6b7280" tick={{fontSize: 12}} tickFormatter={(val) => `$${val/1000}k`} />
                    <Tooltip 
                      formatter={(value: any) => [formatMoney(Number(value)), '']}
                      labelFormatter={(label) => `Fecha: ${label}`}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    
                    {/* Barras de Egresos Apilados */}
                    <Bar dataKey="cogs" name="COGS (Insumos)" stackId="a" fill="#f97316" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="mermas" name="Mermas" stackId="a" fill="#ef4444" />
                    <Bar dataKey="gastos_operativos" name="Gastos Opex" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    
                    {/* Línea de Ventas Brutas y Utilidad */}
                    <Line type="monotone" dataKey="ventas_brutas" name="Ventas Brutas" stroke="#22c55e" strokeWidth={3} dot={{r:4}} />
                    <Line type="monotone" dataKey="utilidad_neta" name="Utilidad Neta" stroke="#3b82f6" strokeWidth={3} dot={{r:4}} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-1 h-[480px]">
              <RecentSalesWidget />
            </div>

          </div>
          
          {/* DATA TABLE */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Desglose por Día</h2>
            <div className="overflow-x-auto">
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
                  {data.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{row.dia}</td>
                      <td className="px-6 py-4 text-green-600 font-bold">{formatMoney(row.ventas_brutas)}</td>
                      <td className="px-6 py-4 text-orange-500">{formatMoney(row.cogs)}</td>
                      <td className="px-6 py-4 text-red-500">{formatMoney(row.mermas)}</td>
                      <td className="px-6 py-4 text-purple-500">{formatMoney(row.gastos_operativos)}</td>
                      <td className={`px-6 py-4 font-black ${row.utilidad_neta >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                        {formatMoney(row.utilidad_neta)}
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
