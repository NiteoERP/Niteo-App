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
        <Link href="/dashboard/caja/nuevo" className={getLinkClass('/dashboard/caja/nuevo')}>
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

  const getLinkClass = (path: string, exact = false) => {
    const isActive = exact ? pathname === path : pathname.startsWith(path);
    return isActive
      ? "flex flex-col items-center justify-center w-full h-full text-indigo-400 transition-colors"
      : "flex flex-col items-center justify-center w-full h-full text-neutral-400 hover:text-white transition-colors";
  };

  const getMenuItemClass = (path: string, exact = false) => {
    const isActive = exact ? pathname === path : pathname.startsWith(path);
    return isActive
      ? "flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-500/10 text-indigo-400 font-medium"
      : "flex items-center gap-3 px-4 py-3 rounded-xl text-neutral-400 hover:bg-neutral-800 hover:text-white font-medium transition-colors";
  };

  return (
    <>
      {/* Drawer / Full Menu (Mobile) */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-neutral-950 flex flex-col animate-in slide-in-from-bottom-full duration-300">
          <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-800 shrink-0">
            <span className="font-bold text-xl text-white">Todos los Módulos</span>
            <button onClick={() => setMenuOpen(false)} className="text-neutral-400 hover:text-white p-2">
              <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-24 custom-scrollbar">
            {hasPerm('dashboard') && (
              <Link href="/dashboard" onClick={() => setMenuOpen(false)} className={getMenuItemClass('/dashboard', true)}>
                <LayoutDashboard size={20} /> Inicio
              </Link>
            )}
                  {hasPerm('caja') && (
        <Link href="/dashboard/caja/nuevo" className={getLinkClass('/dashboard/caja/nuevo')}>
          <Wallet size={20} />
          <span className="text-sm font-medium">Cierre de Caja</span>
        </Link>
      )}

      {hasPerm('inventario') && (
              <Link href="/dashboard/inventario" onClick={() => setMenuOpen(false)} className={getMenuItemClass('/dashboard/inventario')}>
                <Package size={20} /> Inventario
              </Link>
            )}
            {hasPerm('pos') && (
              <Link href="/dashboard/ventas" onClick={() => setMenuOpen(false)} className={getMenuItemClass('/dashboard/ventas')}>
                <ShoppingCart size={20} /> Ventas (POS)
              </Link>
            )}
            {hasPerm('reportes') && (
              <Link href="/dashboard/informes" onClick={() => setMenuOpen(false)} className={getMenuItemClass('/dashboard/informes')}>
                <FileText size={20} /> Informes
              </Link>
            )}
            {(hasPerm('reportes') || userRole === 'MASTER') && (
              <Link href="/dashboard/finanzas" onClick={() => setMenuOpen(false)} className={getMenuItemClass('/dashboard/finanzas')}>
                <TrendingUp size={20} /> Finanzas
              </Link>
            )}
            {(hasPerm('inventario') || hasPerm('pos')) && (
              <Link href="/dashboard/despachos" onClick={() => setMenuOpen(false)} className={getMenuItemClass('/dashboard/despachos')}>
                <Truck size={20} /> Despachos
              </Link>
            )}
            {hasPerm('compras') && (
              <Link href="/dashboard/compras" onClick={() => setMenuOpen(false)} className={getMenuItemClass('/dashboard/compras')}>
                <Package size={20} /> Compras
              </Link>
            )}
            {hasPerm('compras') && (
              <Link href="/dashboard/proveedores" onClick={() => setMenuOpen(false)} className={getMenuItemClass('/dashboard/proveedores')}>
                <Truck size={20} /> Proveedores (CxP)
              </Link>
            )}
            {hasPerm('clientes') && (
              <Link href="/dashboard/clientes" onClick={() => setMenuOpen(false)} className={getMenuItemClass('/dashboard/clientes')}>
                <Users size={20} /> Clientes
              </Link>
            )}
            {hasPerm('creditos') && (
              <Link href="/dashboard/creditos" onClick={() => setMenuOpen(false)} className={getMenuItemClass('/dashboard/creditos')}>
                <Wallet size={20} /> Cuentas por Cobrar
              </Link>
            )}
            {hasPerm('equipo') && (
              <Link href="/dashboard/equipo" onClick={() => setMenuOpen(false)} className={getMenuItemClass('/dashboard/equipo')}>
                <Users size={20} /> Equipo
              </Link>
            )}
            {(hasPerm('ajustes') || hasPerm('auditoria')) && (
              <Link href="/dashboard/auditoria" onClick={() => setMenuOpen(false)} className={getMenuItemClass('/dashboard/auditoria')}>
                <ShieldAlert size={20} /> Auditoría
              </Link>
            )}
            {(hasPerm('ajustes') || hasPerm('auditoria')) && (
              <Link href="/dashboard/configuracion" onClick={() => setMenuOpen(false)} className={getMenuItemClass('/dashboard/configuracion')}>
                <Settings size={20} /> Ajustes Generales
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <nav className="md:hidden fixed bottom-0 w-full bg-neutral-900 border-t border-neutral-800 z-50 flex justify-around items-center h-16 pb-safe">
        {hasPerm('dashboard') && (
          <Link href="/dashboard" onClick={() => setMenuOpen(false)} className={getLinkClass('/dashboard', true)}>
            <LayoutDashboard size={20} />
            <span className="text-[10px] font-medium mt-1">Inicio</span>
          </Link>
        )}
        {hasPerm('pos') && (
          <Link href="/dashboard/ventas" onClick={() => setMenuOpen(false)} className={getLinkClass('/dashboard/ventas')}>
            <ShoppingCart size={20} />
            <span className="text-[10px] font-medium mt-1">Ventas</span>
          </Link>
        )}
        {hasPerm('compras') && (
          <Link href="/dashboard/compras" onClick={() => setMenuOpen(false)} className={getLinkClass('/dashboard/compras')}>
            <Package size={20} />
            <span className="text-[10px] font-medium mt-1">Compras</span>
          </Link>
        )}
        <button 
          onClick={() => setMenuOpen(!menuOpen)} 
          className={menuOpen ? "flex flex-col items-center justify-center w-full h-full text-indigo-400 transition-colors" : "flex flex-col items-center justify-center w-full h-full text-neutral-400 hover:text-white transition-colors"}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
          <span className="text-[10px] font-medium mt-1">{menuOpen ? 'Cerrar' : 'Menú'}</span>
        </button>
      </nav>
    </>
  );
}




