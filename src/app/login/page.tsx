'use client';

import React, { useActionState } from 'react';
import Link from 'next/link';
import { login } from './actions';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col md:flex-row text-neutral-200 font-sans selection:bg-indigo-500/30">
      
      {/* Lado Izquierdo - Branding y Decoración (Oculto en móvil) */}
      <div className="hidden md:flex md:w-1/2 bg-neutral-900 relative overflow-hidden flex-col justify-between p-12 lg:p-24 border-r border-neutral-800/50">
        {/* Efecto de luz abstracta - Tonos Indigo/Azul Eléctrico */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-500 via-neutral-900 to-neutral-950"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>
        
        {/* Logo superior */}
        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tighter text-white flex items-center gap-3">
            <img src="/logo.png" alt="Niteo Logo" className="w-10 h-10 object-contain drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
            Niteo
          </h1>
        </div>

        {/* Copy central */}
        <div className="relative z-10 space-y-6 max-w-lg mb-12">
          <h2 className="text-4xl lg:text-5xl font-medium text-white leading-tight">
            Da luz y claridad a los números de tu negocio.
          </h2>
          <p className="text-neutral-400 text-lg leading-relaxed">
            El sistema de gestión integral diseñado para simplificar la administración de tu restaurante e inventario, impulsando decisiones más inteligentes.
          </p>
        </div>
      </div>

      {/* Lado Derecho - Formulario de Login */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-neutral-950 relative">
        
        {/* Luz tenue de fondo en móvil */}
        <div className="md:hidden absolute top-0 left-0 w-full h-64 bg-indigo-900/10 blur-3xl -translate-y-1/2 rounded-full"></div>

        <div className="w-full max-w-[420px] space-y-10 relative z-10">
          
          <div className="text-center md:text-left space-y-3">
            {/* Logo solo visible en móvil */}
            <div className="md:hidden flex justify-center mb-8">
              <img src="/logo.png" alt="Niteo Logo" className="w-12 h-12 object-contain drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Bienvenido de vuelta
            </h2>
            <p className="text-neutral-400">
              Ingresa tus credenciales para acceder a tu panel.
            </p>
          </div>

          <form className="space-y-6" action={formAction}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300" htmlFor="email">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="nombre@empresa.com"
                className="w-full px-4 py-3.5 bg-neutral-900/50 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all disabled:opacity-50"
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-neutral-300" htmlFor="password">
                  Contraseña
                </label>
                <Link href="/recuperar" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3.5 bg-neutral-900/50 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all disabled:opacity-50"
                required
                disabled={isPending}
              />
            </div>

            {/* Mensaje de Error */}
            {state?.error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-sm font-medium text-red-400 text-center">
                  {state.error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition-all duration-200 active:scale-[0.98] mt-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Cargando...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

        </div>
      </div>

    </div>
  );
}
