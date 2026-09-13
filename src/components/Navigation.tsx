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
  X,
  MonitorSmartphone
} from 'lucide-react';

interface NavProps {
  permisos: string[];
  userRole: string;
  modulosActivos?: string[];
  planSuscripcion?: string;
}

export function SidebarNav({ permisos, userRole, modulosActivos = [], planSuscripcion = 'STARTER' }: NavProps) {
  const pathname = usePathname();
  const hasPerm = (p: string) => {
    if (userRole === 'MASTER' || userRole === 'SUPERADMIN') return true;
    if (permisos.includes(p)) return true;
    if (p === 'caja' && (permisos.includes('finanzas') || userRole === 'CAJERO')) return true;
    if (p === 'finanzas' && permisos.includes('caja')) return true;
    if (p === 'equipo' && (permisos.includes('usuarios') || permisos.includes('equipo'))) return true;
    if (p === 'usuarios' && (permisos.includes('usuarios') || permisos.includes('equipo'))) return true;
    return false;
  };

  const getLinkClass = (path: string, exact = false) => {
    const isActive = exact ? pathname === path : pathname.startsWith(path);
    return isActive
      ? "flex items-center gap-3 px-3 py-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 transition-colors border border-indigo-500/10"
      : "flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white transition-colors";
  };

  return (
    <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
      <Link href="/dashboard" className={getLinkClass('/dashboard', true)}>
        <LayoutDashboard size={20} />
        <span className="text-sm font-medium">Inicio</span>
      </Link>
      
            {hasPerm('caja') && (
        <Link href="/dashboard/caja" className={getLinkClass('/dashboard/caja')}>
          <Wallet size={20} />
          <span className="text-sm font-medium">Cierre de Caja</span>
        </Link>
      )}

      {hasPerm('inventario') && (
        <Link href="/dashboard/catalogo" className={getLinkClass('/dashboard/catalogo')}>
          <ShoppingCart size={20} />
          <span className="text-sm font-medium">CatÃ¡logo de Ventas</span>
        </Link>
      )}

      {hasPerm('inventario') && (
        <Link href="/dashboard/inventario" className={getLinkClass('/dashboard/inventario')}>
          <Package size={20} />
          <span className="text-sm font-medium">Inventario</span>
        </Link>
      )}

      {hasPerm('pos') && (
        <>
          <Link href="/dashboard/terminal" className={getLinkClass('/dashboard/terminal')}>
            <MonitorSmartphone size={20} />
            <span className="text-sm font-medium">Nueva Venta</span>
          </Link>
          <Link href="/dashboard/documentos/nuevo" className={getLinkClass('/dashboard/documentos/nuevo')}>
            <FileText size={20} />
            <span className="text-sm font-medium">FacturaciÃƒÂ³n</span>
          </Link>
          <Link href="/dashboard/ventas" className={getLinkClass('/dashboard/ventas')}>
            <ShoppingCart size={20} />
            <span className="text-sm font-medium">Historial</span>
          </Link>
        </>
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
      
      {/* MÃƒÂ³dulo Despachos: incluido de forma nativa en PRO y ENTERPRISE (mÃƒÂºltiples sedes) */}
      {(planSuscripcion?.toUpperCase() === 'PRO' || planSuscripcion?.toUpperCase() === 'ENTERPRISE') && (hasPerm('inventario') || hasPerm('pos')) && (
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
            <span className="text-sm font-medium">Proveedores</span>
          </Link>
        </>
      )}

      {hasPerm('clientes') && (
        <Link href="/dashboard/clientes" className={getLinkClass('/dashboard/clientes')}>
          <Users size={20} className="shrink-0" />
          <span className="font-medium">Directorio</span>
        </Link>
      )}
      {hasPerm('creditos') && (
        <Link href="/dashboard/creditos" className={getLinkClass('/dashboard/creditos')}>
          <Wallet size={20} className="shrink-0 text-emerald-400" />
          <span className="font-medium">CrÃƒÂ©ditos</span>
        </Link>
      )}
      {(hasPerm('equipo') || hasPerm('usuarios') || userRole === 'MASTER') && (
        <Link href="/dashboard/equipo" className={getLinkClass('/dashboard/equipo')}>
          <UserCircle size={20} />
          <span className="text-sm font-medium">Equipo</span>
        </Link>
      )}
    </nav>
  );
}

export function SidebarBottom({ permisos, userRole }: NavProps) {
  const pathname = usePathname();
  const hasPerm = (p: string) => permisos.includes(p) || userRole === 'MASTER' || userRole === 'SUPERADMIN';

  const getLinkClass = (path: string, exact = false) => {
    const isActive = exact ? pathname === path : pathname.startsWith(path);
    return isActive
      ? "flex items-center gap-3 px-3 py-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 transition-colors border border-indigo-500/10"
      : "flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white transition-colors";
  };

  return (
    <div className="p-4 border-t border-neutral-800 shrink-0 space-y-1">
      ()}

        {/* MÃƒÂ³dulos dinÃƒÂ¡micos para los siguientes 3 espacios segÃƒÂºn permisos del usuario */}
        {(() => {
          const candidateTabs = [
            ...(hasPerm('pos') ? [{ path: '/dashboard/ventas', label: 'Ventas', icon: ShoppingCart }] : []),
            ...(hasPerm('inventario') ? [{ path: '/dashboard/inventario', label: 'Inventario', icon: Package }] : []),
            ...(hasPerm('caja') ? [{ path: '/dashboard/caja', label: 'Caja', icon: Wallet }] : []),
            ...(hasPerm('compras') ? [{ path: '/dashboard/compras', label: 'Compras', icon: ShoppingCart }] : []),
            ...(hasPerm('reportes') ? [{ path: '/dashboard/informes', label: 'Informes', icon: FileText }] : []),
          ].slice(0, 3);

          return candidateTabs.map((tab) => {
            const { link, isActive } = navItem(tab.path);
            const Icon = tab.icon;
            return (
              <Link key={tab.path} href={tab.path} onClick={() => setMenuOpen(false)} className={link}>
                {isActive && <span className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-indigo-500" />}
                <Icon size={22} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          });
        })()}

        {/* BotÃƒÂ³n "MÃƒÂ¡s" Ã¢â‚¬â€ abre el bottom sheet */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
            menuOpen ? 'text-indigo-400' : 'text-neutral-500 active:text-white'
          }`}
        >
          {menuOpen && <span className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-indigo-500" />}
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
          <span className="text-[10px] font-medium">{menuOpen ? 'Cerrar' : 'MÃƒÂ¡s'}</span>
        </button>
      </nav>
    </>
  );
}






