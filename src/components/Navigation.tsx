'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Package, 
  Truck, 
  ShoppingCart, 
  Users, 
  Settings, 
  UserCircle,
  FileText,
  Wallet,
  Menu,
  X,
  MonitorSmartphone,
  ChevronDown,
  Receipt,
  BookOpen,
  ShoppingBag,
  Building2
} from 'lucide-react';

interface NavProps {
  permisos: string[];
  userRole: string;
  modulosActivos?: string[];
  planSuscripcion?: string;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  exact?: boolean;
  perm?: boolean;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  visible: boolean;
  items: NavItem[];
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

  const isDespachosAllowed = 
    (planSuscripcion?.toUpperCase() === 'PRO' || planSuscripcion?.toUpperCase() === 'ENTERPRISE') &&
    (hasPerm('inventario') || hasPerm('pos'));

  // Definición de grupos desplegables
  const groups: NavGroup[] = [
    {
      id: 'ventas',
      label: 'Ventas',
      icon: ShoppingCart,
      visible: hasPerm('pos') || hasPerm('inventario'),
      items: [
        { label: 'Nueva Venta', path: '/dashboard/terminal', icon: MonitorSmartphone, perm: hasPerm('pos') },
        { label: 'Facturación', path: '/dashboard/documentos/nuevo', icon: FileText, perm: hasPerm('pos') },
        { label: 'Historial', path: '/dashboard/ventas', icon: Receipt, perm: hasPerm('pos') },
        { label: 'Catálogo de Ventas', path: '/dashboard/catalogo', icon: BookOpen, perm: hasPerm('inventario') },
      ].filter(i => i.perm !== false),
    },
    {
      id: 'caja-finanzas',
      label: 'Caja & Finanzas',
      icon: Wallet,
      visible: hasPerm('caja') || hasPerm('finanzas') || hasPerm('creditos') || userRole === 'MASTER',
      items: [
        { label: 'Cierre de Caja', path: '/dashboard/caja', icon: Wallet, perm: hasPerm('caja') },
        { label: 'Finanzas', path: '/dashboard/finanzas', icon: TrendingUp, perm: hasPerm('finanzas') || hasPerm('reportes') || userRole === 'MASTER' },
        { label: 'Créditos', path: '/dashboard/creditos', icon: Wallet, perm: hasPerm('creditos') },
      ].filter(i => i.perm !== false),
    },
    {
      id: 'inventario',
      label: 'Inventario',
      icon: Package,
      visible: hasPerm('inventario'),
      items: [
        { label: 'Stock / Productos', path: '/dashboard/inventario', icon: Package, perm: hasPerm('inventario') },
        { label: 'Despachos', path: '/dashboard/despachos', icon: Truck, perm: isDespachosAllowed },
      ].filter(i => i.perm !== false),
    },
    {
      id: 'compras',
      label: 'Compras',
      icon: ShoppingBag,
      visible: hasPerm('compras'),
      items: [
        { label: 'Órdenes de Compra', path: '/dashboard/compras', icon: ShoppingBag, perm: hasPerm('compras') },
        { label: 'Proveedores', path: '/dashboard/proveedores', icon: Truck, perm: hasPerm('compras') },
      ].filter(i => i.perm !== false),
    },
    {
      id: 'contactos',
      label: 'Directorio & Equipo',
      icon: Users,
      visible: hasPerm('clientes') || hasPerm('equipo') || hasPerm('usuarios') || userRole === 'MASTER',
      items: [
        { label: 'Directorio', path: '/dashboard/clientes', icon: Users, perm: hasPerm('clientes') },
        { label: 'Equipo', path: '/dashboard/equipo', icon: UserCircle, perm: hasPerm('equipo') || hasPerm('usuarios') || userRole === 'MASTER' },
      ].filter(i => i.perm !== false),
    },
  ];

