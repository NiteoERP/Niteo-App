import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { UserCircle } from 'lucide-react';
import { LogoutButton } from '@/components/LogoutButton';
import EmpresaProvider from '@/components/providers/EmpresaProvider';
import { SidebarNav, SidebarBottom, MobileNav } from '@/components/Navigation';

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

  const empresa_id = user.app_metadata?.empresa_id;
  const userRole   = user.app_metadata?.user_role || 'CAJERO';
  const userName   = user.user_metadata?.full_name || user.email;

  const { data: dbProfile } = await supabase
    .from('perfiles').select('permisos').eq('id', user.id).single();
  const permisos = dbProfile?.permisos || [];

  let subPlan  = 'BASICO';
  let subEstado = 'INACTIVA';
  let daysLeft = 0;
  let empresaData = null;

  if (empresa_id) {
    const { data: emp } = await supabase
      .from('empresas')
      .select('nombre, moneda, simbolo_moneda, zona_horaria, metodos_pago')
      .eq('id', empresa_id)
      .single();
    if (emp) empresaData = emp;

    const { data: sub } = await supabase
      .from('suscripciones_empresas')
      .select('plan, fecha_vencimiento, estado')
      .eq('empresa_id', empresa_id)
      .single();

    if (sub) {
      subPlan   = sub.plan;
      subEstado = sub.estado;
      const today      = new Date();
      const expiration = new Date(sub.fecha_vencimiento);
      daysLeft = Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }
  }

  const isTrial = daysLeft > 0 && daysLeft <= 14;

  return (
    <div className="flex h-[100dvh] bg-neutral-950 text-white font-sans overflow-hidden selection:bg-indigo-500/30">
      
      {/* ── SIDEBAR (desktop only) ────────────────────────────────── */}
      <aside className="w-64 bg-neutral-900 border-r border-neutral-800 hidden md:flex flex-col shrink-0">
        <div className="h-16 flex items-center px-5 border-b border-neutral-800 shrink-0">
          <img src="/logo.png" alt="Niteo Logo"
               className="w-10 h-10 object-contain mr-3 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
          <span className="font-black text-3xl tracking-tight text-white drop-shadow-md">Niteo</span>
        </div>
        <SidebarNav    permisos={permisos} userRole={userRole} />
        <SidebarBottom permisos={permisos} userRole={userRole} />
      </aside>

      {/* ── ÁREA PRINCIPAL ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* TOPBAR */}
        <header className="h-14 md:h-16 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md
                           flex items-center justify-between px-4 md:px-6 z-10 shrink-0">

          {/* Izquierda: logo (solo mobile) + título */}
          <div className="flex items-center gap-3">
            {/* Logo visible solo en mobile (reemplaza el sidebar) */}
            <img src="/logo.png" alt="Niteo"
                 className="md:hidden w-9 h-9 object-contain drop-shadow-[0_0_6px_rgba(99,102,241,0.6)]" />
            <h2 className="text-base md:text-lg font-semibold text-neutral-200 tracking-tight">
              Panel de Control
            </h2>
          </div>

          {/* Derecha: badges + user info + logout */}
          <div className="flex items-center gap-2 md:gap-4">

            {/* Badge TRIAL — solo MASTER, solo desktop */}
            {isTrial && userRole === 'MASTER' && (
              <div className="hidden md:flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-full">
                <span className="text-orange-400 text-xs font-semibold tracking-wide">
                  TRIAL: Quedan {daysLeft} días
                </span>
                <Link href="/dashboard/billing"
                      className="text-orange-300 hover:text-white text-xs underline decoration-orange-500/30 font-medium transition-colors">
                  Actualizar a PRO
                </Link>
              </div>
            )}

            {/* Badge PRO — solo desktop */}
            {!isTrial && subEstado === 'ACTIVA' && subPlan === 'PRO' && (
              <div className="hidden md:flex items-center bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full">
                <span className="text-indigo-400 text-xs font-bold tracking-widest uppercase">VERSIÓN PRO</span>
              </div>
            )}

            {/* User info — truncar nombre en mobile */}
            <div className="hidden sm:block text-right border-l border-neutral-800 pl-3 md:pl-4 max-w-[140px]">
              <p className="text-sm font-medium text-neutral-200 truncate">{userName}</p>
              <p className="text-xs text-indigo-400 font-bold tracking-wide uppercase">{userRole}</p>
            </div>

            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shrink-0">
              <UserCircle size={22} className="text-indigo-400" />
            </div>

            {/* Logout — siempre visible */}
            <LogoutButton />
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL
            pb-20 en mobile para que el bottom-nav no tape el contenido.
            pb-6 en desktop (sin bottom nav). */}
        <main className="flex-1 overflow-y-auto overscroll-contain
                         p-4 md:p-6
                         pb-20 md:pb-6
                         bg-[#0a0a0a]">
          <EmpresaProvider empresa={empresaData}>
            {children}
          </EmpresaProvider>
        </main>

        {/* BOTTOM NAVIGATION (mobile only — rendering delegado al Client Component) */}
        <MobileNav permisos={permisos} userRole={userRole} />
      </div>
    </div>
  );
}
