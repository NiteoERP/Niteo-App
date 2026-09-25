import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { LogoutButton } from '@/components/LogoutButton';
import { ShieldCheck } from 'lucide-react';
import { AdminNav } from './AdminNav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
  
  if (perfil?.rol !== 'SUPERADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="flex h-screen bg-neutral-950 text-white font-sans overflow-hidden">
      {/* Sidebar SuperAdmin */}
      <aside className="w-64 bg-black border-r border-neutral-800 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-neutral-800 flex items-center gap-3">
          <ShieldCheck className="text-indigo-500" size={28} />
          <h1 className="text-xl font-bold tracking-tighter">Niteo Admin</h1>
        </div>

        {/* AdminNav maneja el estado activo con usePathname() */}
        <AdminNav />

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

