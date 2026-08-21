'use client';

import React, { useState, useEffect } from 'react';
import { createUser } from './actions';
import { getSedes } from '@/actions/dashboard-actions';
import { X, Plus, Loader2, Check } from 'lucide-react';

const MODULES = [
  { id: 'dashboard', label: 'Dashboard Principal' },
  { id: 'pos', label: 'Punto de Venta (POS)' },
  { id: 'inventario', label: 'Inventario y Recetas' },
  { id: 'compras', label: 'Compras y Gastos' },
  { id: 'finanzas', label: 'Finanzas y Caja' },
  { id: 'reportes', label: 'Reportes y Cierres' },
  { id: 'clientes', label: 'Base de Clientes' },
  { id: 'usuarios', label: 'Gestión de Personal' },
  { id: 'auditoria', label: 'Registro de Auditoría' },
  { id: 'ajustes', label: 'Ajustes de Empresa' },
];

export default function AddUserModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [sedes, setSedes] = useState<any[]>([]);
  const [selectedSede, setSelectedSede] = useState<string>('ALL');
  
  const [selectedModules, setSelectedModules] = useState<string[]>(['pos']);

  useEffect(() => {
    if (isOpen) {
      getSedes().then(s => setSedes(s));
    }
  }, [isOpen]);

  const toggleModule = (modId: string) => {
    setSelectedModules(prev => 
      prev.includes(modId) 
        ? prev.filter(m => m !== modId)
        : [...prev, modId]
    );
  };

  const selectAll = () => {
    setSelectedModules(MODULES.map(m => m.id));
  };

  const selectNone = () => {
    setSelectedModules([]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (selectedModules.length === 0) {
      setError("Debes seleccionar al menos 1 módulo de acceso.");
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const nombre = formData.get('nombre') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const res = await createUser(email, password, nombre, selectedModules, selectedSede);
    if (!res.success) {
      setError(res.error || 'Error al crear usuario');
      setLoading(false);
    } else {
      setIsOpen(false);
      setLoading(false);
      // Reset form state
      setSelectedModules(['pos']);
      setSelectedSede('ALL');
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-bold transition-colors"
      >
        <Plus size={18} /> Agregar Usuario
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl w-full max-w-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white mb-6">Nuevo Usuario</h2>
            
            {error && (
              <div className="bg-rose-500/20 text-rose-400 p-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Información Básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Nombre Completo</label>
                  <input required name="nombre" type="text" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500" placeholder="Ej. Juan Pérez" />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Correo Electrónico</label>
                  <input required name="email" type="email" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500" placeholder="juan@gmail.com" />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Contraseña Temporal</label>
                  <input required name="password" type="password" minLength={6} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500" placeholder="Mínimo 6 caracteres" />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Sucursal Asignada</label>
                  <select 
                    value={selectedSede}
                    onChange={(e) => setSelectedSede(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                  >
                    <option value="ALL">Todas las Sedes (Acceso Global)</option>
                    {sedes.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Permisos por Módulo */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-white">Permisos de Módulos</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={selectAll} className="text-xs text-indigo-400 hover:text-indigo-300">Marcar todos</button>
                    <span className="text-neutral-700">|</span>
                    <button type="button" onClick={selectNone} className="text-xs text-neutral-500 hover:text-neutral-400">Desmarcar todos</button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {MODULES.map(mod => {
                    const isSelected = selectedModules.includes(mod.id);
                    return (
                      <div 
                        key={mod.id}
                        onClick={() => toggleModule(mod.id)}
                        className={lex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors \}
                      >
                        <div className={w-5 h-5 rounded flex items-center justify-center \}>
                          <Check size={14} />
                        </div>
                        <span className={	ext-sm \}>
                          {mod.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-neutral-800">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-neutral-400 hover:text-white text-sm font-medium">Cancelar</button>
                <button disabled={loading} type="submit" className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
