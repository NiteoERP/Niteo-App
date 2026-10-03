import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { Truck, MapPin, DollarSign, Calendar } from 'lucide-react';

export const metadata = {
  title: 'Reporte de Deliveries | Niteo',
};

export default async function AdminDeliveryPage() {
  const supabase = await createClient();
  
  // 1. Obtener Empresa ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>No autorizado</div>;

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!perfil) return <div>Perfil no encontrado</div>;

  // 2. Traer el historial de entregas con nombre del repartidor y sede
  const { data: entregas, error } = await supabase
    .from('ventas_facturas')
    .select(`
      id, 
      numero_orden, 
      numero_documento,
      pago_repartidor, 
      fecha_registro_real,
      repartidor:perfiles!ventas_facturas_repartidor_id_fkey(nombre_completo),
      sede:sedes!ventas_facturas_sede_id_fkey(nombre_sede)
    `)
    .eq('empresa_id', perfil.empresa_id)
    .eq('estado_delivery', 'ENTREGADO')
    .order('fecha_registro_real', { ascending: false })
    .limit(100); // Para este MVP, traemos los últimos 100

  if (error) {
    console.error(error);
    return <div>Error cargando datos: {error.message}</div>;
  }

  // 3. Procesar datos para los "Widgets" superiores
  const totalPagado = entregas?.reduce((acc: number, curr: any) => acc + Number(curr.pago_repartidor || 0), 0) || 0;
  const totalEntregas = entregas?.length || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Truck className="text-blue-600" size={32} />
            Reporte de Repartidores
          </h1>
          <p className="text-gray-500 mt-1">Historial general de comandas entregadas por sede</p>
        </div>
      </div>

      {/* WIDGETS DE RESUMEN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-100 p-4 rounded-xl text-blue-600"><Truck size={24} /></div>
          <div>
            <p className="text-gray-500 text-sm font-semibold uppercase">Total Entregas</p>
            <p className="text-2xl font-bold text-gray-900">{totalEntregas}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-green-100 p-4 rounded-xl text-green-600"><DollarSign size={24} /></div>
          <div>
            <p className="text-gray-500 text-sm font-semibold uppercase">Total a Pagar</p>
            <p className="text-2xl font-bold text-gray-900">${totalPagado.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* TABLA DE HISTORIAL */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h2 className="font-bold text-gray-800">Últimas 100 Entregas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase text-gray-500 bg-gray-50">
                <th className="p-4 font-semibold">Repartidor</th>
                <th className="p-4 font-semibold">Sede</th>
                <th className="p-4 font-semibold">Orden</th>
                <th className="p-4 font-semibold">Fecha y Hora</th>
                <th className="p-4 font-semibold text-right">Pago Generado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entregas?.map((entrega: any) => (
                <tr key={entrega.id} className="hover:bg-gray-50/50 transition">
                  <td className="p-4 font-semibold text-gray-800">
                    {/* Soporte para arrays si Supabase devuelve un array en el JOIN */}
                    {Array.isArray(entrega.repartidor) ? entrega.repartidor[0]?.nombre_completo : (entrega.repartidor as any)?.nombre_completo}
                  </td>
                  <td className="p-4 text-gray-600 flex items-center gap-2">
                    <MapPin size={16} className="text-gray-400" />
                    {Array.isArray(entrega.sede) ? entrega.sede[0]?.nombre_sede : (entrega.sede as any)?.nombre_sede || 'Sede Principal'}
                  </td>
                  <td className="p-4 text-gray-500 font-mono text-sm">
                    #{entrega.numero_orden || entrega.numero_documento}
                  </td>
                  <td className="p-4 text-gray-500 text-sm">
                    {new Date(entrega.fecha_registro_real).toLocaleString('es-VE')}
                  </td>
                  <td className="p-4 font-bold text-green-600 text-right">
                    ${Number(entrega.pago_repartidor || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
              
              {(!entregas || entregas.length === 0) && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    No hay deliveries reclamados aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
