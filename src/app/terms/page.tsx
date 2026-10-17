import Link from 'next/link';
import { ArrowLeft, Scale } from 'lucide-react';

export const metadata = {
  title: 'Términos y Condiciones | Niteo',
  description: 'Términos y condiciones de uso del ecosistema de gestión empresarial y punto de venta Niteo.',
};

export default function TermsPage() {
  const lastUpdated = '16 de Octubre de 2026';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-300 font-sans antialiased">
      {/* Header */}
      <header className="bg-neutral-950/95 border-b border-neutral-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Logo de Niteo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-black tracking-tighter text-white">Niteo</span>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white transition-colors">
            <ArrowLeft size={16} aria-hidden="true" /> Volver al inicio
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-14">
        {/* Navegación rápida entre documentos legales */}
        <nav aria-label="Documentos legales" className="flex flex-wrap gap-2 mb-10 pb-6 border-b border-neutral-800">
          <Link href="/terms" aria-current="page" className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-sm">
            Términos y Condiciones
          </Link>
          <Link href="/privacidad" className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800 transition-colors">
            Política de Privacidad
          </Link>
          <Link href="/cookies" className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800 transition-colors">
            Política de Cookies
          </Link>
          <Link href="/reembolsos" className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800 transition-colors">
            Política de Reembolso
          </Link>
        </nav>

        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold px-3.5 py-1.5 rounded-full mb-4">
            <Scale size={14} aria-hidden="true" /> Marco Contractual del Servicio
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white mb-3">
            Términos y Condiciones de Uso
          </h1>
          <p className="text-neutral-400 text-sm">Última actualización: {lastUpdated}</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">

          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-white">1. Aceptación de los Términos</h2>
            <p>
              Al acceder, registrarse o utilizar cualquier servicio de <strong className="text-white">Niteo</strong> (en adelante &ldquo;el Software&rdquo;, &ldquo;la Plataforma&rdquo; o &ldquo;el Servicio&rdquo;), el usuario o la organización que representa (en adelante &ldquo;el Cliente&rdquo;) acepta de forma plena, expresa e irrevocable los presentes Términos y Condiciones de Uso, así como nuestra{' '}
              <Link href="/privacidad" className="text-indigo-400 hover:underline font-medium">Política de Privacidad</Link>,{' '}
              <Link href="/cookies" className="text-indigo-400 hover:underline font-medium">Política de Cookies</Link> y{' '}
              <Link href="/reembolsos" className="text-indigo-400 hover:underline font-medium">Política de Reembolso</Link>. Si no está de acuerdo con alguno de los términos aquí establecidos, le instamos a no utilizar el Servicio.
            </p>
            <p>
              Niteo se reserva el derecho de actualizar estos Términos en cualquier momento. Los cambios entrarán en vigor a partir de su publicación en esta página. El uso continuado del Servicio constituirá aceptación de los Términos actualizados.
            </p>
          </section>

          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-white">2. Descripción del Servicio</h2>
            <p>
              Niteo es un sistema de gestión empresarial e inventario en la nube (SaaS) complementado con terminales de escritorio que incluye módulos de Punto de Venta (POS), control de inventario, escandallos, comandas móviles, cuentas por cobrar, informes gerenciales, catálogo digital público, asistencia inteligente (<strong className="text-white">Niteo Copilot</strong>) y herramientas de sincronización local. El Servicio se ofrece bajo un modelo de suscripción mensual.
            </p>
          </section>

          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-white">3. Licencia de Uso y Propiedad Intelectual</h2>
            <p>
              Niteo otorga al Cliente una licencia limitada, no exclusiva, intransferible y revocable para utilizar el Software durante el período de suscripción vigente. Esta licencia únicamente concede el <strong className="text-white">derecho de uso</strong> de la plataforma.
            </p>
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
              <p className="text-red-300 font-semibold mb-2">⚠️ Propiedad Intelectual Exclusiva</p>
              <p>
                El código fuente, diseño, arquitectura, algoritmos, bases de datos, marcas, logotipos y cualquier componente técnico del Software son propiedad exclusiva e intelectual de <strong>Niteo y sus desarrolladores</strong>. Está estrictamente prohibido descompilar, realizar ingeniería inversa, copiar, distribuir, sublicenciar, vender o intentar reproducir el Software o cualquiera de sus partes sin autorización escrita expresa. La violación de esta cláusula dará lugar a la suspensión inmediata del servicio y a las acciones legales correspondientes bajo las leyes de propiedad intelectual y delitos informáticos aplicables.
              </p>
            </div>
          </section>

          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-white">4. Suscripción, Pagos y Renovación</h2>
            <ul className="list-none space-y-3">
              <li className="flex items-start gap-3"><span className="text-indigo-400 font-bold shrink-0">4.1.</span><span><strong className="text-white">Período de Prueba:</strong> Nuevos clientes reciben 7 días de acceso gratuito al plan seleccionado sin requerir datos de tarjeta de crédito. Transcurrido ese período, se deberá activar una suscripción paga para continuar usando el Servicio.</span></li>
              <li className="flex items-start gap-3"><span className="text-indigo-400 font-bold shrink-0">4.2.</span><span><strong className="text-white">Ciclo de Facturación:</strong> Las suscripciones se cobran mensualmente. El vencimiento ocurre el <strong className="text-white">último día de cada mes calendario</strong>, independientemente de la fecha de activación.</span></li>
              <li className="flex items-start gap-3"><span className="text-indigo-400 font-bold shrink-0">4.3.</span><span><strong className="text-white">Métodos de Pago:</strong> Niteo acepta pagos mediante Zelle, Pago Móvil, Binance Pay y efectivo. El pago se formaliza una vez que el equipo de Niteo verifique y apruebe el comprobante de transferencia enviado por el Cliente a través del módulo de facturación interno.</span></li>
              <li className="flex items-start gap-3"><span className="text-indigo-400 font-bold shrink-0">4.4.</span><span><strong className="text-white">Descuentos Especiales:</strong> Niteo puede otorgar tarifas personalizadas a clientes que hayan contribuido activamente al desarrollo del sistema (&ldquo;clientes fundadores&rdquo;). Estos descuentos son discrecionales, no transferibles y pueden modificarse con 30 días de aviso previo.</span></li>
            </ul>
          </section>

          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-white">5. Política de Suspensión por Falta de Pago</h2>
            <p>En caso de impago, Niteo aplicará el siguiente procedimiento escalonado:</p>
            <div className="space-y-3">
              {[
                { label: 'Día 0 (Vencimiento)', text: 'El panel de control del administrador (MASTER) mostrará un aviso de licencia vencida. El terminal de ventas continúa operativo para no interrumpir las ventas del negocio.', color: 'amber' },
                { label: 'Días 1–3 (Gracia)', text: 'El sistema opera normalmente pero con avisos de vencimiento visibles para el administrador. Se insta a regularizar el pago.', color: 'amber' },
                { label: 'Día 4 en adelante (Restricción)', text: 'Se restringe el acceso a los módulos gerenciales avanzados (Informes Financieros, Escandallos, Auditoría). El terminal de ventas básico y el módulo de pagos permanecen activos.', color: 'orange' },
                { label: 'Día 10 en adelante', text: 'Un aviso discreto de "Licencia Vencida" se muestra también en el terminal de ventas para que el personal informe al propietario.', color: 'red' },
                { label: '90 días sin pago (Suspensión Total)', text: 'Se suspende completamente el acceso al Servicio. Los datos del Cliente se conservarán en los servidores de Niteo por un período adicional de 90 días antes de ser eliminados de forma permanente, dando tiempo para regularizar la situación.', color: 'red' },
              ].map((item, i) => {
                const colors: Record<string, string> = {
                  amber: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
                  orange: 'bg-orange-500/10 border-orange-500/30 text-orange-300',
                  red: 'bg-red-500/10 border-red-500/30 text-red-300'
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

          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-white">6. Responsabilidad sobre los Datos, Equipos e Imágenes del Catálogo</h2>
            <p>
              <strong className="text-white">6.1. Exactitud de los Datos del Cliente:</strong> El Cliente es el único responsable de la veracidad, legalidad y exactitud de la información (precios, costos, recetas, inventario, usuarios y registros) que carga, procesa y almacena en Niteo.
            </p>
            <p>
              <strong className="text-white">6.2. Derechos de Autor sobre Imágenes y Contenido del Catálogo Público:</strong> Cuando el Cliente publica fotografías, logotipos, nombres o descripciones de productos en su Catálogo Digital, declara y garantiza que es titular de los derechos de propiedad intelectual de dicho material o cuenta con autorización legal para su uso comercial. El Cliente mantendrá indemne a Niteo frente a cualquier reclamación de terceros por infracción de derechos de autor o marcas. En caso de recibir una notificación fundada de infracción de derechos de autor en <a href="mailto:niteosupport@gmail.com" className="text-indigo-400 hover:underline">niteosupport@gmail.com</a>, Niteo podrá retirar o desactivar preventivamente la imagen reportada.
            </p>
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5">
              <p className="font-semibold text-white mb-2">⚠️ Exención de Responsabilidad por Hardware y Entorno Local</p>
              <p>
                <strong className="text-white">Niteo no asume ninguna responsabilidad</strong> por la pérdida, corrupción, robo o destrucción de datos que resulte de: fallos, averías o mal mantenimiento del hardware del Cliente (computadoras, discos duros, impresoras térmicas, routers); cortes de electricidad o fluctuaciones de voltaje; infección por virus, malware o ransomware en los equipos del Cliente; o acciones negligentes o dolosas de empleados o terceros con acceso físico o remoto a los equipos del Cliente.
              </p>
            </div>
          </section>

          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-white">7. Naturaleza Administrativa y Exención Fiscal / Contable</h2>
            <p>
              El Cliente reconoce y acepta que <strong className="text-white">Niteo es una herramienta tecnológica de control administrativo, operativo y gerencial interno</strong>.
            </p>
            <ul className="list-disc list-inside space-y-2 text-neutral-300">
              <li>Los recibos, pre-cuentas, comandas y reportes emitidos por el sistema tienen carácter de control interno administrativo y <strong className="text-white">no sustituyen una máquina fiscal, memoria fiscal ni imprenta digital homologada por el SENIAT</strong> u otra autoridad tributaria.</li>
              <li>El cumplimiento de los deberes formales y materiales tributarios, la emisión de facturas fiscales conforme a las Providencias Administrativas vigentes, la retención y declaración de impuestos (IVA, ISLR, IGTF, impuestos municipales) y la validación de tasas cambiarias son <strong className="text-white">responsabilidad exclusiva e indelegable del Cliente</strong> y de sus asesores contables o legales.</li>
            </ul>
          </section>

          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-white">8. Uso de Asistencia por Inteligencia Artificial y Simulaciones Operativas</h2>
            <p>
              Niteo incorpora funciones asistidas por Inteligencia Artificial (<strong className="text-white">Niteo Copilot</strong> y lectura asistida de facturas) así como herramientas de <strong className="text-white">simulación previa</strong> para ajustes masivos de precios, creación de combos, escandallos, fusión de insumos y despachos.
            </p>
            <p>
              El Cliente comprende que toda proyección, sugerencia o simulación generada por la Inteligencia Artificial tiene carácter estrictamente orientativo y puede contener imprecisiones derivadas de datos incompletos o interpretación automatizada. Por diseño de seguridad, el sistema presenta una vista previa de simulación que requiere la <strong className="text-white">revisión y confirmación manual de un usuario autorizado</strong> antes de aplicarse en la base de datos, siendo el Cliente el único responsable de verificar los precios, costos y cantidades antes de confirmar su ejecución.
            </p>
          </section>

          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-white">9. Disponibilidad del Servicio y Contingencia</h2>
            <p>
              Niteo realiza esfuerzos comercialmente razonables y continuos para mantener la plataforma en la nube operativa las 24 horas del día. No obstante, el Servicio se suministra &ldquo;tal cual&rdquo; y &ldquo;según disponibilidad&rdquo;, sin garantizar la ausencia absoluta de interrupciones ocasionadas por: mantenimientos programados o de emergencia, causas de fuerza mayor, fallas en proveedores globales de infraestructura en la nube (como Supabase o Vercel), interrupciones del servicio eléctrico nacional, fallas de proveedores de internet (ISP) o ataques informáticos de terceros.
            </p>
            <p>
              Para mitigar caídas de internet en el punto de venta físico, Niteo pone a disposición la aplicación de escritorio <strong className="text-white">Niteo POS</strong> con base de datos local offline y sincronización diferida.
            </p>
          </section>

          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-white">10. Limitación de Responsabilidad Económica</h2>
            <p>
              En la máxima medida permitida por la legislación aplicable, en ningún caso Niteo, sus propietarios, desarrolladores o colaboradores serán responsables frente al Cliente ni frente a terceros por daños indirectos, incidentales, especiales, punitivos o consecuentes, incluyendo —sin limitarse a— lucro cesante, pérdida de ingresos, diferencias de inventario o interrupción de negocios.
            </p>
            <p>
              En cualquier supuesto, la <strong className="text-white">responsabilidad total acumulada de Niteo</strong> por cualquier reclamo relacionado con el Servicio estará limitada como máximo al monto efectivamente pagado por el Cliente a Niteo por concepto de suscripción durante el <strong className="text-white">último mes calendario inmediatamente anterior</strong> al hecho que motivó el reclamo.
            </p>
          </section>

          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-white">11. Privacidad, Cookies, Cancelación y Reembolsos</h2>
            <ul className="list-disc list-inside space-y-2 text-neutral-300">
              <li><strong className="text-white">Privacidad y Protección de Datos:</strong> El tratamiento de la información personal y comercial se rige por nuestra <Link href="/privacidad" className="text-indigo-400 hover:underline font-medium">Política de Privacidad</Link>.</li>
              <li><strong className="text-white">Cookies Técnicas:</strong> El uso de cookies de sesión y almacenamiento local preventivo se detalla en nuestra <Link href="/cookies" className="text-indigo-400 hover:underline font-medium">Política de Cookies</Link>.</li>
              <li><strong className="text-white">Cancelación y Reembolsos:</strong> El Cliente puede cancelar su suscripción en cualquier momento conforme a los términos detallados en nuestra <Link href="/reembolsos" className="text-indigo-400 hover:underline font-medium">Política de Reembolso y Cancelación</Link>.</li>
            </ul>
          </section>

          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-white">12. Legislación Aplicable y Resolución de Controversias</h2>
            <p>
              Los presentes Términos y Condiciones se rigen e interpretan de conformidad con las leyes de la <strong className="text-white">República Bolivariana de Venezuela</strong> (incluyendo el Código Civil, Código de Comercio, Ley Especial contra los Delitos Informáticos y Ley sobre Mensajes de Datos y Firmas Electrónicas). Cualquier duda o controversia derivada del uso del Servicio será resuelta en primera instancia mediante negociación directa y amigable entre las partes en un plazo de treinta (30) días continuos; de no alcanzarse un acuerdo, será sometida a los tribunales competentes de la República Bolivariana de Venezuela.
            </p>
          </section>

          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-3">13. Contacto Legal y Soporte</h2>
            <p>Para consultas legales, notificaciones de derechos de autor o soporte sobre estos Términos, puede contactarnos a través de:</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>✉️ <a href="mailto:niteosupport@gmail.com" className="text-indigo-400 hover:underline font-semibold">niteosupport@gmail.com</a></li>
            </ul>
          </section>

        </div>

        <div className="mt-14 pt-8 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-400">
          <Link href="/" className="inline-flex items-center gap-2 hover:text-white transition-colors">
            <ArrowLeft size={15} aria-hidden="true" /> Volver a la página de inicio
          </Link>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacidad" className="hover:text-white transition-colors">Política de Privacidad</Link>
            <Link href="/cookies" className="hover:text-white transition-colors">Política de Cookies</Link>
            <Link href="/reembolsos" className="hover:text-white transition-colors">Política de Reembolso</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
