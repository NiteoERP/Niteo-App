'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Layout, Bell, Calendar, Settings, MapPin } from 'lucide-react';

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'General', href: '/dashboard/configuracion', icon: Layout },
    { name: 'Sedes y Master Key', href: '/dashboard/configuracion/sedes', icon: MapPin },
    // { name: 'Mensajes y Alertas', href: '#', icon: Bell },
    // { name: 'Día laborable', href: '#', icon: Calendar },
    // { name: 'Avanzado', href: '#', icon: Settings },
  ];

  return (
    <div className="max-w-5xl space-y-8 pb-16">
      
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Configuración</h1>
        <p className="text-neutral-400">Personaliza el comportamiento y la apariencia del sistema.</p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800/50 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Sidebar de Configuración */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-neutral-800/50 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors text-sm text-left ${
                  isActive 
                    ? 'bg-indigo-500/10 text-indigo-400' 
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Panel de Opciones (Contenido Dinámico) */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
