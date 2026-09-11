import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import {
  Zap, WifiOff, BookOpen, BarChart3, Shield, Users,
  CheckCircle, MessageSquarePlus, Mail, MapPin, ArrowRight, Star
} from 'lucide-react';

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
    if (perfil?.rol === 'SUPERADMIN') redirect('/admin');
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-indigo-500/30 antialiased overflow-x-hidden">

      {/* ─── HEADER ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img src="/logo.png" alt="Niteo" className="w-9 h-9 object-contain drop-shadow-[0_0_10px_rgba(99,102,241,0.6)] group-hover:drop-shadow-[0_0_18px_rgba(99,102,241,0.9)] transition-all" />
            <span className="text-2xl font-black tracking-tighter text-white">Niteo</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-400">
            <a href="#features" className="hover:text-white transition-colors">Características</a>
            <a href="#pricing" className="hover:text-white transition-colors">Planes</a>
            <a href="#contact" className="hover:text-white transition-colors">Contacto</a>
            <Link href="/terms" className="hover:text-white transition-colors">Términos</Link>
          </nav>

          <Link
            href="/login"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5"
          >
            Iniciar Sesión <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      {/* ─── HERO ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-24 pb-32 px-6">
        {/* Luces de fondo */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold px-4 py-2 rounded-full">
            <Star size={12} className="fill-indigo-400" />
            Desarrollado en Venezuela 🇻🇪 · POS Inteligente para tu negocio
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-[1.05]">
            Convierte tu PC en un<br />
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Punto de Venta
            </span>{' '}
            de alto rendimiento.
          </h1>

          <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            El sistema de gestión más completo para restaurantes, tiendas y negocios.
            Vende, controla tu inventario y genera informes — incluso sin internet.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg px-10 py-4 rounded-2xl transition-all shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-500/40 hover:-translate-y-1"
            >
              <Zap size={20} className="fill-white" />
              Prueba Gratis por 7 Días
            </Link>
            <a href="#pricing" className="inline-flex items-center gap-2 text-neutral-400 hover:text-white text-sm font-medium transition-colors">
              Ver planes y precios <ArrowRight size={16} />
            </a>
          </div>

          <p className="text-xs text-neutral-600">Sin tarjeta de crédito · Sin compromisos · Cancela cuando quieras</p>
        </div>

        {/* Mockup de pantalla */}
        <div className="relative max-w-6xl mx-auto mt-20">
          <div className="bg-gradient-to-b from-neutral-800 to-neutral-900 rounded-2xl border border-neutral-700/50 p-3 shadow-2xl shadow-black/60">
            <div className="flex items-center gap-2 mb-3 px-2">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
              <div className="flex-1 bg-neutral-800 rounded h-5 mx-2" />
            </div>
            <div className="bg-neutral-950 rounded-xl h-64 md:h-96 flex items-center justify-center border border-neutral-800">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/20">
                  <img src="/logo.png" alt="Niteo" className="w-10 h-10 object-contain opacity-60" />
                </div>
                <p className="text-neutral-600 text-sm font-medium">Panel de Control · Niteo POS</p>
              </div>
            </div>
          </div>
          {/* Glow bajo la pantalla */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-indigo-600/20 rounded-full blur-3xl" />
        </div>
      </section>

      {/* ─── FEATURES ────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 border-t border-neutral-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white mb-4">
              Todo lo que necesita tu negocio
            </h2>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
              Niteo no es un simple POS. Es el cerebro financiero de tu operación.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <WifiOff size={24} />,
                color: 'emerald',
                title: 'Funciona sin Internet',
                desc: 'Gracias a Niteo Sync, tu caja local sigue operando aunque se caiga la conexión. Sincroniza automáticamente cuando vuelve la señal. Nunca pares de vender.'
              },
              {
                icon: <Zap size={24} />,
                color: 'indigo',
                title: 'Compatible con Aronium',
                desc: 'Si ya usas Aronium o A2 Softway, Niteo lee tu base de datos local y la sube en tiempo real a la nube sin que tengas que cambiar tu flujo de trabajo.'
              },
              {
                icon: <BookOpen size={24} />,
                color: 'purple',
                title: 'Motor de Recetas (Escandallos)',
                desc: 'Cada pizza, plato o cóctel que vendes descuenta gramos exactos de materia prima. Conoce tu costo real y cuida tu margen de ganancia al instante.'
              },
              {
                icon: <BarChart3 size={24} />,
                color: 'blue',
                title: 'Dashboard Financiero',
                desc: 'Informes de rentabilidad real, conciliación bancaria, y estado de resultados. Toma decisiones basadas en datos, no en intuición.'
              },
              {
                icon: <Shield size={24} />,
                color: 'red',
                title: 'Auditoría Invisible',
                desc: 'Registro inalterable de cada anulación o modificación de factura, asociada al empleado que la realizó. Elimina el "robo hormiga" para siempre.'
              },
              {
                icon: <Users size={24} />,
                color: 'amber',
                title: 'Múltiples Usuarios y Roles',
                desc: 'Define permisos exactos por empleado: cajero, gerente, contador. Cada quien ve y hace solo lo que le corresponde.'
              },
            ].map((f, i) => {
              const colorMap: Record<string, string> = {
                emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
                purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                red: 'bg-red-500/10 text-red-400 border-red-500/20',
                amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              };
              return (
                <div key={i} className="group bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-7 transition-all hover:-translate-y-1">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 border ${colorMap[f.color]}`}>
                    {f.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
                  <p className="text-neutral-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── BUZÓN DE SUGERENCIAS ────────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/20 border border-indigo-500/20 rounded-3xl p-10 text-center">
            <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <MessageSquarePlus size={28} className="text-indigo-400" />
            </div>
            <h2 className="text-3xl font-black text-white mb-4">Niteo crece <span className="text-indigo-400">contigo</span></h2>
            <p className="text-neutral-300 text-lg max-w-xl mx-auto leading-relaxed mb-6">
              Cada función que ves aquí fue pedida por un cliente. Dentro de tu panel, tienes un <strong className="text-white">Buzón de Sugerencias</strong> directo. Escríbenos, y si tu idea tiene sentido, la construimos.
            </p>
            <span className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-300 text-sm font-medium px-4 py-2 rounded-full border border-indigo-500/20">
              Disponible dentro del Dashboard para todos los usuarios
            </span>
          </div>
        </div>
      </section>

      {/* ─── PRICING ─────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 border-t border-neutral-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white mb-4">
              Precios claros, sin sorpresas
            </h2>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
              Elige el plan que mejor se adapte a tu operación. <strong className="text-white">Prueba cualquier plan 7 días gratis</strong> y decide sin presión.
            </p>
          </div>
          <p className="text-center text-sm text-indigo-400 mb-14 font-medium">
            ✦ Sin tarjeta de crédito · Los precios están en dólares (USD) · Renovación el último día de cada mes
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Starter */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 flex flex-col">
              <div>
                <h3 className="text-xs font-bold tracking-widest text-neutral-500 uppercase mb-4">Starter</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-5xl font-black text-white">$10</span>
                  <span className="text-neutral-500 font-medium">/mes</span>
                </div>
                <p className="text-neutral-400 text-sm mb-8">Ideal para digitalizar tu negocio por primera vez.</p>
                <ul className="space-y-3 text-sm text-neutral-300">
                  {['1 Sede (Física o Virtual)', 'Terminal de Facturación Local', 'Sincronización en Tiempo Real', 'Tasa BCV Automática', 'Inventario de Entradas y Salidas', 'Cierre de Caja Básico'].map(f => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Link href="/register" className="mt-10 w-full text-center py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-colors">
                Probar 7 días gratis
              </Link>
            </div>

            {/* Pro — Destacado */}
            <div className="bg-indigo-600 border border-indigo-500 rounded-2xl p-8 flex flex-col relative shadow-2xl shadow-indigo-600/30 scale-105">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-400 text-neutral-900 text-xs font-black px-4 py-1.5 rounded-full">
                MÁS POPULAR
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-widest text-indigo-200 uppercase mb-4">Pro</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-5xl font-black text-white">$25</span>
                  <span className="text-indigo-200 font-medium">/mes</span>
                </div>
                <p className="text-indigo-100 text-sm mb-8">Para operaciones que exigen control estricto de costos.</p>
                <ul className="space-y-3 text-sm text-indigo-50">
                  {['Todo lo del Starter', 'Hasta 2 Sedes', 'Motor de Recetas (Escandallos)', 'Módulo Móvil de Compras', 'Dashboard de Rentabilidad Real', 'Cálculo de Costo Promedio', 'Conciliación Bancaria'].map(f => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-white mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Link href="/register" className="mt-10 w-full text-center py-3 bg-white hover:bg-indigo-50 text-indigo-700 font-black rounded-xl transition-colors">
                Probar 7 días gratis
              </Link>
            </div>

            {/* Enterprise */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 flex flex-col">
              <div>
                <h3 className="text-xs font-bold tracking-widest text-neutral-500 uppercase mb-4">Enterprise</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-5xl font-black text-white">$45</span>
                  <span className="text-neutral-500 font-medium">/mes</span>
                </div>
                <p className="text-neutral-400 text-sm mb-8">Para franquicias y cadenas en expansión.</p>
                <ul className="space-y-3 text-sm text-neutral-300">
                  {['Todo lo del Pro', 'Sedes ilimitadas', 'Visión Consolidada Multi-Sede', 'Auditoría Invisible (Anti-robo)', 'Personalización de Marca', 'Soporte Prioritario'].map(f => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-indigo-400 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Link href="/register" className="mt-10 w-full text-center py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-colors">
                Probar 7 días gratis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MÓDULOS ADICIONALES ─────────────────────────────────────── */}
      <section className="py-16 px-6 border-t border-neutral-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-2xl font-black text-white mb-2">Expande tu plan con módulos a la carta</h3>
          <p className="text-neutral-400 text-sm mb-8">Paga exactamente por lo que necesitas.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Múltiples Listas de Precios', price: '$5/mes' },
              { name: 'Gestor de Despachos Internos', price: '$6/mes' },
              { name: 'Terminal de Venta Virtual', price: '$8/mes' },
              { name: 'Caja Adicional por Sede', price: '$5/mes' },
            ].map((m, i) => (
              <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-left">
                <p className="text-sm font-bold text-white mb-1 leading-tight">{m.name}</p>
                <p className="text-indigo-400 text-sm font-black">{m.price}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ───────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-br from-indigo-900/40 to-neutral-900 border border-indigo-500/20 rounded-3xl p-14">
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-4">
              Empieza hoy, sin riesgos.
            </h2>
            <p className="text-neutral-400 text-lg mb-10">7 días para probar todo el sistema. No necesitas tarjeta de crédito.</p>
            <Link href="/register" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg px-10 py-4 rounded-2xl transition-all shadow-2xl shadow-indigo-600/30 hover:-translate-y-1">
              <Zap size={20} className="fill-white" /> Crear mi cuenta gratis
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────────── */}
      <footer id="contact" className="border-t border-neutral-800 bg-black/50 py-14 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-10 mb-12">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-4">
                <img src="/logo.png" alt="Niteo" className="w-8 h-8 object-contain" />
                <span className="text-xl font-black tracking-tighter text-white">Niteo</span>
              </Link>
              <p className="text-neutral-500 text-sm leading-relaxed">
                Sistema de gestión e inventario en la nube para negocios modernos.
              </p>
              <p className="text-neutral-600 text-xs mt-4 flex items-center gap-1">
                <MapPin size={12} /> Desarrollado con ❤️ en Venezuela 🇻🇪
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Producto</h4>
              <ul className="space-y-2 text-sm text-neutral-500">
                <li><a href="#features" className="hover:text-white transition-colors">Características</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Precios</a></li>
                <li><Link href="/register" className="hover:text-white transition-colors">Prueba Gratuita</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Términos y Condiciones</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Soporte</h4>
              <ul className="space-y-3 text-sm text-neutral-500">
                <li className="flex items-center gap-2">
                  <Mail size={14} className="text-indigo-400 shrink-0" />
                  <a href="mailto:niteosupport@gmail.com" className="hover:text-white transition-colors">niteosupport@gmail.com</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-neutral-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-neutral-600">
            <p>© {new Date().getFullYear()} Niteo. Todos los derechos reservados.</p>
            <Link href="/terms" className="hover:text-neutral-400 transition-colors">Términos y Condiciones</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