  // Estado para controlar qué grupos están abiertos
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    groups.forEach(g => {
      if (g.items.some(item => pathname.startsWith(item.path))) {
        initial[g.id] = true;
      }
    });
    return initial;
  });

  // Auto-abrir grupo si el usuario navega a una ruta perteneciente a él
  useEffect(() => {
    groups.forEach(g => {
      if (g.items.some(item => pathname.startsWith(item.path))) {
        setOpenGroups(prev => ({ ...prev, [g.id]: true }));
      }
    });
  }, [pathname]);

  const toggleGroup = (id: string) => {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getSingleLinkClass = (path: string, exact = false) => {
    const isActive = exact ? pathname === path : pathname.startsWith(path);
    return isActive
      ? "flex items-center gap-3 px-3 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 font-medium transition-all border border-indigo-500/20 shadow-sm shadow-indigo-500/5"
      : "flex items-center gap-3 px-3 py-2 rounded-xl text-neutral-400 hover:bg-white/5 hover:text-white transition-all";
  };

  return (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar select-none">
      {/* 1. Inicio */}
      <Link href="/dashboard" className={getSingleLinkClass('/dashboard', true)}>
        <LayoutDashboard size={18} />
        <span className="text-sm">Inicio</span>
      </Link>

      <div className="pt-2 pb-1">
        <div className="h-[1px] bg-neutral-800/60 mx-1" />
      </div>

      {/* 2. Módulos Desplegables Agrupados */}
      {groups.filter(g => g.visible && g.items.length > 0).map(group => {
        const GroupIcon = group.icon;
        const isOpen = !!openGroups[group.id];
        const isGroupActive = group.items.some(item => pathname.startsWith(item.path));

        return (
          <div key={group.id} className="space-y-0.5">
            {/* Cabecera del Grupo (Acordeón) */}
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                isGroupActive && !isOpen 
                  ? "bg-indigo-500/10 text-indigo-300 font-semibold border border-indigo-500/20" 
                  : isOpen 
                    ? "text-neutral-200 bg-white/[0.03]" 
                    : "text-neutral-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <GroupIcon size={18} className={isGroupActive ? "text-indigo-400" : "text-neutral-400"} />
                <span>{group.label}</span>
              </div>
              <ChevronDown 
                size={15} 
                className={`transition-transform duration-200 text-neutral-500 ${
                  isOpen ? "rotate-180 text-indigo-400" : ""
                }`} 
              />
            </button>

            {/* Sub-elementos desplegables */}
            {isOpen && (
              <div className="ml-4 pl-3.5 border-l border-neutral-800/80 space-y-1 pt-1 pb-1 animate-in slide-in-from-top-1 duration-150">
                {group.items.map(item => {
                  const ItemIcon = item.icon;
                  const isActive = item.exact ? pathname === item.path : pathname.startsWith(item.path);

                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isActive 
                          ? "bg-indigo-500/15 text-indigo-400 font-semibold shadow-sm" 
                          : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]"
                      }`}
                    >
                      <ItemIcon size={15} className={isActive ? "text-indigo-400" : "text-neutral-500"} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="pt-2 pb-1">
        <div className="h-[1px] bg-neutral-800/60 mx-1" />
      </div>

      {/* 3. Informes (Independiente) */}
      {hasPerm('reportes') && (
        <Link href="/dashboard/informes" className={getSingleLinkClass('/dashboard/informes')}>
          <FileText size={18} />
          <span className="text-sm font-medium">Informes</span>
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
      ? "flex items-center gap-3 px-3 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 font-medium transition-colors border border-indigo-500/20"
      : "flex items-center gap-3 px-3 py-2 rounded-xl text-neutral-400 hover:bg-white/5 hover:text-white transition-colors";
  };

  return (
    <div className="p-3 border-t border-neutral-800 shrink-0 space-y-1">
      {hasPerm('ajustes') && (
        <Link href="/dashboard/configuracion" className={getLinkClass('/dashboard/configuracion')}>
          <Settings size={18} />
          <span className="text-sm font-medium">Ajustes</span>
        </Link>
      )}
    </div>
  );
}

export function MobileNav({ permisos, userRole, modulosActivos = [], planSuscripcion = 'STARTER' }: NavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const hasPerm = (p: string) => {
    if (userRole === 'MASTER' || userRole === 'SUPERADMIN') return true;
    if (permisos.includes(p)) return true;
    if (p === 'caja' && (permisos.includes('finanzas') || userRole === 'CAJERO')) return true;
    if (p === 'finanzas' && permisos.includes('caja')) return true;
    if (p === 'equipo' && (permisos.includes('usuarios') || permisos.includes('equipo'))) return true;
    if (p === 'usuarios' && (permisos.includes('usuarios') || permisos.includes('equipo'))) return true;
    return false;
  };

  const navItem = (path: string, exact = false) => {
    const isActive = exact ? pathname === path : pathname.startsWith(path);
    return {
      link: `relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
        isActive ? 'text-indigo-400' : 'text-neutral-500 active:text-white'
      }`,
      isActive,
    };
  };

  const drawerItem = (path: string) => {
    const isActive = pathname.startsWith(path);
    return isActive
      ? 'flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 font-semibold text-sm'
      : 'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-neutral-300 active:bg-neutral-800 font-medium text-sm transition-colors';
  };

  const isDespachosAllowed = 
    (planSuscripcion?.toUpperCase() === 'PRO' || planSuscripcion?.toUpperCase() === 'ENTERPRISE') &&
    (hasPerm('inventario') || hasPerm('pos'));

  return (
    <>
      {menuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div className="md:hidden fixed bottom-0 inset-x-0 z-50
                          bg-neutral-900 border-t border-neutral-800 rounded-t-3xl
                          animate-in slide-in-from-bottom duration-300
                          pb-[env(safe-area-inset-bottom)]
                          max-h-[85dvh] flex flex-col">
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-10 h-1 rounded-full bg-neutral-700" />
            </div>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-6 pb-2 shrink-0">
              Todos los Módulos
            </p>

            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4 custom-scrollbar">
              {/* Sección Ventas */}
              {(hasPerm('pos') || hasPerm('inventario')) && (
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider px-2">Ventas</p>
                  {hasPerm('pos') && (
                    <>
                      <Link href="/dashboard/terminal" onClick={() => setMenuOpen(false)} className={drawerItem('/dashboard/terminal')}>
                        <MonitorSmartphone size={18} /> Nueva Venta
                      </Link>
                      <Link href="/dashboard/documentos/nuevo" onClick={() => setMenuOpen(false)} className={drawerItem('/dashboard/documentos/nuevo')}>
                        <FileText size={18} /> Facturación
                      </Link>
                      <Link href="/dashboard/ventas" onClick={() => setMenuOpen(false)} className={drawerItem('/dashboard/ventas')}>
                        <Receipt size={18} /> Historial
                      </Link>
                    </>
                  )}
                  {hasPerm('inventario') && (
                    <Link href="/dashboard/catalogo" onClick={() => setMenuOpen(false)} className={drawerItem('/dashboard/catalogo')}>
                      <BookOpen size={18} /> Catálogo de Ventas
                    </Link>
                  )}
                </div>
              )}

              {/* Sección Caja & Finanzas */}
              {(hasPerm('caja') || hasPerm('finanzas') || hasPerm('creditos')) && (
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider px-2">Caja & Finanzas</p>
                  {hasPerm('caja') && (
                    <Link href="/dashboard/caja" onClick={() => setMenuOpen(false)} className={drawerItem('/dashboard/caja')}>
                      <Wallet size={18} /> Cierres de Caja
                    </Link>
                  )}
                  {(hasPerm('finanzas') || hasPerm('reportes') || userRole === 'MASTER') && (
                    <Link href="/dashboard/finanzas" onClick={() => setMenuOpen(false)} className={drawerItem('/dashboard/finanzas')}>
                      <TrendingUp size={18} /> Finanzas
                    </Link>
                  )}
                  {hasPerm('creditos') && (
                    <Link href="/dashboard/creditos" onClick={() => setMenuOpen(false)} className={drawerItem('/dashboard/creditos')}>
                      <Wallet size={18} /> Créditos
                    </Link>
                  )}
                </div>
              )}

              {/* Sección Inventario */}
              {hasPerm('inventario') && (
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider px-2">Inventario</p>
                  <Link href="/dashboard/inventario" onClick={() => setMenuOpen(false)} className={drawerItem('/dashboard/inventario')}>
                    <Package size={18} /> Inventario / Stock
                  </Link>
                  {isDespachosAllowed && (
                    <Link href="/dashboard/despachos" onClick={() => setMenuOpen(false)} className={drawerItem('/dashboard/despachos')}>
                      <Truck size={18} /> Despachos
                    </Link>
                  )}
                </div>
              )}

              {/* Sección Compras */}
              {hasPerm('compras') && (
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider px-2">Compras</p>
                  <Link href="/dashboard/compras" onClick={() => setMenuOpen(false)} className={drawerItem('/dashboard/compras')}>
                    <ShoppingBag size={18} /> Compras
                  </Link>
                  <Link href="/dashboard/proveedores" onClick={() => setMenuOpen(false)} className={drawerItem('/dashboard/proveedores')}>
                    <Truck size={18} /> Proveedores
                  </Link>
                </div>
              )}

              {/* Sección Directorio */}
              {(hasPerm('clientes') || hasPerm('equipo') || userRole === 'MASTER') && (
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider px-2">Directorio & Equipo</p>
                  {hasPerm('clientes') && (
                    <Link href="/dashboard/clientes" onClick={() => setMenuOpen(false)} className={drawerItem('/dashboard/clientes')}>
                      <Users size={18} /> Directorio
                    </Link>
                  )}
                  {(hasPerm('equipo') || userRole === 'MASTER') && (
                    <Link href="/dashboard/equipo" onClick={() => setMenuOpen(false)} className={drawerItem('/dashboard/equipo')}>
                      <UserCircle size={18} /> Equipo
                    </Link>
                  )}
                </div>
              )}

              {/* Sección Ajustes e Informes */}
              <div className="space-y-1 pt-1">
                {hasPerm('reportes') && (
                  <Link href="/dashboard/informes" onClick={() => setMenuOpen(false)} className={drawerItem('/dashboard/informes')}>
                    <FileText size={18} /> Informes
                  </Link>
                )}
                {hasPerm('ajustes') && (
                  <Link href="/dashboard/configuracion" onClick={() => setMenuOpen(false)} className={drawerItem('/dashboard/configuracion')}>
                    <Settings size={18} /> Ajustes
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Barra Inferior */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30
                      bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800
                      flex items-stretch
                      h-[calc(4rem+env(safe-area-inset-bottom))]
                      pb-[env(safe-area-inset-bottom)]">

        {(() => {
          const { link, isActive } = navItem('/dashboard', true);
          return (
            <Link href="/dashboard" onClick={() => setMenuOpen(false)} className={link}>
              {isActive && <span className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-indigo-500" />}
              <LayoutDashboard size={20} />
              <span className="text-[10px] font-medium">Inicio</span>
            </Link>
          );
        })()}

        {(() => {
          const candidateTabs = [
            ...(hasPerm('pos') ? [{ path: '/dashboard/ventas', label: 'Ventas', icon: ShoppingCart }] : []),
            ...(hasPerm('inventario') ? [{ path: '/dashboard/inventario', label: 'Inventario', icon: Package }] : []),
            ...(hasPerm('caja') ? [{ path: '/dashboard/caja', label: 'Caja', icon: Wallet }] : []),
            ...(hasPerm('compras') ? [{ path: '/dashboard/compras', label: 'Compras', icon: ShoppingBag }] : []),
            ...(hasPerm('reportes') ? [{ path: '/dashboard/informes', label: 'Informes', icon: FileText }] : []),
          ].slice(0, 3);

          return candidateTabs.map((tab) => {
            const { link, isActive } = navItem(tab.path);
            const Icon = tab.icon;
            return (
              <Link key={tab.path} href={tab.path} onClick={() => setMenuOpen(false)} className={link}>
                {isActive && <span className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-indigo-500" />}
                <Icon size={20} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          });
        })()}

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
            menuOpen ? 'text-indigo-400' : 'text-neutral-500 active:text-white'
          }`}
        >
          {menuOpen && <span className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-indigo-500" />}
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
          <span className="text-[10px] font-medium">{menuOpen ? 'Cerrar' : 'Más'}</span>
        </button>
      </nav>
    </>
  );
}
