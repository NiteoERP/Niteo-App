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

  const { data: dbProfile } = await supabase
    .from('perfiles').select('permisos, empresa_id, rol, sede_id').eq('id', user.id).single();

  const permisos = dbProfile?.permisos || [];

  const empresa_id = user.app_metadata?.empresa_id || dbProfile?.empresa_id;
  const userRole   = user.app_metadata?.user_role || dbProfile?.rol || 'CAJERO';
  const userName   = user.user_metadata?.full_name || user.email;

  let licencia = null;
  try {
    const { getEstadoLicencia } = await import('@/actions/licencia-actions');
    licencia = await getEstadoLicencia();
  } catch (err: any) {
    if (err?.digest?.includes('DYNAMIC_SERVER_USAGE') || err?.digest?.includes('NEXT_REDIRECT')) throw err;
    console.error('Error cargando licencia en layout:', err);
  }

  let savedAccounts: any[] = [];
  try {
    const { getSavedAccounts } = await import('@/actions/vault-actions');
    savedAccounts = await getSavedAccounts();
  } catch (err: any) {
    if (err?.digest?.includes('DYNAMIC_SERVER_USAGE') || err?.digest?.includes('NEXT_REDIRECT')) throw err;
    console.error('Error cargando savedAccounts en layout:', err);
  }

  let empresaData = null;
  if (empresa_id) {
    try {
      const { data: emp } = await supabase
        .from('empresas')
        .select('nombre_comercial, moneda, simbolo_moneda, zona_horaria, metodos_pago')
        .eq('id', empresa_id)
        .single();
      if (emp) empresaData = emp;
    } catch (err) {
      console.error('Error cargando empresaData:', err);
    }
  }

  const { default: LicenseBanner } = await import('@/components/licencias/LicenseBanner');
  const { default: AccountSwitcher } = await import('@/components/AccountSwitcher');

  return (
    <div className="flex h-[100dvh] bg-neutral-950 text-white font-sans overflow-hidden selection:bg-indigo-500/30">
      
      {/* Sidebar Desktop */}
      <aside className="w-[260px] bg-black border-r border-neutral-800 flex-col hidden md:flex z-20 shadow-xl shadow-black/50">
        <div className="h-16 flex items-center px-6 border-b border-neutral-800 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <img src="/logo.png" alt="Niteo Logo" className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(99,102,241,0.5)] group-hover:drop-shadow-[0_0_12px_rgba(99,102,241,0.8)] transition-all" />
            <span className="text-xl font-bold tracking-tighter text-white">Niteo</span>
          </Link>
        </div>
        
        <SidebarNav 
          permisos={permisos} 
          userRole={userRole} 
          modulosActivos={licencia?.modulosActivos || []} 
          planSuscripcion={licencia?.planSuscripcion || 'STARTER'} 
        />
        <SidebarBottom 
          permisos={permisos} 
          userRole={userRole} 
          modulosActivos={licencia?.modulosActivos || []} 
          planSuscripcion={licencia?.planSuscripcion || 'STARTER'} 
        />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-[100dvh] relative min-w-0">
        
        {/* Header Global */}
        <header className="h-16 bg-black/50 backdrop-blur-md border-b border-neutral-800 flex items-center justify-between px-4 md:px-6 shrink-0 z-10 sticky top-0">
          
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Niteo Logo" 
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
            {(licencia?.estado === 'ACTIVA' || licencia?.estado === 'GRACIA') && (
              <Link 
                href="/dashboard/billing"
                className="hidden md:flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-3 py-1.5 rounded-full transition-colors cursor-pointer group"
                title="Haz clic para ver días restantes y módulos de tu plan"
              >
                <span className="text-indigo-400 text-xs font-bold tracking-widest uppercase">
                  PLAN {licencia.planSuscripcion}
                </span>
                <span className="text-indigo-300/70 group-hover:text-indigo-300 text-[10px] uppercase font-bold tracking-wider">
                  • Ver plan
                </span>
              </Link>
            )}

            {/* Selector de Sesiones Guardadas (Estilo Instagram) */}
            {empresaData && (
              <AccountSwitcher 
                currentUserId={user.id}
                currentUserName={userName}
                currentUserRole={empresaData.nombre_comercial}
                savedAccounts={savedAccounts}
              />
            )}

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
          <EmpresaProvider
            empresa={empresaData}
            empresaId={empresa_id ?? null}
            userRole={userRole}
            userSedeId={dbProfile?.sede_id ?? null}
          >
            {licencia && userRole !== 'CAJERO' && <LicenseBanner licencia={licencia} />}
            {children}
          </EmpresaProvider>
        </main>

        {/* BOTTOM NAVIGATION (mobile only — rendering delegado al Client Component) */}
        <MobileNav 
          permisos={permisos} 
          userRole={userRole} 
          modulosActivos={licencia?.modulosActivos || []} 
          planSuscripcion={licencia?.planSuscripcion || 'STARTER'} 
        />
      </div>
    </div>
  );
}
