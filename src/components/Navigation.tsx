'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, TrendingUp, 
  Package, 
  Truck, 
  ShoppingCart, 
  Users, 
  Settings, 
  UserCircle,
  ShieldAlert,
  FileText,
  Wallet,
  Menu,
  X 
} from 'lucide-react';

interface NavProps {
  permisos: string[];
  userRole: string;
}

export function SidebarNav({ permisos, userRole }: NavProps) {
  const pathname = usePathname();
  const hasPerm = (p: string) => permisos.includes(p) || userRole === 'MASTER';

  const getLinkClass = (path: string, exact = false) => {
    const isActive = exact ? pathname === path : pathname.startsWith(path);
    return isActive
      ? "flex items-center gap-3 px-3 py-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 transition-colors border border-indigo-500/10"
      : "flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white transition-colors";
  };

  return (
    <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
      {hasPerm('dashboard') && (
        <Link href="/dashboard" className={getLinkClass('/dashboard', true)}>
          <LayoutDashboard size={20} />
          <span className="text-sm font-medium">Inicio</span>
        </Link>
      )}
      
            {hasPerm('caja') && (
        <Link href="/dashboard/caja" className={getLinkClass('/dashboard/caja')}>
          <Wallet size={20} />
          <span className="text-sm font-medium">Cierre de Caja</span>
        </Link>
      )}

      {hasPerm('inventario') && (
        <Link href="/dashboard/inventario" className={getLinkClass('/dashboard/inventario')}>
          <Package size={20} />
          <span className="text-sm font-medium">Inventario</span>
        </Link>
      )}

      {hasPerm('pos') && (
        <Link href="/dashboard/ventas" className={getLinkClass('/dashboard/ventas')}>
          <ShoppingCart size={20} />
          <span className="text-sm font-medium">Ventas</span>
        </Link>
      )}

      {hasPerm('reportes') && (
        <Link href="/dashboard/informes" className={getLinkClass('/dashboard/informes')}>
          <FileText size={20} />
          <span className="text-sm font-medium">Informes</span>
        </Link>
      )}
      {(hasPerm('reportes') || userRole === 'MASTER') && (
        <Link href="/dashboard/finanzas" className={getLinkClass('/dashboard/finanzas')}>
          <TrendingUp size={20} />
          <span className="text-sm font-medium">Finanzas</span>
        </Link>
      )}
      
      {(hasPerm('inventario') || hasPerm('pos')) && (
        <Link href="/dashboard/despachos" className={getLinkClass('/dashboard/despachos')}>
          <Truck size={20} />
          <span className="text-sm font-medium">Despachos</span>
        </Link>
      )}

      {hasPerm('compras') && (
        <>
          <Link href="/dashboard/compras" className={getLinkClass('/dashboard/compras')}>
            <ShoppingCart size={20} />
            <span className="text-sm font-medium">Compras</span>
          </Link>
          <Link href="/dashboard/proveedores" className={getLinkClass('/dashboard/proveedores')}>
            <Truck size={20} />
            <span className="text-sm font-medium">Proveedores (CxP)</span>
          </Link>
        </>
      )}

      {hasPerm('clientes') && (
        <>
          <Link href="/dashboard/clientes" className={getLinkClass('/dashboard/clientes')}>
            <Users size={20} className="shrink-0" />
            <span className="font-medium">Directorio</span>
          </Link>
          <Link href="/dashboard/creditos" className={getLinkClass('/dashboard/creditos')}>
            <Wallet size={20} className="shrink-0 text-emerald-400" />
            <span className="font-medium">Cuentas por Cobrar</span>
          </Link>
          <Link href="/dashboard/equipo" className={getLinkClass('/dashboard/equipo')}>
            <UserCircle size={20} />
            <span className="text-sm font-medium">Equipo</span>
          </Link>
        </>
      )}
    </nav>
  );
}

export function SidebarBottom({ permisos, userRole }: NavProps) {
  const pathname = usePathname();
  const hasPerm = (p: string) => permisos.includes(p) || userRole === 'MASTER';

  const getLinkClass = (path: string, exact = false) => {
    const isActive = exact ? pathname === path : pathname.startsWith(path);
    return isActive
      ? "flex items-center gap-3 px-3 py-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 transition-colors border border-indigo-500/10"
      : "flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white transition-colors";
  };

  return (
    <div className="p-4 border-t border-neutral-800 shrink-0 space-y-1">
      {hasPerm('auditoria') && (
        <Link href="/dashboard/auditoria" className={getLinkClass('/dashboard/auditoria')}>
          <ShieldAlert size={20} />
          <span className="text-sm font-medium">Auditoría</span>
        </Link>
      )}
      {hasPerm('ajustes') && (
        <Link href="/dashboard/configuracion" className={getLinkClass('/dashboard/configuracion')}>
          <Settings size={20} />
          <span className="text-sm font-medium">Ajustes</span>
        </Link>
      )}
    </div>
  );
}

