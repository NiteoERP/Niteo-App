'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { registrarUsuario } from '@/actions/auth-actions';

function SubmitButton() {
  const [pending, setPending] = useState(false);
  
  return (
    <button
      type="submit"
      onClick={() => setTimeout(() => setPending(true), 10)}
      className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition-all duration-200 active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
    >
      {pending ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Creando ecosistema...
        </>
      ) : (
        'Crear cuenta'
      )}
    </button>
  );
}

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col md:flex-row text-neutral-200 font-sans selection:bg-indigo-500/30">
      
      {/* Lado Izquierdo - Branding y Decoración (Oculto en móvil) */}
      <div className="hidden md:flex md:w-1/2 bg-neutral-900 relative overflow-hidden flex-col justify-between p-12 lg:p-24 border-r border-neutral-800/50">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-500 via-neutral-900 to-neutral-950"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>
        
        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tighter text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <span className="text-white text-2xl font-bold leading-none tracking-tighter">N</span>
            </div>
            Niteo
          </h1>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg mb-12">
          <h2 className="text-4xl lg:text-5xl font-medium text-white leading-tight">
            Comienza a escalar tu restaurante hoy.
          </h2>
          <p className="text-neutral-400 text-lg leading-relaxed">
            Crea tu cuenta en segundos. Niteo desplegará automáticamente la infraestructura de tu primera sede para que empieces a registrar ventas de inmediato.
          </p>
        </div>
      </div>

      {/* Lado Derecho - Formulario de Registro */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-16 bg-neutral-950 relative overflow-y-auto">
        
        <div className="md:hidden absolute top-0 left-0 w-full h-64 bg-indigo-900/10 blur-3xl -translate-y-1/2 rounded-full pointer-events-none"></div>

        <div className="w-full max-w-[420px] space-y-8 relative z-10 py-8">
          
          <div className="text-center md:text-left space-y-3">
            <div className="md:hidden flex justify-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <span className="text-white text-3xl font-bold leading-none tracking-tighter">N</span>
              </div>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Crear tu cuenta
            </h2>
            <p className="text-neutral-400">
              Ingresa los datos para configurar tu espacio de trabajo.
            </p>
          </div>

          <form className="space-y-5" action={registrarUsuario}>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300" htmlFor="fullName">
                Nombre Completo
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Ej. Carlos Mendoza"
                className="w-full px-4 py-3.5 bg-neutral-900/50 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
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
                className="w-full px-4 py-3.5 bg-neutral-900/50 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300" htmlFor="email">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="nombre@empresa.com"
                className="w-full px-4 py-3.5 bg-neutral-900/50 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300" htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3.5 bg-neutral-900/50 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-sm font-medium text-red-400 text-center">
                  {error}
                </p>
              </div>
            )}

            <SubmitButton />
          </form>

          <p className="text-center text-sm text-neutral-400">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/login" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
              Iniciar sesión
            </Link>
          </p>

        </div>
      </div>

    </div>
  );
}
