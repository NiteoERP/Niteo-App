'use client';

import React, { useActionState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { requestPasswordReset } from './actions';

export default function RecuperarPasswordPage() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, null);

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center p-6 text-neutral-200 font-sans selection:bg-indigo-500/30 relative overflow-hidden">
      
      {/* Efecto de luz de fondo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-64 bg-indigo-900/20 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-[420px] space-y-8 relative z-10">
        
        {/* Encabezado */}
        <div className="text-center space-y-2">
          <Link href="/login" className="inline-flex justify-center mb-6 group">
            <img 
              src="/logo.png" 
              alt="Niteo Logo" 
              className="w-14 h-14 object-contain drop-shadow-[0_0_12px_rgba(99,102,241,0.5)] group-hover:scale-105 transition-transform" 
            />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Recuperar Contraseña
          </h1>
          <p className="text-neutral-400 text-sm max-w-sm mx-auto">
            Ingresa tu correo y te enviaremos un enlace para restablecer tu acceso.
          </p>
        </div>

        {/* Formulario / Mensaje de éxito */}
        <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
          {state?.success ? (
            <div className="space-y-6 text-center animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white">Correo enviado</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  {state.message}
                </p>
              </div>
              <Link 
                href="/login"
                className="inline-block w-full py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form action={formAction} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-300" htmlFor="email">
                  Correo electrónico
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="nombre@empresa.com"
                    className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm disabled:opacity-50"
                    required
                    disabled={isPending}
                  />
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                </div>
              </div>

              {state?.error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-in fade-in">
                  <p className="text-sm font-medium text-red-400 text-center">
                    {state.error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <><Loader2 size={18} className="animate-spin" /> Procesando...</>
                ) : (
                  'Enviar instrucciones'
                )}
              </button>

              <div className="pt-2 text-center">
                <Link 
                  href="/login" 
                  className="inline-flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                >
                  <ArrowLeft size={16} /> Volver a iniciar sesión
                </Link>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
