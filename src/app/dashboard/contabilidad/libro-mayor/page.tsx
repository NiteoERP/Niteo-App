'use client';

import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import NiteoDateRangePicker from '@/components/ui/NiteoDateRangePicker';
import {
  getCuentasContables,
  getLibroMayor,
  getEmpresaIdActual,
} from '@/actions/contabilidad-actions';

export default function LibroMayorPage() {
  const today = new Date();
  const [fechaInicio, setFechaInicio] = useState<string>(
    format(startOfMonth(today), 'yyyy-MM-dd')
  );
  const [fechaFin, setFechaFin] = useState<string>(
    format(endOfMonth(today), 'yyyy-MM-dd')
  );
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<string>('');
  const [cuentas, setCuentas] = useState<{ id: string; codigo: string; nombre: string }[]>([]);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  // Obtener empresaId al montar
  useEffect(() => {
    getEmpresaIdActual().then((id) => {
      setEmpresaId(id);
    });
  }, []);

  // Cargar cuentas contables cuando se tiene empresaId
  useEffect(() => {
    if (!empresaId) return;
    getCuentasContables(empresaId).then((data) => setCuentas(data));
  }, [empresaId]);

  // Cargar movimientos cuando cambian fechas, cuenta o empresaId
  useEffect(() => {
    if (!empresaId) return;
    setLoading(true);
    getLibroMayor(
      empresaId,
      cuentaSeleccionada || null,
      fechaInicio,
      fechaFin
    ).then((data) => {
      setMovimientos(data);
      setLoading(false);
    });
  }, [empresaId, fechaInicio, fechaFin, cuentaSeleccionada]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Libro Mayor</h1>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 mb-6 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cuenta Contable
          </label>
          <select
            value={cuentaSeleccionada}
            onChange={(e) => setCuentaSeleccionada(e.target.value)}
            className="border-gray-300 rounded-md shadow-sm p-2 bg-gray-50 border"
          >
            <option value="">Todas las cuentas</option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} - {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
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
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cuenta
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Concepto
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Debe
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Haber
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                  Cargando…
                </td>
              </tr>
            ) : (
              <>
                {movimientos.map((m: any, i: number) => {
                  const debe = Number(m.debe);
                  const haber = Number(m.haber);
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(m.contabilidad_asientos?.fecha).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {m.contabilidad_cuentas?.codigo} - {m.contabilidad_cuentas?.nombre}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {m.contabilidad_asientos?.concepto}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {debe > 0 ? debe.toFixed(2) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {haber > 0 ? haber.toFixed(2) : '-'}
                      </td>
                    </tr>
                  );
                })}
                {movimientos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No hay movimientos para estos filtros.
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