export function MobileNav({ permisos, userRole }: NavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const hasPerm = (p: string) => permisos.includes(p) || userRole === 'MASTER';

  // Clases del ítem de la barra inferior
  const navItem = (path: string, exact = false) => {
    const isActive = exact ? pathname === path : pathname.startsWith(path);
    return {
      link: `relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
        isActive ? 'text-indigo-400' : 'text-neutral-500 active:text-white'
      }`,
      isActive,
    };
  };

  // Clases del ítem del drawer
  const drawerItem = (path: string) => {
    const isActive = pathname.startsWith(path);
    return isActive
      ? 'flex items-center gap-4 px-4 py-4 rounded-2xl bg-indigo-500/10 text-indigo-400 font-semibold'
      : 'flex items-center gap-4 px-4 py-4 rounded-2xl text-neutral-300 active:bg-neutral-800 font-medium transition-colors';
  };

  return (
    <>
      {/* ── BOTTOM SHEET DRAWER (Más Módulos) ────────────────────── */}
      {menuOpen && (
        <>
          {/* Backdrop — tap to close */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          {/* Sheet */}
          <div className="md:hidden fixed bottom-0 inset-x-0 z-50
                          bg-neutral-900 border-t border-neutral-800 rounded-t-3xl
                          animate-in slide-in-from-bottom duration-300
                          pb-[env(safe-area-inset-bottom)]
                          max-h-[80dvh] flex flex-col">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-10 h-1 rounded-full bg-neutral-700" />
            </div>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-6 pb-3 shrink-0">
              Todos los Módulos
            </p>

            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1 custom-scrollbar">
              {hasPerm('inventario') && (
                <Link href="/dashboard/inventario" onClick={() => setMenuOpen(false)} className={drawerItem('/dashboard/inventario')}>
                  <Package size={22} /> Inventario
                </Link>
              )}
              {hasPerm('reportes') && (
                <Link href="/dashboard/informes" onClick={() => setMenuOpen(false)} className={drawerItem('/dashboard/informes')}>
                  <FileText size={22} /> Informes
                </Link>
              )}
              {(hasPerm('reportes') || userRole === 'MASTER') && (
                <Link href="/dashboard/finanzas" onClick={() => setMenuOpen(false)} className={drawerItem('/dashboard/finanzas')}>
                  <TrendingUp size={22} /> Finanzas
                </Link>
              )}
              {(hasPerm('inventario') || hasPerm('pos')) && (
                <Link href="/dashboard/despachos" onClick={() => setMenuOpen(false)} className={drawerItem('/dashboard/despachos')}>
                  <Truck size={22} /> Despachos
                </Link>
              )}
              {hasPerm('compras') && (
                <Link href="/dashboard/proveedores" onClick={() => setMenuOpen(false)} className={drawerItem('/dashboard/proveedores')}>
                  <Truck size={22} /> Proveedores (CxP)
                </Link>
              )}
              {hasPerm('clientes') && (
                <Link href="/dashboard/clientes" onClick={() => setMenuOpen(false)} className={drawerItem('/dashboard/clientes')}>
                  <Users size={22} /> Clientes
                </Link>
              )}
              {hasPerm('creditos') && (
                <Link href="/dashboard/creditos" onClick={() => setMenuOpen(false)} className={drawerItem('/dashboard/creditos')}>
                  <Wallet size={22} /> Cuentas por Cobrar
                </Link>
              )}
              {hasPerm('equipo') && (
                <Link href="/dashboard/equipo" onClick={() => setMenuOpen(false)} className={drawerItem('/dashboard/equipo')}>
                  <Users size={22} /> Equipo
                </Link>
              )}
              {(hasPerm('ajustes') || hasPerm('auditoria')) && (
                <Link href="/dashboard/auditoria" onClick={() => setMenuOpen(false)} className={drawerItem('/dashboard/auditoria')}>
                  <ShieldAlert size={22} /> Auditoría
                </Link>
              )}
              {(hasPerm('ajustes') || hasPerm('auditoria')) && (
                <Link href="/dashboard/configuracion" onClick={() => setMenuOpen(false)} className={drawerItem('/dashboard/configuracion')}>
                  <Settings size={22} /> Ajustes Generales
                </Link>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── BOTTOM NAVIGATION BAR ─────────────────────────────────── */}
      {/* h-16 visible + padding seguro en dispositivos con home bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30
                      bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800
                      flex items-stretch
                      h-[calc(4rem+env(safe-area-inset-bottom))]
                      pb-[env(safe-area-inset-bottom)]">

        {hasPerm('dashboard') && (() => {
          const { link, isActive } = navItem('/dashboard', true);
          return (
            <Link href="/dashboard" onClick={() => setMenuOpen(false)} className={link}>
              {isActive && <span className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-indigo-500" />}
              <LayoutDashboard size={22} />
              <span className="text-[10px] font-medium">Inicio</span>
            </Link>
          );
        })()}

        {hasPerm('pos') && (() => {
          const { link, isActive } = navItem('/dashboard/ventas');
          return (
            <Link href="/dashboard/ventas" onClick={() => setMenuOpen(false)} className={link}>
              {isActive && <span className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-indigo-500" />}
              <ShoppingCart size={22} />
              <span className="text-[10px] font-medium">Ventas</span>
            </Link>
          );
        })()}

        {hasPerm('compras') && (() => {
          const { link, isActive } = navItem('/dashboard/compras');
          return (
            <Link href="/dashboard/compras" onClick={() => setMenuOpen(false)} className={link}>
              {isActive && <span className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-indigo-500" />}
              <Package size={22} />
              <span className="text-[10px] font-medium">Compras</span>
            </Link>
          );
        })()}

        {hasPerm('caja') && (() => {
          const { link, isActive } = navItem('/dashboard/caja');
          return (
            <Link href="/dashboard/caja" onClick={() => setMenuOpen(false)} className={link}>
              {isActive && <span className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-indigo-500" />}
              <Wallet size={22} />
              <span className="text-[10px] font-medium">Caja</span>
            </Link>
          );
        })()}

        {/* Botón "Más" — abre el bottom sheet */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
            menuOpen ? 'text-indigo-400' : 'text-neutral-500 active:text-white'
          }`}
        >
          {menuOpen && <span className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-indigo-500" />}
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
          <span className="text-[10px] font-medium">{menuOpen ? 'Cerrar' : 'Más'}</span>
        </button>
      </nav>
    </>
  );
}




