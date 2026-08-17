'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const paymentData = [
  { name: 'Zelle', value: 40, color: '#6366f1' }, // Indigo-500
  { name: 'Efectivo USD', value: 30, color: '#10b981' }, // Emerald-500
  { name: 'Punto de Venta', value: 20, color: '#3b82f6' }, // Blue-500
  { name: 'Pago Móvil', value: 10, color: '#a855f7' }, // Purple-500
];

const productData = [
  { name: 'Hamburguesa Peluche', ventas: 120 },
  { name: 'Perro Caliente', ventas: 85 },
  { name: 'Refresco 2L', ventas: 60 },
  { name: 'Ración Papas', ventas: 45 },
  { name: 'Tequeños', ventas: 30 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg shadow-xl">
        <p className="text-white font-medium mb-1">{label || payload[0].name}</p>
        <p className="text-neutral-400 text-sm">
          Valor: <span className="text-white font-medium">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function AnalyticsCharts() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8">
      
      {/* Gráfico de Pastel: Pagos */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-medium text-white mb-6">Ventas por Método de Pago</h2>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={paymentData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {paymentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Leyenda personalizada */}
        <div className="flex flex-wrap justify-center gap-4 mt-2">
          {paymentData.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-neutral-400 font-medium">{item.name} ({item.value}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico de Barras: Productos */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-medium text-white mb-6">Top 5 Productos Más Vendidos</h2>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={productData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#737373', fontSize: 11 }} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                tick={{ fill: '#737373', fontSize: 11 }} 
                tickLine={false} 
                axisLine={false} 
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#262626', opacity: 0.4 }} />
              <Bar 
                dataKey="ventas" 
                fill="#6366f1" 
                radius={[4, 4, 0, 0]} 
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
    </div>
  );
}
