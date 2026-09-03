import React from 'react';
import { BookOpen, PieChart, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function ContabilidadDashboard() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Contabilidad Automatizada</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/dashboard/contabilidad/libro-mayor">
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-100 flex items-center gap-4">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-lg">
              <BookOpen size={32} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Libro Mayor</h2>
              <p className="text-gray-500 text-sm">Consulta los movimientos de cada cuenta contable en detalle.</p>
            </div>
          </div>
        </Link>
        
        <Link href="/dashboard/contabilidad/estado-resultados">
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-100 flex items-center gap-4">
            <div className="p-4 bg-green-50 text-green-600 rounded-lg">
              <TrendingUp size={32} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Estado de Resultados</h2>
              <p className="text-gray-500 text-sm">Visualiza ingresos, costos y gastos en un periodo determinado.</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-medium text-gray-700 flex items-center gap-2 mb-2">
          <PieChart size={20} className="text-gray-500" />
          Módulo Activo
        </h3>
        <p className="text-gray-600 text-sm">
          Los asientos contables se generan automáticamente (partida doble) al registrar ventas en el POS, compras de insumos, y abonos de clientes.
        </p>
      </div>
    </div>
  );
}
