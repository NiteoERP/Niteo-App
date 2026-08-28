'use client';

import React, { useState, useTransition } from 'react';
import { updateMemberRole, deleteUser } from './actions';
import { UserCircle, Shield, ShieldAlert, Loader2, CheckCircle2, Trash2 } from 'lucide-react';
import AddUserModal from './AddUserModal';

type Member = {
  id: string;
  nombre_completo: string;
  rol: string;
};

export default function TeamManager({ initialMembers, currentUserId }: { initialMembers: Member[], currentUserId: string }) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ id: string, msg: string, type: 'error' | 'success' } | null>(null);

  // FIX 3: estado local para actualizar la lista sin recargar la página
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Callback para AddUserModal: agrega el nuevo miembro a la lista al instante
  const handleUserCreated = (newMember: Member) => {
    setMembers(prev => [...prev, newMember]);
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setFeedback(null);
    // Optimistic update local
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, rol: newRole } : m));

    startTransition(async () => {
      const res = await updateMemberRole(memberId, newRole);
      if (!res.success) {
        setFeedback({ id: memberId, msg: 'Error: ' + res.error, type: 'error' });
        // Revert on error
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, rol: members.find(x => x.id === memberId)?.rol ?? newRole } : m));
      } else {
        setFeedback({ id: memberId, msg: 'Actualizado', type: 'success' });
        setTimeout(() => setFeedback(null), 2000);
      }
    });
  };

  // FIX 3: eliminar usuario con confirmación y actualización optimista
  const handleDelete = async (memberId: string, nombre: string) => {
    if (!confirm(`¿Eliminar a ${nombre} del equipo? Esta acción no se puede deshacer.`)) return;
    setDeletingId(memberId);
    const res = await deleteUser(memberId);
    if (res.success) {
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } else {
      alert('Error al eliminar: ' + res.error);
    }
    setDeletingId(null);
  };

  const getRoleBadge = (rol: string) => {
    switch (rol) {
      case 'MASTER': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'GERENTE': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'COMPRADOR': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-neutral-800 text-neutral-400 border-neutral-700';
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden">
      <div className="p-4 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="font-medium text-white flex items-center gap-3 text-lg sm:text-base">
          Miembros del equipo ({members.length})
        </h2>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          {isPending && <span className="text-xs text-indigo-400 flex items-center gap-1 animate-pulse"><Loader2 size={12} className="animate-spin" /> Sincronizando...</span>}
          <div className="flex-1 sm:flex-none">
            {/* FIX 3: pasamos onUserCreated al modal para actualizar la lista localmente */}
            <AddUserModal onUserCreated={handleUserCreated} />
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
              <th className="px-6 py-4 text-center">Estado</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/50">
            {members.map((member) => (
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
                    <div className="relative w-44">
                      <select
                        value={member.rol}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        className="w-full appearance-none bg-neutral-950 border border-neutral-700 hover:border-indigo-500 text-white text-sm rounded-lg pl-8 pr-4 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer"
                      >
                        <option value="CAJERO">Cajero</option>
                        <option value="GERENTE">Gerente</option>
                        <option value="COMPRADOR">Comprador</option>
                        <option value="MASTER">Master</option>
                      </select>
                      <Shield className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4 pointer-events-none" />
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  {feedback?.id === member.id ? (
                    <span className={`text-xs font-medium flex items-center justify-center gap-1 ${feedback.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {feedback.type === 'success' ? <CheckCircle2 size={14} /> : null}
                      {feedback.msg}
                    </span>
                  ) : (
                    <span className={`text-xs border px-2 py-1 rounded-full font-medium ${getRoleBadge(member.rol)}`}>
                      {member.rol}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {member.id !== currentUserId && (
                    <button
                      onClick={() => handleDelete(member.id, member.nombre_completo)}
                      disabled={deletingId === member.id}
                      className="p-1.5 text-neutral-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-40"
                      title="Eliminar usuario"
                    >
                      {deletingId === member.id
                        ? <Loader2 size={16} className="animate-spin" />
                        : <Trash2 size={16} />
                      }
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">
                  No hay miembros en el equipo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden flex flex-col divide-y divide-neutral-800/50">
        {members.map((member) => (
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
              <div className="flex items-center gap-2">
                {feedback?.id === member.id ? (
                  <span className={`text-xs font-medium flex items-center gap-1 ${feedback.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {feedback.type === 'success' ? <CheckCircle2 size={14} /> : null}
                    {feedback.msg}
                  </span>
                ) : (
                  <span className={`text-xs border px-2 py-1 rounded-full font-medium ${getRoleBadge(member.rol)}`}>
                    {member.rol}
                  </span>
                )}
                {member.id !== currentUserId && (
                  <button
                    onClick={() => handleDelete(member.id, member.nombre_completo)}
                    disabled={deletingId === member.id}
                    className="p-1.5 text-neutral-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-40"
                  >
                    {deletingId === member.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
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
                    <option value="COMPRADOR">Comprador</option>
                    <option value="MASTER">Master</option>
                  </select>
                  <Shield className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4 pointer-events-none" />
                </div>
              )}
            </div>
          </div>
        ))}
        {members.length === 0 && (
          <div className="p-8 text-center text-neutral-500">
            No hay miembros en el equipo.
          </div>
        )}
      </div>
    </div>
  );
}
