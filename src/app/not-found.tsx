import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-neutral-200 selection:bg-indigo-500/30">
      <div className="relative max-w-md w-full bg-neutral-900/80 border border-neutral-800 p-8 rounded-3xl text-center backdrop-blur-xl shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <img 
              src="/logo.png" 
              alt="Niteo Logo" 
              className="w-16 h-16 object-contain drop-shadow-[0_0_20px_rgba(99,102,241,0.5)]" 
            />
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-4">
          Error 404
        </span>

        <h1 className="text-2xl font-black text-white tracking-tight mb-2">
          Módulo o Página no disponible
        </h1>

        <p className="text-sm text-neutral-400 leading-relaxed mb-8">
          La ruta que intentas consultar no existe o tu perfil de usuario no cuenta con los permisos necesarios para este módulo.
        </p>

        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-5 rounded-xl transition-all shadow-lg shadow-indigo-600/20"
          >
            <LayoutDashboard size={18} />
            <span>Volver al Inicio</span>
          </Link>

          <Link
            href="/dashboard/caja"
            className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium py-2.5 px-4 rounded-xl transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            <span>Ir a Cierres de Caja</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
