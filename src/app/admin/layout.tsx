import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { LogoutButton } from '@/components/LogoutButton';
import { ShieldCheck, Users, DollarSign, LayoutDashboard, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { headers } from 'next/headers';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
  
  if (perfil?.rol !== 'SUPERADMIN') {
    redirect('/dashboard');
  }

  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';

  const linkClass = (path: string, exact = false) => {
    const active = exact ? pathname === path : pathname.startsWith(path);
    return active
      ? 'flex items-center gap-3 px-3 py-3 rounded-xl bg-indigo-500/10 text-indigo-400 font-medium border border-indigo-500/10'
      : 'flex items-center gap-3 px-3 py-3 rounded-xl text-neutral-400 hover:bg-white/5 hover:text-white transition-colors';
  };

  return (
    <div className="flex h-screen bg-neutral-950 text-white font-sans overflow-hidden">
      {/* Sidebar SuperAdmin */}
      <aside className="w-64 bg-black border-r border-neutral-800 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-neutral-800 flex items-center gap-3">
          <ShieldCheck className="text-indigo-500" size={28} />
          <h1 className="text-xl font-bold tracking-tighter">Niteo Admin</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin" className="flex items-center gap-3 px-3 py-3 rounded-xl text-neutral-400 hover:bg-white/5 hover:text-white transition-colors">
            <LayoutDashboard size={20} />
            Panel Principal
          </Link>
          <Link href="/admin/empresas" className="flex items-center gap-3 px-3 py-3 rounded-xl text-neutral-400 hover:bg-white/5 hover:text-white transition-colors">
            <Users size={20} />
            Empresas
          </Link>
          <Link href="/admin/pagos" className="flex items-center gap-3 px-3 py-3 rounded-xl text-neutral-400 hover:bg-white/5 hover:text-white transition-colors">
            <DollarSign size={20} />
            Pagos Pendientes
          </Link>
          <Link href="/admin/metodos-pago" className="flex items-center gap-3 px-3 py-3 rounded-xl text-neutral-400 hover:bg-white/5 hover:text-white transition-colors">
            <CreditCard size={20} />
            Métodos de Pago
          </Link>
        </nav>
        <div className="p-4 border-t border-neutral-800">
          <LogoutButton />
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
