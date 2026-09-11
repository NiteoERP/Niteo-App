'use client';

import React, { useActionState, useState, useEffect } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, ArrowLeft, CheckCircle2, Mail, UserCircle, Loader2 } from 'lucide-react';
import { login } from './actions';
import { getSavedAccounts, switchAccount, SavedAccount } from '@/actions/vault-actions';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  useEffect(() => {
    getSavedAccounts().then((accounts) => {
      setSavedAccounts(accounts || []);
    });
  }, []);

  const handleQuickLogin = async (acc: SavedAccount) => {
    setSwitchingId(acc.id);
    const res = await switchAccount(acc.id);
    if (res?.error) {
      alert(res.error);
      setSwitchingId(null);
      // Actualizar la lista en caso de que se haya limpiado una cuenta expirada
      getSavedAccounts().then((accounts) => {
        setSavedAccounts(accounts || []);
      });
    } else {
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col md:flex-row text-neutral-200 font-sans selection:bg-indigo-500/30">
      
      {/* Lado Izquierdo - Branding y Decoración (Oculto en móvil) */}
      <div className="hidden md:flex md:w-1/2 bg-neutral-900 relative overflow-hidden flex-col justify-between p-12 lg:p-20 border-r border-neutral-800/50">
        {/* Efecto de luz abstracta - Tonos Indigo/Azul Eléctrico */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-500 via-neutral-900 to-neutral-950"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>
        
        <div className="relative z-10">
          <Link 
            href="/" 
            className="inline-flex items-center gap-3 group transition-all duration-200 hover:opacity-90"
            title="Volver a la página principal"
          >
            <img 
              src="/logo.png" 
              alt="Niteo Logo" 
              className="w-12 h-12 object-contain drop-shadow-[0_0_12px_rgba(99,102,241,0.5)] group-hover:scale-105 transition-transform" 
            />
            <span className="text-3xl font-black tracking-tighter text-white">Niteo</span>
          </Link>
        </div>

        {/* Copy central */}
        <div className="relative z-10 space-y-6 max-w-lg">
          <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
            Da luz y claridad a los números de tu negocio.
          </h2>
          <p className="text-neutral-400 text-base lg:text-lg leading-relaxed">
            El sistema de gestión integral diseñado para simplificar la administración de tu restaurante e inventario, impulsando decisiones más inteligentes.
          </p>
          
          {/* Bullets de valor */}
          <div className="pt-2 space-y-3">
            <div className="flex items-center gap-3 text-sm text-neutral-300">
              <CheckCircle2 size={18} className="text-indigo-400 shrink-0" />
              <span>Punto de Venta 100% Offline con sincronización en la nube</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-neutral-300">
              <CheckCircle2 size={18} className="text-indigo-400 shrink-0" />
              <span>Gestión de recetas y escandallos con costeo preciso</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-neutral-300">
              <CheckCircle2 size={18} className="text-indigo-400 shrink-0" />
              <span>Multi-moneda con actualización de tasa automática</span>
            </div>
          </div>

          {/* Tarjeta de preview interactiva */}
          <div className="mt-8 p-5 rounded-2xl bg-neutral-950/70 border border-neutral-800/80 backdrop-blur-md space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-neutral-200">Terminal POS Activo</span>
              </div>
              <span className="text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Sincronización en Tiempo Real
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-neutral-900/80 p-3 rounded-xl border border-neutral-800/60">
                <p className="text-[11px] text-neutral-500 font-medium">Ventas de Hoy</p>
                <p className="text-base font-bold text-white mt-0.5">$485.20</p>
              </div>
              <div className="bg-neutral-900/80 p-3 rounded-xl border border-neutral-800/60">
                <p className="text-[11px] text-neutral-500 font-medium">Margen Bruto</p>
                <p className="text-base font-bold text-indigo-400 mt-0.5">38.4%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer del branding */}
        <div className="relative z-10 text-xs text-neutral-500 pt-6">
          Desarrollado con ❤️ para negocios de alto rendimiento
        </div>
      </div>

      {/* Lado Derecho - Formulario de Login */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-20 bg-neutral-950 relative overflow-y-auto">
        
        {/* Luz tenue de fondo en móvil */}
        <div className="md:hidden absolute top-0 left-0 w-full h-64 bg-indigo-900/10 blur-3xl -translate-y-1/2 rounded-full"></div>

        <div className="w-full max-w-[420px] space-y-7 relative z-10 my-auto">
          
          {/* Botón sutil para volver a la página principal */}
          <div className="flex justify-between items-center">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} /> Volver a la página principal
            </Link>
          </div>

          <div className="text-center md:text-left space-y-2">
            {/* Logo solo visible en móvil */}
            <div className="md:hidden flex justify-center mb-5">
              <Link href="/" className="inline-flex items-center gap-2.5 group">
                <img src="/logo.png" alt="Niteo Logo" className="w-14 h-14 object-contain drop-shadow-[0_0_12px_rgba(99,102,241,0.5)] group-hover:scale-105 transition-transform" />
                <span className="text-2xl font-black tracking-tight text-white">Niteo</span>
              </Link>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Iniciar sesión
            </h2>
            <p className="text-neutral-400 text-sm">
              Ingresa tus credenciales para acceder a tu panel.
            </p>
          </div>

          {/* Cuentas Guardadas en este equipo (Estilo Google / Instagram) */}
          {savedAccounts.length > 0 && (
            <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Cuentas en este equipo
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {savedAccounts.map((acc) => {
                  const isSwitching = switchingId === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      disabled={switchingId !== null}
                      onClick={() => handleQuickLogin(acc)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-neutral-950/80 hover:bg-neutral-800/80 border border-neutral-800/80 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                          <UserCircle size={20} className="text-indigo-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                            {acc.nombre}
                          </p>
                          <p className="text-xs text-neutral-500 truncate">
                            {acc.empresa}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 ml-2">
                        {isSwitching ? (
                          <Loader2 size={16} className="text-indigo-400 animate-spin" />
                        ) : (
                          <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            Entrar
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-neutral-800"></div>
                <span className="flex-shrink mx-2 text-[11px] text-neutral-500 uppercase tracking-wider">O usa otra cuenta</span>
                <div className="flex-grow border-t border-neutral-800"></div>
              </div>
            </div>
          )}

          <form className="space-y-4" action={formAction}>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300" htmlFor="email">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="nombre@empresa.com"
                className="w-full px-4 py-3 bg-neutral-900/50 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all disabled:opacity-50 text-sm"
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-neutral-300" htmlFor="password">
                  Contraseña
                </label>
                <Link href="/recuperar" className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 bg-neutral-900/50 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all disabled:opacity-50 text-sm"
                  required
                  disabled={isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Mantener sesión iniciada */}
            <div className="flex items-center gap-2 pt-1">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded bg-neutral-900 border-neutral-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-neutral-950 accent-indigo-600 cursor-pointer"
              />
              <label htmlFor="remember" className="text-xs text-neutral-400 cursor-pointer select-none">
                Mantener sesión iniciada en este equipo
              </label>
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
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition-all duration-200 active:scale-[0.98] mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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

          <p className="text-center text-sm text-neutral-400 pt-2">
            ¿No tienes una cuenta?{' '}
            <Link href="/register" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
              Crear cuenta
            </Link>
          </p>

          {/* Ayuda y Soporte exclusivo por correo */}
          <div className="pt-5 border-t border-neutral-800/80 text-center">
            <p className="text-xs text-neutral-500 flex items-center justify-center gap-1.5">
              <Mail size={14} className="text-neutral-400 shrink-0" />
              ¿Problemas para acceder?{' '}
              <a 
                href="mailto:niteosupport@gmail.com" 
                className="text-indigo-400 hover:underline font-medium"
              >
                Contáctanos a soporte
              </a>
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
