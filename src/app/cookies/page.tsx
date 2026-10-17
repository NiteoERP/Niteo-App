import Link from 'next/link';
import { ArrowLeft, Cookie, ShieldCheck, HardDrive, Settings, Mail } from 'lucide-react';

export const metadata = {
  title: 'Política de Cookies | Niteo',
  description: 'Información sobre el uso de cookies técnicas esenciales y almacenamiento local en Niteo.',
};

export default function CookiesPage() {
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
          <Link href="/cookies" aria-current="page" className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-sm">
            Política de Cookies
          </Link>
          <Link href="/reembolsos" className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800 transition-colors">
            Política de Reembolso
          </Link>
        </nav>

        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold px-3.5 py-1.5 rounded-full mb-4">
            <Cookie size={14} aria-hidden="true" /> Transparencia Técnica
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white mb-3">
            Política de Cookies y Almacenamiento Local
          </h1>
          <p className="text-neutral-400 text-sm">Última actualización: {lastUpdated}</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">
          {/* 1. Qué son y cómo las usamos */}
          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <ShieldCheck size={20} className="text-emerald-400 shrink-0" aria-hidden="true" />
              1. Uso Exclusivo de Cookies Técnicas y Esenciales
            </h2>
            <p>
              Las cookies son pequeños archivos de texto que su navegador almacena de forma segura en su dispositivo (computadora, tablet o teléfono móvil) para recordar su sesión activa y sus preferencias operativas.
            </p>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-emerald-300">
              <strong className="text-white block mb-1">✓ Cero Cookies Publicitarias o de Espionaje:</strong>
              En <strong>Niteo</strong> utilizamos <strong>únicamente cookies técnicas estrictamente necesarias</strong> para que usted pueda iniciar sesión, cambiar de sede y operar su punto de venta sin interrupciones. No utilizamos cookies de publicidad comportamental ni rastreadores de terceros.
            </div>
          </section>

          {/* 2. Detalle de Cookies */}
          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Cookie size={20} className="text-indigo-400 shrink-0" aria-hidden="true" />
              2. Cookies Utilizadas por la Plataforma
            </h2>
            <p>A continuación detallamos las cookies técnicas que emplea Niteo Web:</p>
            <div className="overflow-x-auto rounded-xl border border-neutral-800">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-neutral-950 border-b border-neutral-800 text-neutral-200">
                    <th className="p-3.5 font-bold">Nombre / Categoría</th>
                    <th className="p-3.5 font-bold">Propósito Funcional</th>
                    <th className="p-3.5 font-bold">Duración</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 bg-neutral-900/40">
                  <tr>
                    <td className="p-3.5 font-semibold text-white">Sesión de Autenticación<br /><span className="text-xs text-indigo-400 font-normal">Esencial / Seguridad</span></td>
                    <td className="p-3.5 text-neutral-300">Mantiene activa y cifrada la sesión del usuario autenticado para que pueda navegar por el panel sin tener que introducir su clave en cada clic.</td>
                    <td className="p-3.5 text-neutral-400">Sesión activa / Renovación automática</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-semibold text-white">Sede Activa<br /><span className="text-xs text-indigo-400 font-normal">Preferencia Operativa</span></td>
                    <td className="p-3.5 text-neutral-300">Recuerda qué sucursal o sede tiene seleccionada el propietario o administrador al consultar inventario, compras y reportes.</td>
                    <td className="p-3.5 text-neutral-400">Hasta 1 año</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-semibold text-white">Cuentas Guardadas en el Equipo<br /><span className="text-xs text-indigo-400 font-normal">Funcional (Opcional)</span></td>
                    <td className="p-3.5 text-neutral-300">Permite el cambio rápido de cuenta en un mismo equipo cuando el usuario marca expresamente la opción &ldquo;Mantener sesión iniciada en este equipo&rdquo;.</td>
                    <td className="p-3.5 text-neutral-400">Hasta 1 año (o hasta remover la cuenta)</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-semibold text-white">Autorización Temporal de Supervisor<br /><span className="text-xs text-indigo-400 font-normal">Seguridad de Caja</span></td>
                    <td className="p-3.5 text-neutral-300">Valida temporalmente el permiso de un supervisor cuando autoriza la edición de un cierre de turno.</td>
                    <td className="p-3.5 text-neutral-400">60 minutos</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 3. Almacenamiento Local (LocalStorage) */}
          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <HardDrive size={20} className="text-purple-400 shrink-0" aria-hidden="true" />
              3. Almacenamiento Local Preventivo en su Navegador
            </h2>
            <p>
              Además de las cookies de sesión, Niteo utiliza la memoria local de su navegador para <strong className="text-white">evitar la pérdida de trabajo operativo</strong> en caso de fluctuaciones de internet o cierres accidentales de pestaña:
            </p>
            <ul className="list-disc list-inside space-y-2 text-neutral-300">
              <li><strong className="text-white">Borradores de Cierre de Caja y Compras Móviles:</strong> Guarda temporalmente las transacciones que el cajero o comprador está anotando antes de enviarlas definitivamente a la nube.</li>
              <li><strong className="text-white">Borradores de Comandas de Meseros:</strong> Conserva los platos seleccionados en una mesa mientras el mesero toma el pedido desde su teléfono.</li>
              <li><strong className="text-white">Preferencias Visuales y Consentimiento:</strong> Recuerda si el usuario ocultó temporalmente los montos en pantalla (modo privacidad), la posición del botón de asistencia y la confirmación de lectura de este aviso de cookies.</li>
            </ul>
          </section>

          {/* 4. Gestión y Desactivación */}
          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Settings size={20} className="text-amber-400 shrink-0" aria-hidden="true" />
              4. Cómo Controlar o Eliminar las Cookies
            </h2>
            <p>
              Usted tiene control total sobre las cookies y datos locales en su dispositivo:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-neutral-300">
              <li>Al presionar <strong className="text-white">&ldquo;Cerrar Sesión&rdquo;</strong> dentro de Niteo, el sistema limpia automáticamente la sesión activa y los borradores temporales del navegador.</li>
              <li>Al iniciar sesión en un equipo compartido, puede desmarcar la casilla <strong className="text-white">&ldquo;Mantener sesión iniciada en este equipo&rdquo;</strong> para que su cuenta no quede registrada en el acceso rápido.</li>
              <li>También puede borrar o bloquear las cookies desde la configuración de su navegador (Chrome, Safari, Edge o Firefox). Tenga en cuenta que si bloquea las cookies técnicas esenciales, el sistema no podrá mantener su sesión iniciada.</li>
            </ul>
          </section>

          {/* Contacto */}
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Mail size={18} className="text-indigo-400" aria-hidden="true" />
              5. Consultas sobre Cookies
            </h2>
            <p className="text-neutral-300">
              Para cualquier consulta sobre esta Política de Cookies, puede escribirnos a:{' '}
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
            <Link href="/reembolsos" className="hover:text-white transition-colors">Política de Reembolso</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
