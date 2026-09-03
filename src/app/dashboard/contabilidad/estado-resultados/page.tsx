import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { getEstadoResultados } from '@/actions/contabilidad-actions';

export default async function EstadoResultadosPage(props: { searchParams: Promise<{ inicio?: string, fin?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>No autorizado</div>;

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return <div>Perfil no encontrado</div>;

  const inicio = searchParams.inicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const fin = searchParams.fin || new Date().toISOString().split('T')[0];

  const { ingresos, costos, gastos, utilidad, detalles } = await getEstadoResultados(profile.empresa_id, inicio, fin);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Estado de Resultados</h1>
      
      <form className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 mb-6 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
          <input type="date" name="inicio" defaultValue={inicio} className="border-gray-300 rounded-md shadow-sm p-2 bg-gray-50 border" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
          <input type="date" name="fin" defaultValue={fin} className="border-gray-300 rounded-md shadow-sm p-2 bg-gray-50 border" />
        </div>
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-green-700">
          Calcular
        </button>
      </form>

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
          <span className="text-lg font-bold text-gray-900">{(ingresos - costos).toFixed(2)}</span>
        </div>

        <div className="flex justify-between items-center border-b pb-4">
          <h2 className="text-xl font-medium text-gray-700">Gastos</h2>
          <span className="text-xl font-bold text-gray-900">{gastos.toFixed(2)}</span>
        </div>

        <div className={`flex justify-between items-center p-4 rounded-lg ${utilidad >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
          <h2 className={`text-2xl font-bold ${utilidad >= 0 ? 'text-green-800' : 'text-red-800'}`}>
            {utilidad >= 0 ? 'Utilidad Neta' : 'Pérdida Neta'}
          </h2>
          <span className={`text-2xl font-bold ${utilidad >= 0 ? 'text-green-800' : 'text-red-800'}`}>
            {utilidad.toFixed(2)}
          </span>
        </div>

      </div>
    </div>
  );
}
