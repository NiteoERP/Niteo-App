import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Users, Search, Mail, Phone, MapPin } from 'lucide-react';

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const empresaId = user.app_metadata?.empresa_id;
  
  if (!empresaId) {
    return <div className="p-8 text-rose-400">Error: No tienes empresa configurada.</div>;
  }

  // Fetch customers
  const { data: clientes, error } = await supabase
    .from('pos_clientes')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('nombre', { ascending: true })
    .limit(100);

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-300">
      <div className="border-b border-neutral-800 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="text-indigo-500" />
            Directorio de Clientes
          </h1>
          <p className="text-neutral-400 mt-1">
            Visualiza todos los clientes sincronizados desde tu caja Aronium.
          </p>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-neutral-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar cliente (Deshabilitado en esta vista beta)..." 
              disabled
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white outline-none opacity-50 cursor-not-allowed"
            />
          </div>
          <span className="text-sm font-medium text-neutral-400">
            {clientes?.length || 0} Registros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-950/50 text-neutral-500 font-medium border-b border-neutral-800">
              <tr>
                <th className="px-6 py-4">Nombre / Empresa</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4">Sincronizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {error && (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-rose-400">Error al cargar clientes: {error.message}</td></tr>
              )}
              {!error && (!clientes || clientes.length === 0) && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-neutral-500">
                    <Users size={32} className="mx-auto mb-3 opacity-20" />
                    <p>No hay clientes sincronizados.</p>
                    <p className="text-xs mt-1">Los clientes creados en Aronium aparecerán aquí.</p>
                  </td>
                </tr>
              )}
              {clientes && clientes.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-white">{cliente.nombre}</div>
                    {cliente.identificacion && <div className="text-xs text-neutral-500 mt-0.5">ID/RUT: {cliente.identificacion}</div>}
                  </td>
                  <td className="px-6 py-4 space-y-1">
                    {cliente.email && (
                      <div className="flex items-center gap-2 text-neutral-400 text-xs">
                        <Mail size={12} /> {cliente.email}
                      </div>
                    )}
                    {cliente.telefono && (
                      <div className="flex items-center gap-2 text-neutral-400 text-xs">
                        <Phone size={12} /> {cliente.telefono}
                      </div>
                    )}
                    {cliente.direccion && (
                      <div className="flex items-center gap-2 text-neutral-500 text-xs">
                        <MapPin size={12} /> {cliente.direccion}
                      </div>
                    )}
                    {!cliente.email && !cliente.telefono && !cliente.direccion && <span className="text-neutral-600 italic text-xs">Sin datos de contacto</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-neutral-500">
                      {new Date(cliente.creado_en).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
