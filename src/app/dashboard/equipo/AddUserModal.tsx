'use client';

import React, { useState } from 'react';
import { createUser } from './actions';
import { X, Plus, Loader2 } from 'lucide-react';

export default function AddUserModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const nombre = formData.get('nombre') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const rol = formData.get('rol') as string;

    const res = await createUser(email, password, nombre, rol);
    if (!res.success) {
      setError(res.error || 'Error al crear usuario');
      setLoading(false);
    } else {
      setIsOpen(false);
      setLoading(false);
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
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white mb-6">Nuevo Usuario</h2>
            
            {error && (
              <div className="bg-rose-500/20 text-rose-400 p-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Nombre Completo</label>
                <input required name="nombre" type="text" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500" placeholder="Ej. Juan Pérez" />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Correo Electrónico (Gmail o de empresa)</label>
                <input required name="email" type="email" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500" placeholder="juan@gmail.com" />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Contraseña Temporal</label>
                <input required name="password" type="password" minLength={6} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500" placeholder="Mínimo 6 caracteres" />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Rol de Acceso</label>
                <select name="rol" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500">
                  <option value="STAFF">Staff (Ver lo propio)</option>
                  <option value="MANAGER">Manager (Manejar Sede)</option>
                  <option value="MASTER">Master (Acceso Total)</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
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
