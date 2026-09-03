import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { getCuentasContables, getLibroMayor } from '@/actions/contabilidad-actions';

export default async function LibroMayorPage(props: { searchParams: Promise<{ cuenta?: string, inicio?: string, fin?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>No autorizado</div>;

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return <div>Perfil no encontrado</div>;

  const cuentas = await getCuentasContables(profile.empresa_id);
  
  const cuentaSeleccionada = searchParams.cuenta || null;
  const inicio = searchParams.inicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const fin = searchParams.fin || new Date().toISOString().split('T')[0];

  const movimientos = await getLibroMayor(profile.empresa_id, cuentaSeleccionada, inicio, fin);

  let saldoAcumulado = 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Libro Mayor</h1>
      
      <form className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 mb-6 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta Contable</label>
          <select name="cuenta" defaultValue={cuentaSeleccionada || ''} className="border-gray-300 rounded-md shadow-sm p-2 bg-gray-50 border">
            <option value="">Todas las cuentas</option>
            {cuentas.map(c => (
              <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
          <input type="date" name="inicio" defaultValue={inicio} className="border-gray-300 rounded-md shadow-sm p-2 bg-gray-50 border" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
          <input type="date" name="fin" defaultValue={fin} className="border-gray-300 rounded-md shadow-sm p-2 bg-gray-50 border" />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-700">
          Filtrar
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cuenta</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concepto</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debe</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Haber</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
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
              )
            })}
            {movimientos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No hay movimientos para estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
