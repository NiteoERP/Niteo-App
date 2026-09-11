'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import { translateAuthError } from '@/utils/errors';

export default function ActualizarPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Verificar si el usuario realmente viene de un link de recuperación (tiene sesión)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // En caso de que el fragmento en la URL (Hash) tarde un poco en procesarse, 
        // supabase.auth.onAuthStateChange lo detectará.
        supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY' || session) {
            setSessionChecked(true);
          } else {
            setError('Enlace inválido o expirado. Por favor, solicita uno nuevo.');
            setSessionChecked(true);
          }
        });
      } else {
        setSessionChecked(true);
      }
    });
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setIsPending(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    setIsPending(false);

    if (updateError) {
      setError(translateAuthError(updateError.message));
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    }
  };

  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center p-6 text-neutral-200 font-sans selection:bg-indigo-500/30">
      <div className="w-full max-w-[420px] space-y-8 relative z-10">
        
        <div className="text-center space-y-2">
          <div className="inline-flex justify-center mb-6">
            <img src="/logo.png" alt="Niteo Logo" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Actualizar Contraseña
          </h1>
          <p className="text-neutral-400 text-sm">
            Ingresa tu nueva contraseña para acceder a tu cuenta.
          </p>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
          {success ? (
            <div className="space-y-6 text-center animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white">¡Contraseña Actualizada!</h3>
                <p className="text-sm text-neutral-400">
                  Redirigiendo a tu panel...
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-300">Nueva Contraseña</label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    required
                    disabled={isPending}
                  />
                  <KeyRound size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-300">Confirmar Contraseña</label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    required
                    disabled={isPending}
                  />
                  <KeyRound size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-sm font-medium text-red-400 text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isPending ? <><Loader2 size={18} className="animate-spin" /> Guardando...</> : 'Actualizar contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
