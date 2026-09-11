'use client';

import React, { useState } from 'react';
import { changeUserPassword } from './actions';
import { KeyRound, X, Loader2, CheckCircle2 } from 'lucide-react';

export default function ChangePasswordModal({ memberId, nombreCompleto }: { memberId: string, nombreCompleto: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    setIsPending(true);
    setError(null);
    setSuccess(false);

    const res = await changeUserPassword(memberId, password);
    
    setIsPending(false);
    
    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setPassword('');
      }, 2000);
    } else {
      setError(res.error || 'Error al cambiar la contraseña');
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-1.5 text-neutral-600 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
        title="Cambiar contraseña"
      >
        <KeyRound size={16} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <KeyRound size={18} className="text-indigo-400" />
                Cambiar Contraseña
              </h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-neutral-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <p className="text-sm text-neutral-400 mb-4">
                  Establecer nueva contraseña para <strong className="text-white">{nombreCompleto}</strong>.
                </p>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Nueva Contraseña</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center font-medium">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs text-center font-medium flex justify-center items-center gap-2">
                  <CheckCircle2 size={16} />
                  Contraseña actualizada con éxito
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || success}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {isPending ? (
                    <><Loader2 size={16} className="animate-spin" /> Guardando...</>
                  ) : (
                    'Guardar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
