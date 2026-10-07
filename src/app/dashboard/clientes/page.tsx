import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Users } from 'lucide-react';
import DirectorioClientes from './DirectorioClientes';

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  const empresaId = user.app_metadata?.empresa_id || perfil?.empresa_id;
  
  if (!empresaId) {
    return <div className="p-8 text-rose-400">Error: No tienes empresa configurada.</div>;
  }

  const { data: clientesRaw, error } = await supabase
    .from('clientes')
    .select(`
      id, 
      nombre, 
      rif_cedula, 
      telefono, 
      email,
      ventas_facturas ( id, total, fecha_venta, numero_documento, sedes(nombre) )
    `)
    .eq('empresa_id', empresaId)
    .order('nombre', { ascending: true });

  if (error) {
    return <div className="p-8 text-rose-400">Error al cargar clientes: {error.message}</div>;
  }

  const clientes = (clientesRaw || []).filter(c => 
    c.nombre !== 'Consumidor Final' && 
    ((c.rif_cedula && c.rif_cedula.trim() !== '') || (c.telefono && c.telefono.trim() !== ''))
  ).map(c => {
    const ventas = c.ventas_facturas || [];
    const numPedidos = ventas.length;
    const totalGastado = ventas.reduce((acc: number, v: any) => acc + Number(v.total || 0), 0);
    const ticketPromedio = numPedidos > 0 ? totalGastado / numPedidos : 0;
    
    const sedesCounter: Record<string, number> = {};
    ventas.forEach((v: any) => {
      const s = v.sedes?.nombre || 'Desconocida';
      sedesCounter[s] = (sedesCounter[s] || 0) + 1;
    });
    
    let maxSede = 0;
    let sedeFrecuente = 'N/A';
    for (const [s, count] of Object.entries(sedesCounter)) {
      if (count > maxSede) {
        maxSede = count;
        sedeFrecuente = s;
      }
    }

    const historial = ventas.sort((a: any, b: any) => new Date(b.fecha_venta).getTime() - new Date(a.fecha_venta).getTime());

    return {
      id: c.id,
      nombre: c.nombre,
      rif_cedula: c.rif_cedula,
      telefono: c.telefono,
      email: c.email,
      numPedidos,
      totalGastado,
      ticketPromedio,
      sedeFrecuente,
      historial
    };
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-300">
      <div className="border-b border-neutral-800 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Users className="text-indigo-500" size={24} />
            Directorio de Clientes
          </h1>
          <p className="text-neutral-400 text-xs md:text-sm mt-1">
            Visualiza tus clientes registrados, su historial de pedidos y su ticket promedio.
          </p>
        </div>
      </div>

      <DirectorioClientes clientes={clientes} />
    </div>
  );
}