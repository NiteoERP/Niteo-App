'use client';

import React, { useOptimistic, useTransition, useState } from 'react';
import { updateMemberRole } from './actions';
import { UserCircle, Shield, ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react';

import AddUserModal from './AddUserModal';

type Member = {
  id: string;
  nombre_completo: string;
  rol: string;
};

export default function TeamManager({ initialMembers, currentUserId }: { initialMembers: Member[], currentUserId: string }) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ id: string, msg: string, type: 'error'|'success' } | null>(null);

  // useOptimistic toma la lista de miembros inicial, y define cómo modificarla asíncronamente
  const [optimisticMembers, updateOptimisticMember] = useOptimistic(
    initialMembers,
    (state: Member[], { id, newRole }: { id: string, newRole: string }) => {
      return state.map(member => 
        member.id === id ? { ...member, rol: newRole } : member
      );
    }
  );

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setFeedback(null);
    
    startTransition(async () => {
      // 1. Actualización Optimista Visual Inmediata
      updateOptimisticMember({ id: memberId, newRole });

      // 2. Ejecutar la llamada al backend de fondo
      const res = await updateMemberRole(memberId, newRole);
      
      if (!res.success) {
        setFeedback({ id: memberId, msg: 'Error: ' + res.error, type: 'error' });
      } else {
        setFeedback({ id: memberId, msg: 'Actualizado', type: 'success' });
        setTimeout(() => setFeedback(null), 2000);
      }
    });
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden">
      <div className="p-4 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="font-medium text-white flex items-center gap-3 text-lg sm:text-base">Miembros del equipo ({optimisticMembers.length})</h2>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          {isPending && <span className="text-xs text-indigo-400 flex items-center gap-1 animate-pulse"><Loader2 size={12} className="animate-spin" /> Sincronizando...</span>}
          <div className="flex-1 sm:flex-none">
            <AddUserModal />
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-950/50 text-neutral-500 font-medium border-b border-neutral-800">
            <tr>
              <th className="px-6 py-4">Usuario</th>
              <th className="px-6 py-4">Rol de Acceso</th>
              <th className="px-6 py-4 text-right">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/50">
            {optimisticMembers.map((member) => (
              <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                      <UserCircle size={20} />
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {member.nombre_completo || 'Usuario'} 
                        {member.id === currentUserId && <span className="ml-2 text-xs text-neutral-500 font-normal">(Tú)</span>}
                      </p>
                      <p className="text-xs text-neutral-500 font-mono">{member.id.substring(0, 8)}...</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {member.id === currentUserId ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-800 text-neutral-300 text-xs font-medium cursor-not-allowed">
                      <ShieldAlert size={14} /> Tu Rol (No editable)
                    </span>
                  ) : (
                    <div className="relative w-40">
                      <select 
                        value={member.rol}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        className="w-full appearance-none bg-neutral-950 border border-neutral-700 hover:border-indigo-500 text-white text-sm rounded-lg pl-8 pr-4 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer"
                      >
                        <option value="CAJERO">Cajero</option>
                        <option value="GERENTE">Gerente</option>
                        <option value="MASTER">Master</option>
                      </select>
                      <Shield className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4 pointer-events-none" />
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {feedback?.id === member.id ? (
                    <span className={`text-xs font-medium flex items-center justify-end gap-1 ${feedback.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {feedback.type === 'success' ? <CheckCircle2 size={14} /> : null}
                      {feedback.msg}
                    </span>
                  ) : (
                    <span className="text-xs text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full font-medium">Activo</span>
                  )}
                </td>
              </tr>
            ))}
            {optimisticMembers.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-neutral-500">
                  No hay miembros en el equipo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden flex flex-col divide-y divide-neutral-800/50">
        {optimisticMembers.map((member) => (
          <div key={member.id} className="p-4 flex flex-col gap-3 hover:bg-white/[0.02] transition-colors">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                  <UserCircle size={20} />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">
                    {member.nombre_completo || 'Usuario'} 
                    {member.id === currentUserId && <span className="ml-2 text-xs text-neutral-500 font-normal">(Tú)</span>}
                  </p>
                  <p className="text-xs text-neutral-500 font-mono">{member.id.substring(0, 8)}...</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                {feedback?.id === member.id ? (
                  <span className={`text-xs font-medium flex items-center justify-end gap-1 ${feedback.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {feedback.type === 'success' ? <CheckCircle2 size={14} /> : null}
                    {feedback.msg}
                  </span>
                ) : (
                  <span className="text-xs text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full font-medium">Activo</span>
                )}
              </div>
            </div>
            
            <div className="pt-1">
              {member.id === currentUserId ? (
                <span className="inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-neutral-800 text-neutral-300 text-xs font-medium cursor-not-allowed">
                  <ShieldAlert size={14} /> Tu Rol (No editable)
                </span>
              ) : (
                <div className="relative w-full">
                  <select 
                    value={member.rol}
                    onChange={(e) => handleRoleChange(member.id, e.target.value)}
                    className="w-full appearance-none bg-neutral-950 border border-neutral-700 hover:border-indigo-500 text-white text-sm rounded-lg pl-8 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer"
                  >
                    <option value="CAJERO">Cajero</option>
                    <option value="GERENTE">Gerente</option>
                    <option value="MASTER">Master</option>
                  </select>
                  <Shield className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4 pointer-events-none" />
                </div>
              )}
            </div>
          </div>
        ))}
        {optimisticMembers.length === 0 && (
          <div className="p-8 text-center text-neutral-500">
            No hay miembros en el equipo.
          </div>
        )}
      </div>

      <div className="p-4 bg-indigo-500/5 border-t border-indigo-500/10">
        <p className="text-xs text-indigo-300/80">
          <strong>Optimistic UI:</strong> Cambia el rol de un usuario y verás cómo el menú se actualiza al instante mientras el servidor procesa el cambio de forma invisible.
        </p>
      </div>
    </div>
  );
}

