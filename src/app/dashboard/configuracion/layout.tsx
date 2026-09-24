'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Building2, 
  DollarSign, 
  CreditCard, 
  Package, 
  MonitorSmartphone, 
  Globe, 
  MapPin, 
  Database, 
  Sliders 
} from 'lucide-react';

interface NavGroup {
  group: string;
  items: {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    desc?: string;
  }[];
}

const navGroups: NavGroup[] = [
  {
    group: 'Empresa',
    items: [
      { name: 'Perfil General', href: '/dashboard/configuracion', icon: Building2, desc: 'Nombre, rubro y zona horaria' },
      { name: 'Monedas & Tasas', href: '/dashboard/configuracion/tasas', icon: DollarSign, desc: 'Tasa oficial BCV y multimoneda' },
      { name: 'Métodos de Pago', href: '/dashboard/configuracion/pagos', icon: CreditCard, desc: 'Cobros de ventas y compras' },
      { name: 'Inventario & Costeo', href: '/dashboard/configuracion/inventario', icon: Package, desc: 'Valoración de stock y despachos' },
    ],
  },
  {
    group: 'Ventas & Canales',
    items: [
      { name: 'Terminales POS', href: '/dashboard/configuracion/terminales', icon: MonitorSmartphone, desc: 'Cajas físicas y terminales' },
      { name: 'Catálogo Online', href: '/dashboard/configuracion/catalogo', icon: Globe, desc: 'Catálogo público y WhatsApp' },
    ],
  },
  {
    group: 'Sistema & Avanzado',
    items: [
      { name: 'Sedes & Sucursales', href: '/dashboard/configuracion/sedes', icon: MapPin, desc: 'Gestión de sucursales y llaves' },
      { name: 'Migración de Datos', href: '/dashboard/configuracion/migracion', icon: Database, desc: 'Importar Excel / CSV' },
      { name: 'API & Integraciones', href: '/dashboard/configuracion/integraciones', icon: Sliders, desc: 'Webhooks y claves API' },
    ],
  },
];

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isItemActive = (href: string) => {
    if (href === '/dashboard/configuracion') {
      return pathname === '/dashboard/configuracion';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="max-w-6xl space-y-6 pb-16 animate-in fade-in duration-200">
      
      {/* Encabezado Principal */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Configuración</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Administra las preferencias generales, operaciones comerciales y parámetros del sistema.
        </p>
      </div>

      {/* Navegación Móvil (Horizontal Scrollable Chips) */}
      <div className="md:hidden overflow-x-auto pb-2 -mx-4 px-4 flex gap-2 no-scrollbar">
        {navGroups.flatMap(g => g.items).map((item) => {
          const active = isItemActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 ${
                active
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Icon size={14} className={active ? 'text-white' : 'text-neutral-400'} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Contenedor Principal (Dos columnas en desktop) */}
      <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[640px]">
        
        {/* Sidebar de Secciones (Desktop) */}
        <aside className="hidden md:block w-72 border-r border-neutral-800/80 p-4 space-y-6 bg-neutral-950/40 shrink-0">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-1.5">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-3">
                {group.group}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isItemActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group w-full flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                        active
                          ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-semibold shadow-sm'
                          : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/50 font-medium'
                      }`}
                    >
                      <div className={`mt-0.5 p-1 rounded-lg transition-colors shrink-0 ${
                        active ? 'text-indigo-400 bg-indigo-500/10' : 'text-neutral-500 group-hover:text-neutral-300'
                      }`}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm leading-tight ${active ? 'text-white font-semibold' : ''}`}>
                          {item.name}
                        </p>
                        {item.desc && (
                          <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                            {item.desc}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        {/* Panel de Contenido */}
        <main className="flex-1 p-5 sm:p-7 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
