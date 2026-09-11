'use client';

import React, { useState, useEffect } from 'react';
import { updateMemberDetails } from './actions';
import { AVAILABLE_MODULES, CATEGORY_LABELS, ROLE_PRESETS } from './modules';
import { X, Loader2, Check, ShieldCheck, Settings2, Building2 } from 'lucide-react';

interface SedeOption {
  id: string;
  nombre_sede?: string;
  nombre?: string;
}

interface MemberToEdit {
  id: string;
  nombre_completo: string;
  rol: string;
  permisos?: string[];
  sede_id?: string | null;
}

interface EditUserModalProps {
  member: MemberToEdit;
  sedes: SedeOption[];
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedMember: MemberToEdit) => void;
}

export default function EditUserModal({ member, sedes, isOpen, onClose, onUpdated }: EditUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState(member.nombre_completo || '');
  const [rol, setRol] = useState(member.rol || 'CAJERO');
  const [selectedSede, setSelectedSede] = useState<string>(member.sede_id || 'ALL');
  const [selectedModules, setSelectedModules] = useState<string[]>(member.permisos || []);

  useEffect(() => {
    setNombre(member.nombre_completo || '');
    setRol(member.rol || 'CAJERO');
    setSelectedSede(member.sede_id || 'ALL');
    setSelectedModules(member.permisos || []);
    setError(null);
  }, [member, isOpen]);

  if (!isOpen) return null;

  const toggleModule = (modId: string) => {
    setSelectedModules(prev =>
      prev.includes(modId)
        ? prev.filter(m => m !== modId)
        : [...prev, modId]
    );
  };

  const applyRolePreset = (newRol: string) => {
    setRol(newRol);
    const preset = ROLE_PRESETS[newRol];
    if (preset) {
      setSelectedModules(preset);
    }
  };

  const selectAll = () => {
    setSelectedModules(AVAILABLE_MODULES.map(m => m.id));
  };

  const selectNone = () => {
    setSelectedModules([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (selectedModules.length === 0) {
      setError('Debes asignar al menos 1 módulo de acceso para este usuario.');
      setLoading(false);
      return;
    }

    const res = await updateMemberDetails(member.id, {
      nombre_completo: nombre.trim(),
      rol,
      permisos: selectedModules,
      sede_id: selectedSede === 'ALL' ? null : selectedSede,
    });

    if (!res.success) {
      setError(res.error || 'Error al actualizar permisos.');
      setLoading(false);
    } else {
      onUpdated({
        ...member,
        nombre_completo: nombre.trim(),
        rol,
        permisos: selectedModules,
        sede_id: selectedSede === 'ALL' ? null : selectedSede,
      });
      setLoading(false);
      onClose();
    }
  };

  // Agrupación de módulos por categoría
  const categories = ['operaciones', 'inventario', 'clientes', 'admin'] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Settings2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Editar Accesos y Módulos</h2>
              <p className="text-xs text-neutral-400">Personaliza los módulos a los que tiene acceso este integrante.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-xl hover:bg-neutral-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 overflow-y-auto space-y-5 custom-scrollbar flex-1">
            {error && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            {/* Datos básicos: Nombre y Rol */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Rol de Usuario
                </label>
                <select
                  value={rol}
                  onChange={(e) => applyRolePreset(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="CAJERO">Cajero — POS y Cierre de Caja</option>
                  <option value="GERENTE">Gerente — Operación completa</option>
                  <option value="COMPRADOR">Comprador — Compras e inventario</option>
                  <option value="MASTER">Master — Administrador total</option>
                </select>
              </div>
            </div>

            {/* Sede Asignada */}
            {sedes.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                  <Building2 size={14} className="text-indigo-400" /> Sede Asignada
                </label>
                <select
                  value={selectedSede}
                  onChange={(e) => setSelectedSede(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="ALL">Todas las sedes (Acceso global)</option>
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre_sede || s.nombre || `Sede ${s.id.substring(0, 6)}`}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Si seleccionas una sede específica, el usuario solo registrará operaciones en esa sucursal.
                </p>
              </div>
            )}

            {/* Selector de Módulos desglosados */}
            <div className="space-y-4 pt-2 border-t border-neutral-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck size={16} className="text-indigo-400" />
                    Módulos habilitados ({selectedModules.length} seleccionados)
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Marca individualmente cada módulo al que este integrante tendrá acceso.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors"
                  >
                    Marcar todos
                  </button>
                  <button
                    type="button"
                    onClick={selectNone}
                    className="text-xs font-semibold text-neutral-400 hover:text-neutral-300 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              {/* Categorías */}
              <div className="space-y-4">
                {categories.map((catKey) => {
                  const catModules = AVAILABLE_MODULES.filter(m => m.category === catKey);
                  if (catModules.length === 0) return null;

                  return (
                    <div key={catKey} className="bg-neutral-950/40 border border-neutral-800/80 rounded-2xl p-3.5 space-y-2.5">
                      <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                        {CATEGORY_LABELS[catKey]}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {catModules.map((mod) => {
                          const isChecked = selectedModules.includes(mod.id);
                          return (
                            <button
                              key={mod.id}
                              type="button"
                              onClick={() => toggleModule(mod.id)}
                              className={`text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                                isChecked
                                  ? 'bg-indigo-500/10 border-indigo-500/40 text-white'
                                  : 'bg-neutral-900/60 border-neutral-800/60 text-neutral-400 hover:border-neutral-700'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                isChecked
                                  ? 'bg-indigo-600 border-indigo-500 text-white'
                                  : 'border-neutral-700 bg-neutral-950'
                              }`}>
                                {isChecked && <Check size={13} strokeWidth={3} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-semibold leading-tight ${isChecked ? 'text-indigo-200' : 'text-neutral-300'}`}>
                                  {mod.label}
                                </p>
                                <p className="text-[10px] text-neutral-500 mt-0.5 leading-tight line-clamp-2">
                                  {mod.description}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="p-4 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-indigo-600/20"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Guardar Cambios
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
