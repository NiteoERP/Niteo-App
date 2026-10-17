import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, Database, EyeOff, Globe, UserCheck, Mail } from 'lucide-react';

export const metadata = {
  title: 'Política de Privacidad | Niteo',
  description: 'Política de privacidad, protección de datos personales y confidencialidad comercial de Niteo.',
};

export default function PrivacidadPage() {
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
          <Link href="/privacidad" aria-current="page" className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-sm">
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
            <ShieldCheck size={14} aria-hidden="true" /> Protección de Datos y Confidencialidad
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white mb-3">
            Política de Privacidad
          </h1>
          <p className="text-neutral-400 text-sm">Última actualización: {lastUpdated}</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">
          {/* 1. Compromiso y Responsable */}
          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Lock size={20} className="text-indigo-400 shrink-0" aria-hidden="true" />
              1. Responsable del Tratamiento y Compromiso de Privacidad
            </h2>
            <p>
              En <strong className="text-white">Niteo</strong> respetamos su privacidad y protegemos con rigor la información personal y comercial de nuestros usuarios y de las empresas que utilizan nuestro ecosistema (<strong className="text-white">Niteo Web Cloud</strong> y <strong className="text-white">Niteo POS Desktop</strong>).
            </p>
            <p>
              Esta Política de Privacidad explica de manera clara qué datos recolectamos, por qué son estrictamente necesarios para operar el sistema, cómo los resguardamos y cuáles son sus derechos conforme a los principios constitucionales de protección de datos (<strong className="text-white">Artículo 28 de la Constitución de la República Bolivariana de Venezuela</strong>), la <strong className="text-white">Ley Especial contra los Delitos Informáticos</strong> y la <strong className="text-white">Ley sobre Mensajes de Datos y Firmas Electrónicas</strong>.
            </p>
            <p>
              Canal oficial de contacto para asuntos de privacidad y protección de datos:{' '}
              <a href="mailto:niteosupport@gmail.com" className="text-indigo-400 hover:underline font-medium">
                niteosupport@gmail.com
              </a>
            </p>
          </section>

          {/* 2. Minimización de Datos */}
          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Database size={20} className="text-emerald-400 shrink-0" aria-hidden="true" />
              2. Principio de Minimización: Solo Recolectamos Datos Necesarios
            </h2>
            <p>
              Aplicamos el principio de <strong className="text-white">minimización de datos</strong>: únicamente solicitamos y procesamos la información indispensable para crear su cuenta, operar su negocio y brindar soporte técnico.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-2">
                <h3 className="font-bold text-white text-sm">A. Datos de Registro y Cuenta</h3>
                <ul className="list-disc list-inside text-neutral-300 space-y-1 text-xs sm:text-sm">
                  <li>Nombre completo del administrador o usuario.</li>
                  <li>Nombre comercial de la empresa o negocio y rubro.</li>
                  <li>Dirección de correo electrónico laboral o personal.</li>
                  <li>Contraseña almacenada bajo cifrado criptográfico irreversible.</li>
                </ul>
                <p className="text-xs text-emerald-400 pt-1">
                  ✦ No solicitamos números de tarjetas de crédito ni claves bancarias en el registro.
                </p>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-2">
                <h3 className="font-bold text-white text-sm">B. Datos Operativos del Comercio</h3>
                <ul className="list-disc list-inside text-neutral-300 space-y-1 text-xs sm:text-sm">
                  <li>Catálogo de productos, recetas, insumos y precios.</li>
                  <li>Registro de ventas, comandas, arqueos de caja y despachos.</li>
                  <li>Directorio de clientes y proveedores registrados por el propio comercio.</li>
                  <li>Usuarios internos (cajeros, meseros, gerentes) y bitácora de auditoría.</li>
                </ul>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-2">
                <h3 className="font-bold text-white text-sm">C. Pagos de Suscripción</h3>
                <ul className="list-disc list-inside text-neutral-300 space-y-1 text-xs sm:text-sm">
                  <li>Número de referencia o identificación de la transacción.</li>
                  <li>Banco emisor o titular de origen y fecha del pago.</li>
                  <li>Imagen del comprobante de transferencia para conciliación administrativa.</li>
                </ul>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-2">
                <h3 className="font-bold text-white text-sm">D. Catálogo Público Digital</h3>
                <ul className="list-disc list-inside text-neutral-300 space-y-1 text-xs sm:text-sm">
                  <li>Nombre opcional del comprador y nota opcional del pedido.</li>
                  <li>Estos datos se utilizan únicamente para estructurar el mensaje que el comprador envía voluntariamente al WhatsApp del comercio.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3. Finalidad y Ausencia de Rastreo Publicitario */}
          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <EyeOff size={20} className="text-amber-400 shrink-0" aria-hidden="true" />
              3. Uso de la Información y Cero Rastreo Publicitario
            </h2>
            <p>
              La información almacenada en Niteo se utiliza <strong className="text-white">exclusivamente</strong> para:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-neutral-300">
              <li>Sincronizar en tiempo real sus terminales de punto de venta, inventario, comandas y reportes financieros.</li>
              <li>Controlar los permisos de acceso según el rol de cada integrante de su equipo.</li>
              <li>Procesar consultas operativas o lectura asistida de facturas cuando usted utiliza el asistente inteligente del sistema.</li>
              <li>Verificar pagos de licencias, notificar actualizaciones de versión y brindar soporte técnico cuando el Cliente lo solicita.</li>
            </ul>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-emerald-300 text-xs sm:text-sm">
              <strong className="text-white block mb-1">✓ Garantía de No Comercialización ni Seguimiento Invasivo:</strong>
              Niteo <strong>no instala píxeles publicitarios ocultos</strong> (como Meta Pixel o redes de anuncios de terceros), no realiza perfilamiento comercial de sus clientes y <strong>jamás vende, alquila ni cede</strong> su base de datos de ventas, clientes o proveedores a terceros.
            </div>
          </section>

          {/* 4. Integraciones de Terceros */}
          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Globe size={20} className="text-indigo-400 shrink-0" aria-hidden="true" />
              4. Proveedores Tecnológicos e Integraciones de Terceros
            </h2>
            <p>
              Para ofrecer una plataforma segura, rápida y de alta disponibilidad, Niteo se apoya en proveedores de infraestructura líderes en la industria, bajo estrictos controles de seguridad:
            </p>
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                <p className="font-bold text-white">1. Infraestructura de Base de Datos y Autenticación (Supabase / Vercel)</p>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                  Alojamiento en la nube con cifrado en tránsito (TLS/HTTPS) y políticas de seguridad a nivel de fila (Row Level Security) que aíslan matemáticamente los datos de cada empresa para que ningún negocio pueda acceder a registros de otro.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                <p className="font-bold text-white">2. Asistencia Operativa con Inteligencia Artificial (Google Gemini API)</p>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                  Cuando un usuario autorizado utiliza <strong>Niteo Copilot</strong> o el lector inteligente de facturas de compra, la consulta o imagen se procesa a través del servicio empresarial de Google Gemini únicamente para generar la respuesta o estructurar la factura en su cuenta.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                <p className="font-bold text-white">3. Redirección de Pedidos a WhatsApp (Meta Platforms Inc.)</p>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                  En el Catálogo Público, al pulsar &ldquo;Enviar pedido por WhatsApp&rdquo;, el navegador redirige al usuario a la aplicación oficial de WhatsApp para comunicarse directamente con el número configurado por el comercio.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                <p className="font-bold text-white">4. Consulta de Tasas Oficiales y Pasarelas de Verificación</p>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                  El servidor consulta automáticamente fuentes públicas de referencia cambiaria (Banco Central de Venezuela / DolarAPI) para actualizar la tasa del día sin enviar datos personales de los usuarios, y valida notificaciones de pago cuando se utiliza Binance Pay.
                </p>
              </div>
            </div>
          </section>

          {/* 5. Retención y Derechos del Usuario */}
          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <UserCheck size={20} className="text-emerald-400 shrink-0" aria-hidden="true" />
              5. Conservación de Datos y Derechos del Titular (Acceso, Rectificación y Eliminación)
            </h2>
            <p>
              Los datos de su empresa se conservan activos mientras mantenga su cuenta o suscripción vigente. En caso de suspensión total por falta de pago superior a 90 días, los datos se resguardan por un período adicional de 90 días antes de su eliminación definitiva, permitiendo al Cliente reactivar o respaldar su información.
            </p>
            <p>
              Como titular de su cuenta, usted tiene derecho en todo momento a:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-neutral-300">
              <li><strong className="text-white">Acceder y exportar</strong> sus reportes de ventas, inventario, compras y clientes desde el panel.</li>
              <li><strong className="text-white">Rectificar o actualizar</strong> los datos de su perfil, empresa, sedes y catálogo en tiempo real.</li>
              <li><strong className="text-white">Solicitar la eliminación definitiva (Derecho al Olvido / Supresión)</strong> de su cuenta y de todos los registros asociados a su empresa enviando una solicitud desde el correo propietario (MASTER) a <a href="mailto:niteosupport@gmail.com" className="text-indigo-400 hover:underline">niteosupport@gmail.com</a>. Las solicitudes de eliminación se procesan en un plazo máximo de 5 días hábiles.</li>
            </ul>
          </section>

          {/* Contacto */}
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Mail size={18} className="text-indigo-400" aria-hidden="true" />
              6. Contacto de Privacidad
            </h2>
            <p className="text-neutral-300">
              Si tiene dudas sobre cómo protegemos sus datos o desea ejercer cualquiera de sus derechos legales, escríbanos a:{' '}
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
            <Link href="/cookies" className="hover:text-white transition-colors">Política de Cookies</Link>
            <Link href="/reembolsos" className="hover:text-white transition-colors">Política de Reembolso</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
