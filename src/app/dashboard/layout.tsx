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

  const { getEstadoLicencia } = await import('@/actions/licencia-actions');
  const licencia = await getEstadoLicencia();

  let empresaData = null;
  if (empresa_id) {
    const { data: emp } = await supabase
      .from('empresas')
      .select('nombre_comercial, moneda, simbolo_moneda, zona_horaria, metodos_pago')
      .eq('id', empresa_id)
      .single();
    if (emp) empresaData = emp;
  }

  const { default: LicenseBanner } = await import('@/components/licencias/LicenseBanner');

  return (
    <div className="flex h-[100dvh] bg-neutral-950 text-white font-sans overflow-hidden selection:bg-indigo-500/30">
      
      {/* ── SIDEBAR (desktop only) ────────────────────────────────── */}
      <aside className="w-64 bg-neutral-900 border-r border-neutral-800 hidden md:flex flex-col shrink-0">
        <div className="h-16 flex items-center px-5 border-b border-neutral-800 shrink-0">
          <img src="/logo.png" alt="Niteo Logo"
               className="w-12 h-12 object-contain scale-125 mr-3 ml-1 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
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
            {licencia?.estado === 'TRIAL' && userRole === 'MASTER' && (
              <div className="hidden md:flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-full">
                <span className="text-orange-400 text-xs font-semibold tracking-wide">
                  TRIAL: Quedan {licencia.diasRestantes} días
                </span>
                <Link href="/dashboard/billing"
                      className="text-orange-300 hover:text-white text-xs underline decoration-orange-500/30 font-medium transition-colors">
                  Activar Plan
                </Link>
              </div>
            )}

            {/* Badge Plan — solo desktop */}
            {licencia?.estado === 'ACTIVA' && (
              <div className="hidden md:flex items-center bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full">
                <span className="text-indigo-400 text-xs font-bold tracking-widest uppercase">
                  PLAN {licencia.planSuscripcion}
                </span>
              </div>
            )}

            {/* User info — truncar nombre en mobile */}
            <div className="hidden sm:flex items-center gap-3 border-l border-neutral-800 pl-3 md:pl-4">
              <div className="text-right">
                <p className="text-sm font-bold text-neutral-200">{userName}</p>
                <p className="text-xs text-indigo-400 font-semibold tracking-wide uppercase truncate max-w-[150px]">
                  {empresaData?.nombre_comercial || userRole}
                </p>
              </div>
              <div className="group relative">
                <button className="w-10 h-10 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 flex items-center justify-center border border-indigo-500/20 shrink-0 transition-colors cursor-pointer">
                  <UserCircle size={24} className="text-indigo-400" />
                </button>
                {/* Menú desplegable flotante */}
                <div className="absolute right-0 mt-2 w-48 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="p-3 border-b border-neutral-800">
                    <p className="text-xs text-neutral-400 uppercase tracking-wider font-bold mb-1">Empresa Actual</p>
                    <p className="text-sm text-white font-medium truncate">{empresaData?.nombre_comercial}</p>
                  </div>
                  <div className="p-2">
                    <button className="w-full text-left px-3 py-2 text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors flex items-center gap-2" onClick={() => alert('Próximamente: Selector de múltiples empresas')}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                      Cambiar de cuenta
                    </button>
                  </div>
                </div>
              </div>
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
            {licencia && userRole !== 'CAJERO' && <LicenseBanner licencia={licencia} />}
            {children}
          </EmpresaProvider>
        </main>

        {/* BOTTOM NAVIGATION (mobile only — rendering delegado al Client Component) */}
        <MobileNav permisos={permisos} userRole={userRole} />
      </div>
    </div>
  );
}
