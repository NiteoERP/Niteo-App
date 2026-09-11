import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
    if (perfil?.rol === 'SUPERADMIN') {
      redirect('/admin');
    }
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Niteo Logo" className="w-10 h-10 object-contain" />
          <span className="text-xl font-bold text-indigo-600 tracking-tight">Niteo</span>
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-medium text-neutral-600">
          <a href="#features" className="hover:text-indigo-600 transition-colors">Características</a>
          <a href="#pricing" className="hover:text-indigo-600 transition-colors">Planes</a>
          <a href="#faq" className="hover:text-indigo-600 transition-colors">Preguntas Frecuentes</a>
        </nav>
        <div>
          <Link href="/login" className="bg-indigo-600 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20">
            Iniciar Sesión
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-20 md:py-32 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-neutral-900 mb-6">
          Convierte tu PC en un <br/> <span className="text-indigo-600">Punto de Venta</span> moderno.
        </h1>
        <p className="text-lg md:text-xl text-neutral-500 mb-10 max-w-2xl mx-auto">
          El sistema de gestión más fácil de usar para restaurantes y tiendas. Sincroniza tu inventario en la nube y vende sin depender del internet.
        </p>
        <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-indigo-700 transition-colors shadow-xl shadow-indigo-600/30">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Comenzar Gratis (14 Días)
        </Link>
        <p className="mt-4 text-sm text-neutral-400">Compatible con Windows, Mac y Web.</p>
      </main>

      {/* Mockup / Image placeholder */}
      <div className="max-w-6xl mx-auto px-6 pb-32">
        <div className="w-full h-64 md:h-96 bg-neutral-100 rounded-3xl border border-neutral-200 flex items-center justify-center shadow-inner overflow-hidden relative">
           <div className="absolute inset-0 bg-gradient-to-t from-neutral-200/50 to-transparent"></div>
           <p className="text-neutral-400 font-medium">✨ Imagina aquí una captura de pantalla espectacular de Niteo ✨</p>
        </div>
      </div>
    </div>
  );
}
