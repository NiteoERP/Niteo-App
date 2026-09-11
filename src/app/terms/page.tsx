import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  const lastUpdated = 'Septiembre 2026';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-300 font-sans antialiased">
      {/* Header */}
      <header className="bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800/50 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Niteo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-black tracking-tighter text-white">Niteo</span>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
            <ArrowLeft size={16} /> Volver al inicio
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-4">
            Términos y Condiciones
          </h1>
          <p className="text-neutral-500 text-sm">Última actualización: {lastUpdated}</p>
        </div>

        <div className="prose prose-invert prose-neutral max-w-none space-y-10 text-sm leading-relaxed">

          <section className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 space-y-4">
            <h2 className="text-xl font-bold text-white">1. Aceptación de los Términos</h2>
            <p>
              Al acceder, registrarse o utilizar cualquier servicio de <strong className="text-white">Niteo</strong> (en adelante "el Software", "la Plataforma" o "el Servicio"), el usuario o la organización que representa (en adelante "el Cliente") acepta de forma plena, expresa e irrevocable los presentes Términos y Condiciones de Uso. Si no está de acuerdo con alguno de los términos aquí establecidos, le instamos a no utilizar el Servicio.
            </p>
            <p>
              Niteo se reserva el derecho de modificar estos Términos en cualquier momento. Los cambios entrarán en vigor inmediatamente después de su publicación en esta página. El uso continuado del Servicio constituirá aceptación de los Términos modificados.
            </p>
          </section>

          <section className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 space-y-4">
            <h2 className="text-xl font-bold text-white">2. Descripción del Servicio</h2>
            <p>
              Niteo es un sistema de gestión empresarial en la nube (SaaS) que incluye módulos de Punto de Venta (POS), control de inventario, escandallos, cuentas por cobrar, informes financieros, y herramientas de sincronización con sistemas locales de terceros (como Aronium). El Servicio se ofrece bajo un modelo de suscripción mensual.
            </p>
          </section>

          <section className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 space-y-4">
            <h2 className="text-xl font-bold text-white">3. Licencia de Uso</h2>
            <p>
              Niteo otorga al Cliente una licencia limitada, no exclusiva, intransferible y revocable para utilizar el Software durante el período de suscripción vigente. Esta licencia únicamente concede el <strong className="text-white">derecho de uso</strong> de la plataforma.
            </p>
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
              <p className="text-red-300 font-semibold mb-2">⚠️ Propiedad Intelectual Exclusiva</p>
              <p>
                El código fuente, diseño, arquitectura, algoritmos, bases de datos, marcas, logotipos y cualquier componente técnico del Software son propiedad exclusiva e intelectual de <strong>Niteo y sus desarrolladores</strong>. Está estrictamente prohibido descompilar, realizar ingeniería inversa, copiar, distribuir, sublicenciar, vender o intentar reproducir el Software o cualquiera de sus partes sin autorización escrita expresa. La violación de esta cláusula dará lugar a acciones legales inmediatas bajo las leyes de propiedad intelectual aplicables.
              </p>
            </div>
          </section>

          <section className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 space-y-4">
            <h2 className="text-xl font-bold text-white">4. Suscripción, Pagos y Renovación</h2>
            <ul className="list-none space-y-3">
              <li className="flex items-start gap-3"><span className="text-indigo-400 font-bold shrink-0">4.1.</span><span><strong className="text-white">Período de Prueba:</strong> Nuevos clientes reciben 7 días de acceso gratuito al plan seleccionado sin requerir datos de pago. Transcurrido ese período, se deberá activar una suscripción paga para continuar usando el Servicio.</span></li>
              <li className="flex items-start gap-3"><span className="text-indigo-400 font-bold shrink-0">4.2.</span><span><strong className="text-white">Ciclo de Facturación:</strong> Las suscripciones se cobran mensualmente. El vencimiento ocurre el <strong className="text-white">último día de cada mes calendario</strong>, independientemente de la fecha de activación.</span></li>
              <li className="flex items-start gap-3"><span className="text-indigo-400 font-bold shrink-0">4.3.</span><span><strong className="text-white">Métodos de Pago:</strong> Niteo acepta pagos mediante Zelle, Pago Móvil, Binance Pay y efectivo. El pago se formaliza una vez que el equipo de Niteo verifique y apruebe el comprobante de transferencia enviado por el Cliente a través del módulo de facturación interno.</span></li>
              <li className="flex items-start gap-3"><span className="text-indigo-400 font-bold shrink-0">4.4.</span><span><strong className="text-white">Descuentos Especiales:</strong> Niteo puede otorgar tarifas personalizadas a clientes que hayan contribuido activamente al desarrollo del sistema ("clientes fundadores"). Estos descuentos son discrecionales, no transferibles y pueden modificarse con 30 días de aviso previo.</span></li>
            </ul>
          </section>

          <section className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 space-y-4">
            <h2 className="text-xl font-bold text-white">5. Política de Suspensión por Falta de Pago</h2>
            <p>En caso de impago, Niteo aplicará el siguiente procedimiento escalonado:</p>
            <div className="space-y-3">
              {[
                { label: 'Día 0 (Vencimiento)', text: 'El panel de control del administrador (MASTER) mostrará un aviso de licencia vencida. El terminal de ventas continúa operativo para no interrumpir las ventas del negocio.', color: 'amber' },
                { label: 'Días 1–3 (Gracia)', text: 'El sistema opera normalmente pero con avisos de vencimiento visibles para el administrador. Se insta a regularizar el pago.', color: 'amber' },
                { label: 'Día 4 en adelante (Restricción)', text: 'Se bloquea el acceso a los módulos avanzados (Informes Financieros, Escandallos, Auditoría). El terminal de ventas básico permanece activo.', color: 'orange' },
                { label: 'Día 10 en adelante', text: 'Un aviso discreto de "Licencia Vencida" se muestra también en el terminal de ventas para que los empleados informen al dueño.', color: 'red' },
                { label: '90 días sin pago (Suspensión Total)', text: 'Se suspende completamente el acceso al Servicio. Los datos del Cliente se conservarán en los servidores de Niteo por un período mínimo de 3 meses adicionales antes de ser eliminados de forma permanente, dando tiempo para regularizar la situación.', color: 'red' },
              ].map((item, i) => {
                const colors: Record<string, string> = {
                  amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
                  orange: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
                  red: 'bg-red-500/10 border-red-500/30 text-red-400'
                };
                return (
                  <div key={i} className={`border rounded-xl p-4 ${colors[item.color]}`}>
                    <p className="font-bold mb-1">{item.label}</p>
                    <p className="text-sm text-neutral-300">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 space-y-4">
            <h2 className="text-xl font-bold text-white">6. Responsabilidad sobre los Datos</h2>
            <p>
              <strong className="text-white">6.1. Responsabilidad del Cliente:</strong> El Cliente es el único responsable de la información que carga, procesa y almacena en la plataforma de Niteo. Niteo no es responsable por datos incorrectos, duplicados o ilegales ingresados por el Cliente o sus empleados.
            </p>
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5">
              <p className="font-semibold text-white mb-2">⚠️ Exención de Responsabilidad por Hardware</p>
              <p>
                <strong className="text-white">Niteo no asume ninguna responsabilidad</strong> por la pérdida, corrupción, robo o destrucción de datos que resulte de: fallos, averías o mal mantenimiento del hardware del Cliente (computadoras, discos duros, routers); cortes de electricidad o fluctuaciones de voltaje; infección por virus, malware o ransomware en los equipos del Cliente; acciones negligentes o dolosas de empleados o terceros con acceso a los equipos del Cliente.
              </p>
              <p className="mt-3 text-sm">
                Se recomienda encarecidamente al Cliente mantener sus equipos físicos en óptimas condiciones y utilizar las herramientas de respaldo en la nube que Niteo provee como protección complementaria.
              </p>
            </div>
          </section>

          <section className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 space-y-4">
            <h2 className="text-xl font-bold text-white">7. Disponibilidad del Servicio</h2>
            <p>
              Niteo se compromete a mantener una disponibilidad del Servicio superior al 99% mensual. Sin embargo, no garantiza un servicio ininterrumpido en los siguientes casos: mantenimientos programados (con previo aviso), fuerza mayor (fenómenos naturales, apagones nacionales, fallas en proveedores de infraestructura como Supabase o Vercel) o ataques de terceros a la infraestructura.
            </p>
          </section>

          <section className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 space-y-4">
            <h2 className="text-xl font-bold text-white">8. Privacidad y Confidencialidad</h2>
            <p>
              Niteo se compromete a no compartir, vender ni ceder a terceros la información comercial confidencial del Cliente (datos de ventas, clientes, productos). El acceso a los datos por parte del equipo de Niteo se limita exclusivamente a labores de soporte técnico o auditoría interna cuando sea estrictamente necesario.
            </p>
          </section>

          <section className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 space-y-4">
            <h2 className="text-xl font-bold text-white">9. Cancelación del Servicio</h2>
            <p>
              El Cliente puede cancelar su suscripción en cualquier momento. La cancelación tendrá efecto al final del ciclo de facturación activo. No se realizarán reembolsos prorrateados por el tiempo no utilizado. Niteo también se reserva el derecho de cancelar unilateralmente el Servicio a un Cliente que incumpla los presentes Términos, con o sin previo aviso según la gravedad del incumplimiento.
            </p>
          </section>

          <section className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 space-y-4">
            <h2 className="text-xl font-bold text-white">10. Legislación Aplicable</h2>
            <p>
              Los presentes Términos y Condiciones se rigen por las leyes de la República Bolivariana de Venezuela. Cualquier controversia derivada del uso del Servicio que no pueda resolverse amigablemente entre las partes será sometida a la jurisdicción competente correspondiente.
            </p>
          </section>

          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-white mb-3">11. Contacto</h2>
            <p>Para consultas legales, disputas o preguntas sobre estos Términos, puede contactarnos a través de:</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>✉️ <a href="mailto:niteosupport@gmail.com" className="text-indigo-400 hover:underline">niteosupport@gmail.com</a></li>
              <li>📞 <a href="tel:+5804121696345" className="text-indigo-400 hover:underline">+58 0412-1696345</a></li>
            </ul>
          </section>

        </div>

        <div className="mt-16 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-neutral-500 hover:text-white text-sm transition-colors">
            <ArrowLeft size={16} /> Volver a la página de inicio
          </Link>
        </div>
      </main>
    </div>
  );
}
