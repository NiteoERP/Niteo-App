import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { ShieldAlert, Clock, Database, Plus, Edit2, Trash2, ChevronRight, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default async function AuditoriaPage() {
  const supabase = await createClient();

  // Obtener los últimos 50 registros de auditoría
  const { data: logs, error } = await supabase
    .from('auditoria_logs')
    .select(`
      id,
      accion,
      tabla_afectada,
      creado_en,
      datos_anteriores,
      datos_nuevos,
      usuario_id,
      perfiles (nombre_completo, rol)
    `)
    .order('creado_en', { ascending: false })
    .limit(50);

  // Helper para el color y el icono del badge según la acción
  const getActionBadge = (accion: string) => {
    switch (accion) {
      case 'INSERT':
        return <span className="flex items-center gap-1.5 text-emerald-400 font-semibold"><Plus size={16} /> Creado</span>;
      case 'UPDATE':
        return <span className="flex items-center gap-1.5 text-blue-400 font-semibold"><Edit2 size={16} /> Editado</span>;
      case 'DELETE':
        return <span className="flex items-center gap-1.5 text-rose-400 font-semibold"><Trash2 size={16} /> Borrado</span>;
      default:
        return <span className="text-neutral-400 font-medium">{accion}</span>;
    }
  };

  const getFriendlyTableName = (table: string) => {
    const map: Record<string, string> = {
      'productos': 'Productos',
      'inventario_insumos': 'Inventario',
      'compras_puntuales': 'Compras y Gastos',
      'perfiles': 'Usuarios',
      'sedes': 'Sucursales',
      'recetas': 'Recetas / Escandallos',
      'despachos': 'Despachos',
      'despachos_items': 'Ítems de Despacho',
    };
    return map[table] || table;
  };

  const getFriendlyDescription = (log: any) => {
    const data = log.datos_nuevos || log.datos_anteriores || {};
    let identifier = data.nombre || data.nombre_producto || data.proveedor || data.nombre_comercial || data.nombre_completo || data.nombre_sede || data.detalles || (data.id ? `#${data.id.toString().substring(0,6)}` : 'Registro');

    if (log.tabla_afectada === 'inventario_insumos' && log.accion === 'UPDATE') {
       const oldQ = log.datos_anteriores?.cantidad_actual;
       const newQ = log.datos_nuevos?.cantidad_actual;
       if (oldQ !== newQ) {
          return `Actualizó el stock de '${identifier}': de ${oldQ} a ${newQ}`;
       }
    }

    if (log.tabla_afectada === 'compras_puntuales' && log.accion === 'INSERT') {
       return `Registró una compra de ${data.monto_divisas}$ a '${identifier}'`;
    }

    switch(log.accion) {
      case 'INSERT': return `Creó un nuevo registro en ${getFriendlyTableName(log.tabla_afectada)}: '${identifier}'`;
      case 'UPDATE': return `Modificó información de: '${identifier}'`;
      case 'DELETE': return `Eliminó definitivamente: '${identifier}'`;
      default: return `Interactuó con '${identifier}'`;
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
      
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShieldAlert className="text-indigo-500" />
            Registro de Auditoría
          </h1>
          <p className="text-neutral-400 mt-1">Historial detallado y fácil de leer sobre todo lo que ocurre en tu empresa.</p>
        </div>
      </div>

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400 font-medium">
              <tr>
                <th className="px-6 py-5">Cuándo y Quién</th>
                <th className="px-6 py-5">Módulo</th>
                <th className="px-6 py-5">¿Qué hizo exactamente?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {error && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-rose-400">Error al cargar registros: {error.message}</td>
                </tr>
              )}
              
              {!error && (!logs || logs.length === 0) && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-neutral-500">
                    <Database className="mx-auto mb-3 opacity-20" size={32} />
                    <p>No hay registros de auditoría todavía.</p>
                    <p className="text-xs mt-1">Los cambios aparecerán aquí automáticamente.</p>
                  </td>
                </tr>
              )}

              {logs?.map((log: any) => {
                const perfil = Array.isArray(log.perfiles) ? log.perfiles[0] : log.perfiles;
                return (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-white font-medium mb-1">
                      {perfil?.nombre_completo || 'Sistema / API'}
                    </div>
                    <div className="flex items-center gap-2 text-neutral-500 text-xs">
                      <Clock size={12} />
                      {format(new Date(log.creado_en), "d MMM yyyy, h:mm a", { locale: es })}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col items-start gap-1.5">
                      <span className="text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-md text-xs font-semibold">
                        {getFriendlyTableName(log.tabla_afectada)}
                      </span>
                      {getActionBadge(log.accion)}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-2">
                      <p className="text-neutral-200 font-medium flex items-center gap-2">
                        <Activity size={14} className="text-neutral-500" />
                        {getFriendlyDescription(log)}
                      </p>
                      <details className="group cursor-pointer">
                        <summary className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors inline-flex items-center gap-1 select-none">
                          <ChevronRight size={12} className="group-open:rotate-90 transition-transform" />
                          Ver detalles técnicos (JSON)
                        </summary>
                        <div className="mt-2 p-3 bg-black/60 border border-neutral-800 rounded-lg overflow-x-auto max-w-xl">
                          {log.accion === 'DELETE' && (
                            <pre className="text-[10px] text-rose-300/80 font-mono">
                              {JSON.stringify(log.datos_anteriores, null, 2)}
                            </pre>
                          )}
                          {log.accion === 'INSERT' && (
                            <pre className="text-[10px] text-emerald-300/80 font-mono">
                              {JSON.stringify(log.datos_nuevos, null, 2)}
                            </pre>
                          )}
                          {log.accion === 'UPDATE' && (
                            <div className="flex gap-4">
                              <pre className="text-[10px] text-neutral-400 font-mono flex-1 border-r border-neutral-800 pr-4">
                                {JSON.stringify(log.datos_anteriores, null, 2)}
                              </pre>
                              <pre className="text-[10px] text-blue-300/80 font-mono flex-1 pl-2">
                                {JSON.stringify(log.datos_nuevos, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
