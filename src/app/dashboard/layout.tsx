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

  // 1. LEER PERFIL DEL JWT DIRECTAMENTE (Sin consultas a BD)
  const empresa_id = user.app_metadata?.empresa_id;
  const userRole = user.app_metadata?.user_role || 'CAJERO';
  const userName = user.user_metadata?.full_name || user.email;

  const { data: dbProfile } = await supabase.from('perfiles').select('permisos').eq('id', user.id).single();
  const permisos = dbProfile?.permisos || [];

  let subPlan = 'BASICO';
  let subEstado = 'INACTIVA';
  let daysLeft = 0;
  let empresaData = null;

  if (empresa_id) {
    // Leemos datos de la empresa para el contexto SaaS
    const { data: emp } = await supabase.from('empresas').select('nombre, moneda, simbolo_moneda, zona_horaria, metodos_pago').eq('id', empresa_id).single();
    if(emp) empresaData = emp;

    // Leemos la suscripción de forma segura (nuestro RLS ya lo protege por empresa_id)
    const { data: sub } = await supabase
      .from('suscripciones_empresas')
      .select('plan, fecha_vencimiento, estado')
      .eq('empresa_id', empresa_id)
      .single();

    if (sub) {
      subPlan = sub.plan;
      subEstado = sub.estado;
      const today = new Date();
      const expiration = new Date(sub.fecha_vencimiento);
      const diffTime = expiration.getTime() - today.getTime();
      daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  const isTrial = daysLeft > 0 && daysLeft <= 14;

  return (
    <div className="flex h-screen bg-neutral-950 text-white font-sans overflow-hidden selection:bg-indigo-500/30">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-neutral-900 border-r border-neutral-800 hidden md:flex flex-col">
        {/* Cabecera Sidebar */}
        <div className="h-16 flex items-center px-6 border-b border-neutral-800 shrink-0">
          <img src="/logo.png" alt="Niteo Logo" className="w-8 h-8 object-contain mr-3 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
          <span className="font-bold text-xl tracking-tight text-neutral-100">Niteo</span>
        </div>
        
        {/* Navegacion */}
        <SidebarNav permisos={permisos} userRole={userRole} />
        
        {/* Menu inferior (Ajustes / Auditoria) */}
        <SidebarBottom permisos={permisos} userRole={userRole} />
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOPBAR */}
        <header className="h-16 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center">
            <h2 className="text-lg font-medium text-neutral-200">Panel de Control</h2>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              
              {/* BADGE DE SUSCRIPCIÓN */}
              {isTrial && (
                <div className="hidden md:flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-full">
                  <span className="text-orange-400 text-xs font-semibold tracking-wide">TRIAL: Quedan {daysLeft} días</span>
                  <Link href="/dashboard/billing" className="text-orange-300 hover:text-white text-xs underline decoration-orange-500/30 font-medium transition-colors">
                    Actualizar a PRO
                  </Link>
                </div>
              )}
              {!isTrial && subEstado === 'ACTIVA' && subPlan === 'PRO' && (
                <div className="hidden md:flex items-center bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full">
                  <span className="text-indigo-400 text-xs font-bold tracking-widest uppercase">VERSIÓN PRO</span>
                </div>
              )}

              <div className="text-right hidden sm:block ml-2 border-l border-neutral-800 pl-4">
                <p className="text-sm font-medium text-neutral-200">{userName}</p>
                <p className="text-xs text-indigo-400 font-bold tracking-wide uppercase">{userRole}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <UserCircle size={22} className="text-indigo-400" />
              </div>
              
              {/* Botón de Cerrar Sesión */}
              <LogoutButton />
            </div>
          </div>
        </header>

        {/* CONTENIDO */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 bg-[#0a0a0a]">
          <EmpresaProvider empresa={empresaData}>
            {children}
          </EmpresaProvider>
        </main>
        
        {/* BOTTOM NAVIGATION BAR (MOBILE ONLY) */}
        <MobileNav permisos={permisos} userRole={userRole} />
      </div>
    </div>
  );
}




