'use client';

import React, { useState } from 'react';
import { completarOnboarding } from '@/actions/onboarding-actions';

import { LogOut } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

function SubmitButton() {
  const [pending, setPending] = useState(false);
  
  return (
    <button
      type="submit"
      onClick={() => setTimeout(() => setPending(true), 10)}
      className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
    >
      {pending ? 'Configurando espacio...' : 'Crear mi empresa'}
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-8">
      <div className="w-full max-w-md relative space-y-8 bg-neutral-900 p-8 rounded-2xl border border-neutral-800">
        
        {/* Botón de escape / logout */}
        <button 
          onClick={handleLogout}
          className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors flex items-center gap-2 text-sm"
          title="Cerrar sesión"
        >
          <LogOut size={18} />
          <span>Salir</span>
        </button>

        <div className="text-center space-y-2 mt-4">
          <h1 className="text-2xl font-bold text-white tracking-tight">Falta un último paso</h1>
          <p className="text-neutral-400 text-sm">
            Detectamos que tu cuenta no tiene una empresa asociada. Por favor, ingresa los datos para crear tu espacio de trabajo.
          </p>
        </div>

        <form className="space-y-5" action={completarOnboarding}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300" htmlFor="fullName">
              Tu Nombre Completo
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Ej. Carlos Mendoza"
              className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300" htmlFor="companyName">
              Nombre de tu Restaurante
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              placeholder="Ej. Burger Station"
              className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              required
            />
          </div>

          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
