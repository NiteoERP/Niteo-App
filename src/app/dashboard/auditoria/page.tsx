import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { ShieldAlert, Clock, Database, Plus, Edit2, Trash2 } from 'lucide-react';
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
      perfiles(nombre_completo, rol)
    `)
    .order('creado_en', { ascending: false })
    .limit(50);

  // Helper para el color y el icono del badge según la acción
  const getActionBadge = (accion: string) => {
    switch (accion) {
      case 'INSERT':
        return <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md text-xs font-semibold tracking-wider"><Plus size={14} /> CREADO</span>;
      case 'UPDATE':
        return <span className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-md text-xs font-semibold tracking-wider"><Edit2 size={14} /> EDITADO</span>;
      case 'DELETE':
        return <span className="flex items-center gap-1.5 bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-md text-xs font-semibold tracking-wider"><Trash2 size={14} /> BORRADO</span>;
      default:
        return <span className="bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded-md text-xs font-medium">{accion}</span>;
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
          <p className="text-neutral-400 mt-1">Historial inmutable de cambios en el sistema.</p>
        </div>
      </div>

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400 font-medium">
              <tr>
                <th className="px-6 py-4">Fecha y Hora</th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Módulo</th>
                <th className="px-6 py-4">Acción</th>
                <th className="px-6 py-4">Detalles (JSON)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {error && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-rose-400">Error al cargar registros: {error.message}</td>
                </tr>
              )}
              
              {!error && (!logs || logs.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
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
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-neutral-300">
                      <Clock size={14} className="text-neutral-500" />
                      {format(new Date(log.creado_en), "d MMM yyyy, h:mm a", { locale: es })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">{perfil?.nombre_completo || 'Sistema / API'}</p>
                    <p className="text-xs text-neutral-500">{perfil?.rol || log.usuario_id}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded font-mono text-xs">
                      {log.tabla_afectada}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {getActionBadge(log.accion)}
                  </td>
                  <td className="px-6 py-4">
                    <details className="group cursor-pointer">
                      <summary className="text-xs text-indigo-400 font-medium hover:text-indigo-300 transition-colors">
                        Ver datos
                      </summary>
                      <div className="mt-2 p-3 bg-black/50 border border-neutral-800 rounded-lg overflow-x-auto max-w-sm">
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
                            <pre className="text-[10px] text-neutral-400 font-mono flex-1">
                              {JSON.stringify(log.datos_anteriores, null, 2)}
                            </pre>
                            <pre className="text-[10px] text-blue-300/80 font-mono flex-1">
                              {JSON.stringify(log.datos_nuevos, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
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
