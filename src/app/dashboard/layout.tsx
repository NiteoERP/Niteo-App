import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  ShoppingCart, 
  Users, 
  Settings, 
  UserCircle 
} from 'lucide-react';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Extraer informaciÃ³n pÃºblica del usuario (Rol, Nombre, Empresa, Sede)
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre_completo, rol, empresa_id, sede_id')
    .eq('id', user.id)
    .single();

  const userName = perfil?.nombre_completo || user.email;
  const userRole = perfil?.rol || 'Administrador';

  return (
    <div className="flex h-screen bg-neutral-950 text-white font-sans overflow-hidden selection:bg-indigo-500/30">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-neutral-900 border-r border-neutral-800 hidden md:flex flex-col">
        {/* Cabecera Sidebar */}
        <div className="h-16 flex items-center px-6 border-b border-neutral-800 shrink-0">
          <img src="/logo.png" alt="Niteo Logo" className="w-8 h-8 object-contain mr-3 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
          <span className="font-bold text-xl tracking-tight text-neutral-100">Niteo</span>
        </div>
        
        {/* NavegaciÃ³n Condicional por Roles */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {userRole !== 'CAJERO' && (
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 transition-colors border border-indigo-500/10">
              <LayoutDashboard size={20} />
              <span className="text-sm font-medium">Inicio</span>
            </Link>
          )}
          
          <Link href="/dashboard/inventario" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white transition-colors">
            <Package size={20} />
            <span className="text-sm font-medium">Inventario</span>
          </Link>

          <Link href="/dashboard/pos" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors border border-transparent hover:border-indigo-500/20">
            <LayoutDashboard size={20} />
            <span className="text-sm font-medium">Espejo POS</span>
          </Link>
          
          <Link href="/dashboard/despachos" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white transition-colors">
            <Truck size={20} />
            <span className="text-sm font-medium">Despachos</span>
          </Link>

          {/* Ocultar Compras y Clientes (Finanzas/Usuarios) a Cajeros y Gerentes */}
          {userRole === 'MASTER' && (
            <>
              <Link href="/dashboard/compras" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white transition-colors">
                <ShoppingCart size={20} />
                <span className="text-sm font-medium">Compras</span>
              </Link>
              <Link href="/dashboard/clientes" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white transition-colors">
                <Users size={20} />
                <span className="text-sm font-medium">Clientes</span>
              </Link>
            </>
          )}
        </nav>

        {/* Ajustes al fondo (Solo MASTER) */}
        {userRole === 'MASTER' && (
          <div className="p-4 border-t border-neutral-800 shrink-0">
            <Link href="/dashboard/configuracion" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white transition-colors">
              <Settings size={20} />
              <span className="text-sm font-medium">Ajustes</span>
            </Link>
          </div>
        )}
      </aside>

      {/* ÃREA PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOPBAR */}
        <header className="h-16 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center">
            <h2 className="text-lg font-medium text-neutral-200">Panel de Control</h2>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative hidden sm:block">
              <select className="appearance-none bg-neutral-900 border border-neutral-700 text-neutral-300 text-sm rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors">
                <option>Sede Principal</option>
                <option>Sucursal Cabimas</option>
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-neutral-200">{userName}</p>
                <p className="text-xs text-indigo-400 font-bold tracking-wide uppercase">{userRole}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <UserCircle size={22} className="text-indigo-400" />
              </div>
            </div>
          </div>
        </header>

        {/* CONTENIDO */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#0a0a0a]">
          {children}
        </main>
      </div>
    </div>
  );
}

