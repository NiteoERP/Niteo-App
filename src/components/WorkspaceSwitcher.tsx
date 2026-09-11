'use client';

import React, { useState } from 'react';
import { UserCircle, Check, Loader2 } from 'lucide-react';
import { switchEmpresaAction } from '@/actions/user-actions';

interface EmpresaOption {
  id: string;
  nombre_comercial: string;
}

interface WorkspaceSwitcherProps {
  userName: string;
  userRole: string;
  currentEmpresa: EmpresaOption;
  empresasDisponibles: EmpresaOption[];
}

export default function WorkspaceSwitcher({ userName, userRole, currentEmpresa, empresasDisponibles }: WorkspaceSwitcherProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleSwitch = async (empresaId: string) => {
    if (empresaId === currentEmpresa.id) return;
    setLoadingId(empresaId);
    await switchEmpresaAction(empresaId);
    // No reseteamos loadingId porque la acción hace redirect
  };

  return (
    <div className="hidden sm:flex items-center gap-3 border-l border-neutral-800 pl-3 md:pl-4 relative group">
      <div className="text-right">
        <p className="text-sm font-bold text-neutral-200">{userName}</p>
        <p className="text-xs text-indigo-400 font-semibold tracking-wide uppercase truncate max-w-[150px]">
          {currentEmpresa.nombre_comercial || userRole}
        </p>
      </div>
      
      <button className="w-10 h-10 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 flex items-center justify-center border border-indigo-500/20 shrink-0 transition-colors cursor-pointer focus:outline-none">
        <UserCircle size={24} className="text-indigo-400" />
      </button>

      {/* Menú desplegable flotante */}
      <div className="absolute top-full right-0 mt-3 w-64 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
        <div className="p-3 border-b border-neutral-800 bg-neutral-950/50">
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-bold mb-1">Cuentas Vinculadas</p>
        </div>
        <div className="max-h-60 overflow-y-auto p-2 space-y-1">
          {empresasDisponibles.map((emp) => {
            const isCurrent = emp.id === currentEmpresa.id;
            const isLoading = loadingId === emp.id;

            return (
              <button 
                key={emp.id}
                disabled={isCurrent || loadingId !== null}
                onClick={() => handleSwitch(emp.id)}
                className={`w-full text-left px-3 py-2.5 text-sm rounded-lg flex items-center justify-between transition-colors ${
                  isCurrent 
                    ? 'bg-indigo-500/10 text-indigo-400 font-bold cursor-default' 
                    : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                }`}
              >
                <span className="truncate pr-2">{emp.nombre_comercial}</span>
                {isCurrent && <Check size={16} className="text-indigo-400 shrink-0" />}
                {isLoading && <Loader2 size={16} className="text-indigo-400 shrink-0 animate-spin" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
