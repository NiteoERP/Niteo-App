'use client';
import React from 'react';
import { useEmpresa } from '@/components/providers/EmpresaProvider';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line
} from 'recharts';

export default function DashboardChart({ data }: { data: any[] }) {
  const { formatCurrency } = useEmpresa();
  
  return (
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
  );
}
