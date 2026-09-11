'use client';

import React, { useState, useTransition } from 'react';
import { updateMemberRole, deleteUser } from './actions';
import { UserCircle, Shield, ShieldAlert, Loader2, CheckCircle2, Trash2, Settings2, Building2, Layers } from 'lucide-react';
import AddUserModal from './AddUserModal';
import EditUserModal from './EditUserModal';
import ChangePasswordModal from './ChangePasswordModal';
import { AVAILABLE_MODULES } from './modules';

export type Member = {
  id: string;
  nombre_completo: string;
  rol: string;
  permisos?: string[];
  sede_id?: string | null;
};

interface SedeOption {
  id: string;
  nombre_sede?: string;
  nombre?: string;
}

export default function TeamManager({ 
  initialMembers, 
  currentUserId,
  sedes = []
}: { 
  initialMembers: Member[]; 
  currentUserId: string;
  sedes?: SedeOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ id: string; msg: string; type: 'error' | 'success' } | null>(null);

  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const handleUserCreated = (newMember: Member) => {
    setMembers(prev => [...prev, newMember]);
  };

  const handleMemberUpdated = (updated: Member) => {
    setMembers(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
    setFeedback({ id: updated.id, msg: 'Permisos actualizados', type: 'success' });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setFeedback(null);
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, rol: newRole } : m));

    startTransition(async () => {
      const res = await updateMemberRole(memberId, newRole);
      if (!res.success) {
        setFeedback({ id: memberId, msg: 'Error: ' + res.error, type: 'error' });
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, rol: members.find(x => x.id === memberId)?.rol ?? newRole } : m));
      } else {
        setFeedback({ id: memberId, msg: 'Rol actualizado', type: 'success' });
        setTimeout(() => setFeedback(null), 2000);
      }
    });
  };

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
      case 'CAJERO': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      default: return 'bg-neutral-800 text-neutral-400 border-neutral-700';
    }
  };

  const getSedeName = (sedeId?: string | null) => {
    if (!sedeId || sedeId === 'ALL') return 'Todas las sedes';
    const found = sedes.find(s => s.id === sedeId);
    return found?.nombre_sede || found?.nombre || 'Sede asignada';
  };

  const getModuleNames = (permisos?: string[]) => {
    if (!permisos || permisos.length === 0) return 'Sin módulos asignados';
    return permisos
      .map(p => AVAILABLE_MODULES.find(m => m.id === p)?.label.split(' ')[0] || p)
      .join(', ');
  };

  return (
    <>
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-white flex items-center gap-3 text-lg sm:text-base">
              Miembros del equipo ({members.length})
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Haz clic en "Módulos" para configurar con exactitud qué partes del sistema puede ver y usar cada integrante.
            </p>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            {isPending && (
              <span className="text-xs text-indigo-400 flex items-center gap-1 animate-pulse">
                <Loader2 size={12} className="animate-spin" /> Guardando...
              </span>
            )}
            <div className="flex-1 sm:flex-none">
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
                <th className="px-6 py-4">Sede Asignada</th>
                <th className="px-6 py-4">Módulos Habilitados</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {members.map((member) => {
                const isMaster = member.rol === 'MASTER';
                const permisosCount = member.permisos?.length || 0;

                return (
                  <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Usuario */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                          <UserCircle size={22} />
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {member.nombre_completo || 'Usuario'}
                            {member.id === currentUserId && (
                              <span className="ml-2 text-xs text-neutral-500 font-normal">(Tú)</span>
                            )}
                          </p>
                          <p className="text-xs text-neutral-500 font-mono">{member.id.substring(0, 8)}...</p>
                        </div>
                      </div>
                    </td>

                    {/* Rol */}
                    <td className="px-6 py-4">
                      {member.id === currentUserId ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-800 text-neutral-300 text-xs font-medium cursor-not-allowed">
                          <ShieldAlert size={14} /> Master (Propietario)
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`text-xs border px-2.5 py-1 rounded-full font-bold ${getRoleBadge(member.rol)}`}>
                            {member.rol}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Sede */}
                    <td className="px-6 py-4">
                      <span className="text-xs text-neutral-400 flex items-center gap-1.5">
                        <Building2 size={13} className="text-neutral-500" />
                        {getSedeName(member.sede_id)}
                      </span>
                    </td>

                    {/* Módulos */}
                    <td className="px-6 py-4">
                      {isMaster ? (
                        <span className="text-xs text-indigo-400 font-medium bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                          Todos los módulos (Acceso total)
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-300 bg-neutral-800 px-2 py-0.5 rounded-md font-mono">
                            {permisosCount} {permisosCount === 1 ? 'módulo' : 'módulos'}
                          </span>
                          <span className="text-xs text-neutral-500 truncate max-w-[200px]" title={getModuleNames(member.permisos)}>
                            {getModuleNames(member.permisos)}
                          </span>
                        </div>
                      )}
                      {feedback?.id === member.id && (
                        <span className={`text-xs font-medium flex items-center gap-1 mt-1 ${feedback.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {feedback.type === 'success' && <CheckCircle2 size={12} />}
                          {feedback.msg}
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4 text-right">
                      {member.id !== currentUserId && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingMember(member)}
                            className="px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                            title="Editar permisos y módulos"
                          >
                            <Settings2 size={14} /> Módulos
                          </button>
                          
                          <ChangePasswordModal 
                            memberId={member.id} 
                            nombreCompleto={member.nombre_completo || 'Usuario'} 
                          />

                          <button
                            onClick={() => handleDelete(member.id, member.nombre_completo)}
                            disabled={deletingId === member.id}
                            className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-40"
                            title="Eliminar usuario"
                          >
                            {deletingId === member.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {members.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                    No hay miembros en el equipo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col divide-y divide-neutral-800/50">
          {members.map((member) => {
            const isMaster = member.rol === 'MASTER';
            const permisosCount = member.permisos?.length || 0;

            return (
              <div key={member.id} className="p-4 flex flex-col gap-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                      <UserCircle size={20} />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">
                        {member.nombre_completo || 'Usuario'}
                        {member.id === currentUserId && (
                          <span className="ml-2 text-xs text-neutral-500 font-normal">(Tú)</span>
                        )}
                      </p>
                      <p className="text-xs text-neutral-500 font-mono">{member.id.substring(0, 8)}...</p>
                    </div>
                  </div>
                  <span className={`text-xs border px-2 py-0.5 rounded-full font-bold ${getRoleBadge(member.rol)}`}>
                    {member.rol}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                  <span className="flex items-center gap-1">
                    <Building2 size={12} className="text-neutral-500" />
                    {getSedeName(member.sede_id)}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Layers size={12} className="text-neutral-500" />
                    {isMaster ? 'Acceso Total' : `${permisosCount} módulos`}
                  </span>
                </div>

                {feedback?.id === member.id && (
                  <span className={`text-xs font-medium flex items-center gap-1 ${feedback.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {feedback.type === 'success' && <CheckCircle2 size={12} />}
                    {feedback.msg}
                  </span>
                )}

                {member.id !== currentUserId && (
                  <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setEditingMember(member)}
                      className="flex-1 py-2 px-3 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Settings2 size={14} /> Editar Módulos
                    </button>
                    <ChangePasswordModal 
                      memberId={member.id} 
                      nombreCompleto={member.nombre_completo || 'Usuario'} 
                    />
                    <button
                      onClick={() => handleDelete(member.id, member.nombre_completo)}
                      disabled={deletingId === member.id}
                      className="p-2 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors disabled:opacity-40"
                    >
                      {deletingId === member.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {members.length === 0 && (
            <div className="p-8 text-center text-neutral-500">
              No hay miembros en el equipo.
            </div>
          )}
        </div>
      </div>

      {/* Modal para Editar Módulos y Permisos */}
      {editingMember && (
        <EditUserModal
          member={editingMember}
          sedes={sedes}
          isOpen={true}
          onClose={() => setEditingMember(null)}
          onUpdated={handleMemberUpdated}
        />
      )}
    </>
  );
}
