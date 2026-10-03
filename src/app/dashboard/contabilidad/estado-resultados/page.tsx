'use client';

import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import NiteoDateRangePicker from '@/components/ui/NiteoDateRangePicker';
import { getEstadoResultados, getEmpresaIdActual } from '@/actions/contabilidad-actions';

export default function EstadoResultadosPage() {
  const today = new Date();
  const [fechaInicio, setFechaInicio] = useState<string>(
    format(startOfMonth(today), 'yyyy-MM-dd')
  );
  const [fechaFin, setFechaFin] = useState<string>(
    format(endOfMonth(today), 'yyyy-MM-dd')
  );
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    ingresos: number;
    costos: number;
    gastos: number;
    utilidad: number;
    detalles: any[];
  }>({ ingresos: 0, costos: 0, gastos: 0, utilidad: 0, detalles: [] });
  const [loading, setLoading] = useState(true);

  // Obtener empresaId al montar
  useEffect(() => {
    getEmpresaIdActual().then((id) => {
      setEmpresaId(id);
    });
  }, []);

  // Cargar datos cuando cambian fechas o empresaId
  useEffect(() => {
    if (!empresaId) return;
    setLoading(true);
    getEstadoResultados(empresaId, fechaInicio, fechaFin).then((data) => {
      setResultado(data);
      setLoading(false);
    });
  }, [empresaId, fechaInicio, fechaFin]);

  const { ingresos, costos, gastos, utilidad } = resultado;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Estado de Resultados</h1>

      {/* Filtro de período */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 mb-6 items-end">
        <NiteoDateRangePicker
          label="Período"
          startDate={fechaInicio}
          endDate={fechaFin}
          onChange={(start, end) => {
            if (start) setFechaInicio(start);
            if (end) setFechaFin(end);
          }}
        />
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center text-gray-400">
          Cargando…
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <h2 className="text-xl font-medium text-gray-700">Ingresos</h2>
            <span className="text-xl font-bold text-gray-900">{ingresos.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center border-b pb-4">
            <h2 className="text-xl font-medium text-gray-700">Costos Operacionales</h2>
            <span className="text-xl font-bold text-gray-900">{costos.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center border-b pb-4 bg-gray-50 p-2 rounded">
            <h2 className="text-lg font-bold text-gray-800">Utilidad Bruta</h2>
            <span className="text-lg font-bold text-gray-900">
              {(ingresos - costos).toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center border-b pb-4">
            <h2 className="text-xl font-medium text-gray-700">Gastos</h2>
            <span className="text-xl font-bold text-gray-900">{gastos.toFixed(2)}</span>
          </div>

          <div
            className={`flex justify-between items-center p-4 rounded-lg ${
              utilidad >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}
          >
            <h2
              className={`text-2xl font-bold ${
                utilidad >= 0 ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {utilidad >= 0 ? 'Utilidad Neta' : 'Pérdida Neta'}
            </h2>
            <span
              className={`text-2xl font-bold ${
                utilidad >= 0 ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {utilidad.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
