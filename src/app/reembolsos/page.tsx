import Link from 'next/link';
import { ArrowLeft, RotateCcw, CheckCircle2, AlertCircle, Store, Clock, Mail } from 'lucide-react';

export const metadata = {
  title: 'Política de Reembolso y Cancelación | Niteo',
  description: 'Condiciones de prueba gratuita, cancelación de suscripciones, reembolsos por pagos duplicados y deslinde en catálogos públicos.',
};

export default function ReembolsosPage() {
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
          <Link href="/terms" className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800 transition-colors">
            Términos y Condiciones
          </Link>
          <Link href="/privacidad" className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800 transition-colors">
            Política de Privacidad
          </Link>
          <Link href="/cookies" className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800 transition-colors">
            Política de Cookies
          </Link>
          <Link href="/reembolsos" aria-current="page" className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-sm">
            Política de Reembolso
          </Link>
        </nav>

        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold px-3.5 py-1.5 rounded-full mb-4">
            <RotateCcw size={14} aria-hidden="true" /> Claridad Comercial y Pagos
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white mb-3">
            Política de Reembolso y Cancelación
          </h1>
          <p className="text-neutral-400 text-sm">Última actualización: {lastUpdated}</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">
          {/* 1. Prueba Gratuita */}
          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <CheckCircle2 size={20} className="text-emerald-400 shrink-0" aria-hidden="true" />
              1. Período de Evaluación Gratuita (7 Días Sin Compromiso)
            </h2>
            <p>
              Para garantizar que cada negocio tome una decisión de compra 100% informada y sin riesgos, <strong className="text-white">Niteo ofrece un período de prueba gratuita de 7 días</strong> a todos los nuevos clientes sin exigir tarjeta de crédito ni pagos por adelantado.
            </p>
            <p>
              Durante estos 7 días, el Cliente puede verificar la compatibilidad de sus equipos, probar el punto de venta local y en la nube, configurar su inventario y evaluar todas las funciones del plan antes de realizar su primer pago de suscripción.
            </p>
          </section>

          {/* 2. Cancelación y Mensualidades */}
          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Clock size={20} className="text-indigo-400 shrink-0" aria-hidden="true" />
              2. Cancelación de Suscripción y Ciclo Mensual
            </h2>
            <ul className="list-disc list-inside space-y-2 text-neutral-300">
              <li><strong className="text-white">Sin contratos forzosos ni penalidades:</strong> El Cliente puede decidir no renovar o cancelar su suscripción en cualquier momento sin cargos por cancelación.</li>
              <li><strong className="text-white">Vigencia del ciclo pagado:</strong> Al cancelar, la cuenta mantendrá acceso completo a las funciones de su plan hasta el último día del ciclo mensual ya abonado.</li>
              <li><strong className="text-white">Mensualidades en curso:</strong> Dado que el Servicio habilita de inmediato recursos de infraestructura en la nube y licencias operativas tras un período previo de prueba gratuita, no se realizan reembolsos prorrateados por días o fracciones de mes no utilizados una vez activado el ciclo mensual.</li>
            </ul>
          </section>

          {/* 3. Casos en los que SÍ aplica reembolso o saldo a favor */}
          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <RotateCcw size={20} className="text-emerald-400 shrink-0" aria-hidden="true" />
              3. Casos en los que Procede Reembolso o Saldo a Favor
            </h2>
            <p>
              Protegemos a nuestros clientes ante errores involuntarios en transferencias o incidencias técnicas comprobables. Procederá el reembolso o acreditación en los siguientes casos:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 pt-1">
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-2">
                <h3 className="font-bold text-white">A. Pagos Duplicados o Monto en Exceso</h3>
                <p className="text-neutral-300 text-xs sm:text-sm">
                  Si el Cliente realiza por error dos transferencias para el mismo período de facturación o transfiere un monto superior al correspondiente a su plan (mediante Pago Móvil, Zelle o Binance Pay), podrá elegir entre:
                </p>
                <ul className="list-disc list-inside text-xs sm:text-sm text-emerald-300 space-y-1">
                  <li>El reembolso del monto duplicado o excedente, o</li>
                  <li>Su aplicación inmediata como saldo a favor para cubrir el mes o meses siguientes.</li>
                </ul>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-2">
                <h3 className="font-bold text-white">B. Imposibilidad Técnica de Activación</h3>
                <p className="text-neutral-300 text-xs sm:text-sm">
                  Si habiendo realizado y reportado un pago válido, Niteo no pudiera activar la licencia del Cliente dentro de las <strong className="text-white">72 horas siguientes</strong> por una falla técnica atribuible exclusivamente a nuestra plataforma, el Cliente tendrá derecho al reembolso íntegro (100%) de dicho pago.
                </p>
              </div>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 mt-2">
              <p className="text-xs sm:text-sm text-neutral-300">
                <strong className="text-white">Plazo y procedimiento para reportar errores de pago:</strong> El Cliente deberá notificar el pago duplicado o error de transferencia dentro de las <strong className="text-white">48 horas siguientes</strong> a la operación enviando el comprobante bancario a{' '}
                <a href="mailto:niteosupport@gmail.com" className="text-indigo-400 hover:underline">niteosupport@gmail.com</a>. Una vez verificado en el estado de cuenta receptor, el reintegro o abono en cuenta se ejecutará en un plazo de <strong className="text-white">3 a 5 días hábiles</strong> en la misma moneda y método utilizado cuando sea técnicamente posible (o su equivalente acordado con el Cliente).
              </p>
            </div>
          </section>

          {/* 4. Deslinde en Catálogos Públicos de Comercios */}
          <section className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 sm:p-8 space-y-3">
            <h2 className="text-xl font-bold text-amber-300 flex items-center gap-2.5">
              <Store size={20} className="text-amber-400 shrink-0" aria-hidden="true" />
              4. Compras Realizadas a Comercios en el Catálogo Público Digital
            </h2>
            <p className="text-neutral-200">
              Niteo provee a restaurantes, tiendas y negocios una herramienta de <strong className="text-white">Catálogo Digital</strong> para exhibir sus productos y facilitar el envío de pedidos hacia el WhatsApp de cada comercio.
            </p>
            <p className="text-neutral-300">
              <strong className="text-white">Importante para consumidores finales:</strong> Niteo <strong>no vende alimentos, mercancías ni procesa los cobros</strong> de los pedidos realizados en los catálogos de los comercios afiliados. Cualquier solicitud de cambio, devolución, garantía o reembolso por un producto o pedido comprado a un restaurante o tienda debe gestionarse <strong>directamente con dicho comercio</strong>.
            </p>
          </section>

          {/* Contacto */}
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Mail size={18} className="text-indigo-400" aria-hidden="true" />
              5. Atención de Facturación y Reembolsos
            </h2>
            <p className="text-neutral-300">
              Para gestionar cualquier solicitud relacionada con pagos, conciliación de transferencias o reembolsos, escríbanos a:{' '}
              <a href="mailto:niteosupport@gmail.com" className="text-indigo-400 hover:underline font-semibold">
                niteosupport@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-14 pt-8 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-400">
          <Link href="/" className="inline-flex items-center gap-2 hover:text-white transition-colors">
            <ArrowLeft size={15} aria-hidden="true" /> Volver a la página de inicio
          </Link>
          <div className="flex flex-wrap gap-4">
            <Link href="/terms" className="hover:text-white transition-colors">Términos y Condiciones</Link>
            <Link href="/privacidad" className="hover:text-white transition-colors">Política de Privacidad</Link>
            <Link href="/cookies" className="hover:text-white transition-colors">Política de Cookies</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
