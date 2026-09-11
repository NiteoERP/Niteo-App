'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserCircle, Check, Loader2, Plus, LogOut, X, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { switchAccount, removeSavedAccount, saveCurrentSessionToVault, addAccountToVault, SavedAccount } from '@/actions/vault-actions';
import { useRouter } from 'next/navigation';

interface AccountSwitcherProps {
  currentUserId: string;
  currentUserName: string;
  currentUserRole: string; // Empresa
  savedAccounts: SavedAccount[];
}

export default function AccountSwitcher({ currentUserId, currentUserName, currentUserRole, savedAccounts }: AccountSwitcherProps) {
  const [mounted, setMounted] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    // Sincroniza la sesión actual en la bóveda de cuentas de forma segura desde el cliente
    saveCurrentSessionToVault().catch(console.error);
  }, [currentUserId]);

  const handleSwitch = async (account: SavedAccount) => {
    if (account.id === currentUserId) return;
    setLoadingId(account.id);
    const res = await switchAccount(account.id);
    if (res?.error) {
      alert(res.error);
      setLoadingId(null);
      router.refresh();
    } else {
      window.location.href = '/dashboard';
    }
  };

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await removeSavedAccount(id);
    router.refresh();
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddLoading(true);

    const formData = new FormData();
    formData.append('email', addEmail);
    formData.append('password', addPassword);

    const res = await addAccountToVault(formData);
    if (res?.error) {
      setAddError(res.error);
      setAddLoading(false);
    } else {
      window.location.href = '/dashboard';
    }
  };

  return (
    <>
      <div className="hidden sm:flex items-center gap-3 border-l border-neutral-800 pl-3 md:pl-4 relative group">
        <div className="text-right">
          <p className="text-sm font-bold text-neutral-200">{currentUserName}</p>
          <p className="text-xs text-indigo-400 font-semibold tracking-wide uppercase truncate max-w-[150px]">
            {currentUserRole}
          </p>
        </div>
        
        <button className="w-10 h-10 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 flex items-center justify-center border border-indigo-500/20 shrink-0 transition-colors cursor-pointer focus:outline-none">
          <UserCircle size={24} className="text-indigo-400" />
        </button>

        {/* Menú desplegable flotante */}
        <div className="absolute top-full right-0 mt-3 w-80 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
          <div className="p-3 border-b border-neutral-800 bg-neutral-950/50 flex items-center justify-between">
            <p className="text-xs text-neutral-400 uppercase tracking-wider font-bold">Cuentas Vinculadas</p>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-medium px-2 py-0.5 rounded-full border border-indigo-500/30">
              {savedAccounts.length} {savedAccounts.length === 1 ? 'cuenta' : 'cuentas'}
            </span>
          </div>
          
          <div className="max-h-64 overflow-y-auto p-2 space-y-1">
            {savedAccounts.map((acc) => {
              const isCurrent = acc.id === currentUserId;
              const isLoading = loadingId === acc.id;

              return (
                <div 
                  key={acc.id}
                  onClick={() => !isCurrent && handleSwitch(acc)}
                  className={`w-full text-left px-3 py-2.5 text-sm rounded-lg flex items-center justify-between transition-colors ${
                    isCurrent 
                      ? 'bg-indigo-500/10 text-indigo-400 cursor-default border border-indigo-500/20' 
                      : 'text-neutral-300 hover:bg-neutral-800 hover:text-white cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserCircle size={28} className={isCurrent ? "text-indigo-400 shrink-0" : "text-neutral-500 shrink-0"} />
                    <div className="min-w-0">
                      <p className="font-bold truncate text-sm">{acc.nombre}</p>
                      <p className="text-xs opacity-70 truncate text-neutral-400">{acc.empresa}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    {isLoading && <Loader2 size={16} className="text-indigo-400 animate-spin" />}
                    {isCurrent && !isLoading && <Check size={18} className="text-indigo-400" />}
                    {!isCurrent && !isLoading && (
                      <button 
                        onClick={(e) => handleRemove(e, acc.id)}
                        className="p-1.5 hover:bg-red-500/20 text-neutral-500 hover:text-red-400 rounded-lg transition-colors"
                        title="Desvincular cuenta"
                      >
                        <LogOut size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-2 border-t border-neutral-800 bg-neutral-950/30">
            <button 
              onClick={() => { setIsAddModalOpen(true); setAddError(null); }}
              className="w-full text-left px-3 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800/80 rounded-lg transition-colors flex items-center gap-3 font-medium cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                <Plus size={16} />
              </div>
              <span>Conectar otra cuenta</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Conectar otra cuenta (Renderizado con Portal fuera del header para evitar bugs de CSS) */}
      {isAddModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 sm:p-7 shadow-2xl shadow-black/80 relative overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Luz de acento estilo Niteo */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-indigo-500/15 blur-2xl pointer-events-none rounded-full" />

            {/* Botón cerrar */}
            <button 
              onClick={() => { setIsAddModalOpen(false); setAddError(null); }}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800/60 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Encabezado */}
            <div className="flex items-center gap-3.5 mb-5 relative z-10">
              <img 
                src="/logo.png" 
                alt="Niteo" 
                className="w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
              />
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Conectar otra cuenta</h3>
                <p className="text-xs text-neutral-400">
                  Alterna entre tus empresas con un solo clic.
                </p>
              </div>
            </div>

            {addError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddAccount} className="space-y-4 relative z-10">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Mail size={14} className="text-neutral-500" />
                  Correo Electrónico
                </label>
                <input 
                  type="email"
                  required
                  placeholder="usuario@empresa.com"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Lock size={14} className="text-neutral-500" />
                  Contraseña
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setAddError(null); }}
                  className="flex-1 py-2.5 px-4 bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {addLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Conectando...</span>
                    </>
                  ) : (
                    <span>Iniciar y Vincular</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

