'use client';

import React, { useState, useTransition } from 'react';
import { updateMemberRole, deleteUser } from './actions';
import { UserCircle, ShieldAlert, Loader2, CheckCircle2, Trash2, Settings2, Building2, Layers, KeyRound, Shield, Zap } from 'lucide-react';
import AddUserModal from './AddUserModal';
import EditUserModal from './EditUserModal';
import ChangePasswordModal from './ChangePasswordModal';
import { AVAILABLE_MODULES } from './modules';
import { useEmpresa } from '@/components/providers/EmpresaProvider';

export type Member = {
  id: string;
  nombre_completo: string;
  rol: string;
  permisos?: string[];
  sede_id?: string | null;
  pin_seguridad?: string;
  permiso_venta_costo?: boolean;
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
  sedes: SedeOption[];
}) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [isPending, startTransition] = useTransition();
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string, msg: string, type: 'success' | 'error' } | null>(null);

  const { planSuscripcion, modulosActivos } = useEmpresa();
  const plan = planSuscripcion.toUpperCase();
  const baseLimit = plan === 'STARTER' ? 3 : plan === 'PRO' ? 10 : 999;
  const maxUsuarios = baseLimit; // Puedes sumar plugins si lo deseas (ej. +modulosActivos.length * 3)
  const canAddMore = members.length < maxUsuarios;

  const getRoleBadge = (rol: string) => {
    switch (rol) {
      case 'MASTER': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'GERENTE': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'COMPRADOR': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    }
  };

  const showFeedback = (id: string, msg: string, type: 'success' | 'error') => {
    setFeedback({ id, msg, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleUserCreated = (newMember: Member) => {
    setMembers(prev => [newMember, ...prev]);
  };

  const handleMemberUpdated = (updated: Member) => {
    setMembers(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
    showFeedback(updated.id, 'Actualizado correctamente', 'success');
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar a ${name}?`)) return;
    setDeletingId(id);
    const res = await deleteUser(id);
    if (res.success) {
      setMembers(prev => prev.filter(m => m.id !== id));
    } else {
      showFeedback(id, res.error || 'Error al eliminar', 'error');
    }
    setDeletingId(null);
  };

  const getSedeName = (id?: string | null) => {
    if (!id || id === 'ALL') return 'Todas las sedes';
    const found = sedes.find(s => s.id === id);
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
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header Superior */}
        <div className="p-6 md:p-8 bg-neutral-950/40 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-neutral-800">
          <div className="space-y-1.5">
            <h2 className="font-black text-white flex items-center gap-3 text-xl md:text-2xl tracking-tight">
              Miembros del equipo 
              <span className="bg-indigo-600 text-white text-sm px-3 py-1 rounded-full font-bold shadow-lg shadow-indigo-500/20">
                {members.length}
              </span>
            </h2>
            <p className="text-sm text-neutral-400">
              Administra accesos, roles y permisos detallados para cada integrante.
            </p>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            {isPending && (
              <span className="text-xs text-indigo-400 flex items-center gap-2 font-medium bg-indigo-500/10 px-3 py-1.5 rounded-full">
                <Loader2 size={14} className="animate-spin" /> Guardando...
              </span>
            )}
            <div className="flex-1 md:flex-none">
              {!canAddMore ? (
                <div className="text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 px-4 py-2 rounded-xl flex items-center gap-2">
                  <ShieldAlert size={16} />
                  Límite de {maxUsuarios} usuarios alcanzado
                </div>
              ) : (
                <AddUserModal onUserCreated={handleUserCreated} />
              )}
            </div>
          </div>
        </div>

        {/* CONTENEDOR VISTA PREMIUM */}
        <div className="p-4 md:p-6 bg-neutral-900/50 flex-1">
          
          {/* Títulos de Columnas (Desktop) */}
          <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.5fr_2fr_1fr] gap-4 px-6 pb-4 text-xs font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-800/60 mb-4">
            <div className="text-left">Usuario</div>
            <div className="text-center">Rol de Acceso</div>
            <div className="text-center">Sede Asignada</div>
            <div className="text-center">Módulos Habilitados</div>
            <div className="text-right">Acciones</div>
          </div>

          <div className="flex flex-col gap-3 md:gap-4">
            {members.map((member) => {
              const isMaster = member.rol === 'MASTER';
              const permisosCount = member.permisos?.length || 0;

              return (
                <div 
                  key={member.id} 
                  className="group relative bg-neutral-950/60 hover:bg-neutral-800/40 border border-neutral-800/80 hover:border-neutral-700 rounded-2xl p-4 md:p-5 transition-all duration-300 shadow-sm hover:shadow-xl"
                >
                  <div className="flex flex-col md:grid md:grid-cols-[2fr_1.5fr_1.5fr_2fr_1fr] items-center gap-4 md:gap-4">
                    
                    {/* 1. Usuario */}
                    <div className="flex items-center gap-4 w-full justify-start md:justify-start">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
                        <UserCircle size={26} strokeWidth={1.5} />
                      </div>
                      <div className="flex flex-col">
                        <p className="text-white font-bold text-base md:text-[15px] flex items-center gap-2">
                          {member.nombre_completo || 'Usuario'}
                          {member.id === currentUserId && (
                            <span className="text-[10px] uppercase tracking-wider text-indigo-300 font-bold bg-indigo-500/20 px-2 py-0.5 rounded-full">(Tú)</span>
                          )}
                        </p>
                        <p className="text-xs text-neutral-500 font-mono mt-0.5 opacity-80">{member.id.substring(0, 8)}...</p>
                      </div>
                    </div>

                    {/* 2. Rol */}
                    <div className="flex w-full md:w-auto justify-between md:justify-center items-center py-2 md:py-0 border-t border-neutral-800/50 md:border-0 mt-2 md:mt-0">
                      <span className="text-xs text-neutral-500 font-medium md:hidden">Rol:</span>
                      {member.id === currentUserId ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs font-bold shadow-sm">
                          <ShieldAlert size={14} className="text-amber-500" /> Propietario
                        </span>
                      ) : (
                        <span className={`text-[11px] uppercase tracking-widest border px-3 py-1.5 rounded-xl font-bold shadow-sm ${getRoleBadge(member.rol)}`}>
                          {member.rol}
                        </span>
                      )}
                    </div>

                    {/* 3. Sede */}
                    <div className="flex w-full md:w-auto justify-between md:justify-center items-center py-2 md:py-0 border-b border-neutral-800/50 md:border-0 mb-2 md:mb-0">
                      <span className="text-xs text-neutral-500 font-medium md:hidden">Sede:</span>
                      <span className="text-sm font-medium text-neutral-300 flex items-center gap-2 bg-neutral-900/50 px-3 py-1.5 rounded-xl border border-neutral-800/50">
                        <Building2 size={14} className="text-neutral-500" />
                        {getSedeName(member.sede_id)}
                      </span>
                    </div>

                    {/* 4. Módulos */}
                    <div className="flex flex-col w-full md:w-auto justify-center md:items-center gap-1.5">
                      {isMaster ? (
                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl">
                          <Zap size={14} className="animate-pulse" /> Acceso Total
                        </div>
                      ) : (
                        <div className="flex flex-col items-start md:items-center w-full">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-neutral-300 bg-neutral-800 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                              <Layers size={12} className="text-neutral-400" />
                              {permisosCount} {permisosCount === 1 ? 'Módulo' : 'Módulos'}
                            </span>
                            {member.permiso_venta_costo && (
                              <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded-md" title="Habilitado para procesar Venta al Costo">
                                Venta al Costo
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-neutral-500 mt-1 truncate max-w-[220px] md:text-center text-left w-full" title={getModuleNames(member.permisos)}>
                            {getModuleNames(member.permisos)}
                          </span>
                        </div>
                      )}

                      {feedback?.id === member.id && (
                        <span className={`text-xs font-bold flex items-center justify-center gap-1.5 mt-2 px-2 py-1 rounded-lg ${feedback.type === 'error' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {feedback.type === 'success' && <CheckCircle2 size={14} />}
                          {feedback.msg}
                        </span>
                      )}
                    </div>

                    {/* 5. Acciones */}
                    <div className="flex items-center justify-end md:justify-end gap-2 w-full mt-3 md:mt-0">
                      <button
                        onClick={() => setEditingMember(member)}
                        className="flex-1 md:flex-none px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                        title="Editar perfil y PIN"
                      >
                        <Settings2 size={16} /> <span className="md:hidden lg:inline">Ajustar</span>
                      </button>
                      
                      <ChangePasswordModal 
                        memberId={member.id} 
                        nombreCompleto={member.nombre_completo || 'Usuario'} 
                      />

                      {member.id !== currentUserId && (
                        <button
                          onClick={() => handleDelete(member.id, member.nombre_completo)}
                          disabled={deletingId === member.id}
                          className="p-2.5 text-neutral-400 bg-neutral-900 border border-neutral-800 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 rounded-xl transition-all disabled:opacity-40"
                          title="Eliminar usuario"
                        >
                          {deletingId === member.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}

            {members.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-neutral-500 bg-neutral-950/40 rounded-3xl border border-neutral-800/60 border-dashed">
                <UserCircle size={48} className="text-neutral-700 mb-4" />
                <p className="text-sm font-medium">No hay miembros en el equipo aún.</p>
              </div>
            )}
          </div>
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
