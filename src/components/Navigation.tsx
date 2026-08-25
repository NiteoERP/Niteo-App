'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  ShoppingCart, 
  Users, 
  Settings, 
  UserCircle,
  ShieldAlert,
  FileText,
  Wallet 
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
  const hasPerm = (p: string) => permisos.includes(p) || userRole === 'MASTER';

  const getLinkClass = (path: string, exact = false) => {
    const isActive = exact ? pathname === path : pathname.startsWith(path);
    return isActive
      ? "flex flex-col items-center justify-center w-full h-full text-indigo-400 transition-colors"
      : "flex flex-col items-center justify-center w-full h-full text-neutral-400 hover:text-white transition-colors";
  };

  return (
    <nav className="md:hidden fixed bottom-0 w-full bg-neutral-900 border-t border-neutral-800 z-50 flex justify-around items-center h-16 pb-safe">
      {hasPerm('dashboard') && (
        <Link href="/dashboard" className={getLinkClass('/dashboard', true)}>
          <LayoutDashboard size={20} />
          <span className="text-[10px] font-medium mt-1">Inicio</span>
        </Link>
      )}
      {hasPerm('pos') && (
        <Link href="/dashboard/ventas" className={getLinkClass('/dashboard/ventas')}>
          <ShoppingCart size={20} />
          <span className="text-[10px] font-medium mt-1">Ventas</span>
        </Link>
      )}
      {hasPerm('compras') && (
        <Link href="/dashboard/compras" className={getLinkClass('/dashboard/compras')}>
          <Package size={20} />
          <span className="text-[10px] font-medium mt-1">Compras</span>
        </Link>
      )}
      {(hasPerm('ajustes') || hasPerm('auditoria')) && (
        <Link href="/dashboard/configuracion" className={getLinkClass('/dashboard/configuracion')}>
          <Settings size={20} />
          <span className="text-[10px] font-medium mt-1">Ajustes</span>
        </Link>
      )}
    </nav>
  );
}
