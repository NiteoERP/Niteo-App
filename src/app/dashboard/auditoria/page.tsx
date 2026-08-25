'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Search, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { getAuditoriaLogs } from '@/actions/auditoria-actions';

export default function AuditoriaPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async (pageNum = 1) => {
    setLoading(true);
    setErrorMsg('');
    const res = await getAuditoriaLogs(pageNum, 50);
    if (res.success) {
      setLogs(res.logs || []);
      setTotal(res.total || 0);
    } else {
      setErrorMsg(res.error || 'Error cargando auditor�a');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData(page);
  }, [page]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
            <Shield size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Registro de Auditor�a</h1>
            <p className="text-neutral-400 mt-1">Bit�cora inmutable de acciones cr�ticas (Solo MASTER)</p>
          </div>
        </div>
        <button 
          onClick={() => loadData(page)}
          className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 text-neutral-300 px-4 py-2 rounded-xl hover:bg-neutral-800 transition-colors"
        >
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          <p>{errorMsg} (Aseg�rate de ejecutar el script SQL en Supabase)</p>
        </div>
      )}

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-sm min-w-[900px]">
            <thead>
              <tr className="bg-black/40 border-b border-neutral-800 text-neutral-400">
                <th className="py-4 px-6 font-medium">Fecha y Hora</th>
                <th className="py-4 px-6 font-medium">Usuario / Perfil</th>
                <th className="py-4 px-6 font-medium">Acci�n</th>
                <th className="py-4 px-6 font-medium">Tabla / M�dulo</th>
                <th className="py-4 px-6 font-medium">ID Registro</th>
                <th className="py-4 px-6 font-medium text-right">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 className="animate-spin text-indigo-500 mx-auto" size={32} />
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-800/30 transition-colors">
                    <td className="py-4 px-6 text-neutral-300">
                      {new Date(log.fecha_registro).toLocaleString()}
                    </td>
                    <td className="py-4 px-6">
                      {log.perfiles ? (
                        <div>
                          <p className="text-white font-medium">{log.perfiles.nombre}</p>
                          <p className="text-xs text-neutral-500">{log.perfiles.email}</p>
                        </div>
                      ) : (
                        <span className="text-neutral-500 italic">Sincronización (Sistema)</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        log.accion === 'DELETE' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
                        log.accion === 'UPDATE' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {log.accion}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-indigo-300 font-mono text-xs">{log.tabla_afectada}</td>
                    <td className="py-4 px-6 text-neutral-400 font-mono text-xs">{log.registro_id.split('-')[0]}...</td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => alert(JSON.stringify(log.accion === 'UPDATE' ? log.datos_nuevos : log.datos_viejos, null, 2))}
                        className="text-neutral-500 hover:text-indigo-400"
                      >
                        Ver JSON
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-500">
                    No hay registros de auditor�a a�n.
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


