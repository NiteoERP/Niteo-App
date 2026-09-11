'use client';

import React, { useState, useEffect } from 'react';
import { UserCircle, Check, Loader2, Plus, LogOut } from 'lucide-react';
import { switchAccount, removeSavedAccount, saveCurrentSessionToVault, SavedAccount } from '@/actions/vault-actions';
import { useRouter } from 'next/navigation';

interface AccountSwitcherProps {
  currentUserId: string;
  currentUserName: string;
  currentUserRole: string; // We pass the company name here
  savedAccounts: SavedAccount[];
}

export default function AccountSwitcher({ currentUserId, currentUserName, currentUserRole, savedAccounts }: AccountSwitcherProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Sincroniza la sesión actual en la bóveda de cuentas de forma segura desde el cliente
    saveCurrentSessionToVault().catch(console.error);
  }, [currentUserId]);

  const handleSwitch = async (account: SavedAccount) => {
    if (account.id === currentUserId) return;
    setLoadingId(account.id);
    const res = await switchAccount(account.refresh_token);
    if (res?.error) {
      alert(res.error);
      setLoadingId(null);
    }
  };

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await removeSavedAccount(id);
  };

  return (
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
      <div className="absolute top-full right-0 mt-3 w-72 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
        <div className="p-3 border-b border-neutral-800 bg-neutral-950/50">
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-bold mb-1">Cuentas Guardadas</p>
        </div>
        
        <div className="max-h-60 overflow-y-auto p-2 space-y-1">
          {savedAccounts.map((acc) => {
            const isCurrent = acc.id === currentUserId;
            const isLoading = loadingId === acc.id;

            return (
              <div 
                key={acc.id}
                onClick={() => !isCurrent && handleSwitch(acc)}
                className={`w-full text-left px-3 py-2.5 text-sm rounded-lg flex items-center justify-between transition-colors ${
                  isCurrent 
                    ? 'bg-indigo-500/10 text-indigo-400 cursor-default' 
                    : 'text-neutral-300 hover:bg-neutral-800 hover:text-white cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <UserCircle size={28} className={isCurrent ? "text-indigo-400 shrink-0" : "text-neutral-500 shrink-0"} />
                  <div className="min-w-0">
                    <p className="font-bold truncate">{acc.nombre}</p>
                    <p className="text-xs opacity-70 truncate">{acc.empresa}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  {isLoading && <Loader2 size={16} className="text-indigo-400 animate-spin" />}
                  {isCurrent && !isLoading && <Check size={18} className="text-indigo-400" />}
                  {!isCurrent && !isLoading && (
                    <button 
                      onClick={(e) => handleRemove(e, acc.id)}
                      className="p-1 hover:bg-red-500/20 text-neutral-500 hover:text-red-400 rounded transition-colors"
                      title="Quitar cuenta"
                    >
                      <LogOut size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-2 border-t border-neutral-800">
          <button 
            onClick={() => router.push('/login')}
            className="w-full text-left px-3 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-3 font-medium"
          >
            <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center shrink-0">
              <Plus size={16} className="text-neutral-400" />
            </div>
            Agregar cuenta existente
          </button>
        </div>
      </div>
    </div>
  );
}
