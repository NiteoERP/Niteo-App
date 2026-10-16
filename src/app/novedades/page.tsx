'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Monitor,
  Cloud,
  Download,
  ArrowLeft,
  CheckCircle2,
  Zap,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Printer,
  Coins,
  WifiOff,
  Layers,
  Clock,
  ChevronRight
} from 'lucide-react';
import versionData from '../../../public/downloads/version.json';

interface ChangelogItem {
  id: string;
  version: string;
  platform: 'pos' | 'web';
  platformName: string;
  date: string;
  title: string;
  badge: 'NUEVO' | 'MEJORA' | 'OPTIMIZACIÓN' | 'ESTABILIDAD';
  badgeStyle: string;
  summary: string;
  highlights: string[];
  installerUrl?: string;
}

const CHANGELOG_DATA: ChangelogItem[] = [
  {
    id: 'pos-1-0-4',
    version: '1.0.4',
    platform: 'pos',
    platformName: 'Niteo POS (Desktop)',
    date: '16 de Octubre, 2026',
    title: 'Niteo POS v1.0.4: Estabilidad en Auto-Actualización, Moneda en Cierres X/Z y Control de Propinas',
    badge: 'ESTABILIDAD',
    badgeStyle: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    summary: 'Optimización del motor de actualización automática en Windows, selector de divisa al imprimir cortes de caja y trazabilidad completa de propinas.',
    highlights: [
      'Relevo de Auto-Actualización Blindado en Windows: Corrección de rutas de ejecución del instalador silencioso para que el sistema cierre, instale y vuelva a abrir sin errores de archivo.',
      'Selector de Moneda en Reportes X y Cierres Z: Ahora puedes elegir al instante si deseas imprimir tu corte de turno en Dólares (USD), Bolívares (Bs) o Ambos.',
      'Visualización Integral de Propinas: Columna dedicada y desglose detallado de propinas por venta y por mesero en el historial local y en la sede.'
    ],
    installerUrl: '/downloads/niteo-pos-setup.exe'
  },
  {
    id: 'pos-1-0-1',
    version: '1.0.1',
    platform: 'pos',
    platformName: 'Niteo POS (Desktop)',
    date: '15 de Octubre, 2026',
    title: 'Niteo POS v1.0.1: Integración con Portal de Novedades y Ajustes de Inicio',
    badge: 'MEJORA',
    badgeStyle: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    summary: 'Actualización con enlace directo al historial de versiones y optimizaciones en la verificación periódica de actualizaciones.',
    highlights: [
      'Enlace Directo a Novedades: Ahora puedes consultar todo el historial de cambios del ecosistema desde el modal de actualización en tu navegador.',
      'Optimización de Notificación Flotante: Mayor estabilidad en la detección de versiones en segundo plano sin interrumpir el cobro.',
      'Integridad de Datos Garantizada: Al actualizar, tu base de datos SQLite y ventas locales se mantienen intactas.'
    ],
    installerUrl: '/downloads/niteo-pos-setup.exe'
  },
  {
    id: 'pos-1-0-0',
    version: '1.0.0',
    platform: 'pos',
    platformName: 'Niteo POS (Desktop)',
    date: '15 de Octubre, 2026',
    title: 'Lanzamiento Oficial: Sistema de Auto-Actualización y Sincronización en Vivo',
    badge: 'NUEVO',
    badgeStyle: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    summary: 'Versión definitiva de alto rendimiento con motor de auto-actualización silenciosa, contingencia offline y sincronización en tiempo real.',
    highlights: [
      'Sistema de Auto-Actualización Desatendida: Niteo POS detecta automáticamente nuevas versiones al iniciar o durante el turno con un anuncio flotante interactivo y relevo silencioso sin tocar tu base de datos SQLite.',
      'Sincronización Bidireccional en Vivo con Meseros: Recepción de comandas y actualización de estados de mesas en tiempo real mediante WebSockets y Supabase.',
      'Arquitectura de Doble Moneda (USD / VES): Soporte nativo para moneda base en dólares y conversión oficial automática a Bolívares según la tasa activa del BCV.',
      'Hardware de Impresión Térmica ESC/POS: Impresión configurable para pre-cuentas de clientes, recibos/facturas definitivas con desglose de métodos de pago y comandas de cocina/barra en 80mm y 58mm.',
      'Operación 100% Offline: Base de datos local SQLite con bandeja de salida Outbox para continuar facturando y despachando sin interrupciones ante cortes de internet.'
    ],
    installerUrl: '/downloads/niteo-pos-setup.exe'
  },
  {
    id: 'web-1-0-0',
    version: '1.0.0',
    platform: 'web',
    platformName: 'Niteo Web (Cloud)',
    date: '15 de Octubre, 2026',
    title: 'Plataforma Administrativa Centralizada y Terminal Móvil de Meseros',
    badge: 'NUEVO',
    badgeStyle: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    summary: 'Suite completa en la nube para administración multi-sede, control de inventario con productos sustitutos y comanda web para smartphones.',
    highlights: [
      'Comanda Móvil para Meseros: Interfaz optimizada para smartphones y tablets sin requerir hardware adicional; envía pedidos a cocina y caja al instante.',
      'Monitor de Cocina y Barra (KDS): Pantalla interactiva en vivo que muestra el estado de preparación de los pedidos con desglose de notas especiales.',
      'Gestión de Sedes y Claves Maestras: Asignación de permisos granulares por rol y vinculación segura de cajas POS locales mediante tokens por sede.',
      'Reportes Consolidados de Cierres X y Z: Auditoría de arqueos de caja, métodos de pago recibidos, propinas y ventas por cajero en tiempo real.',
      'Cuentas por Cobrar y Clientes: Registro de ventas a crédito, historial de abonos y control de cobranza integrado.'
    ]
  },
  {
    id: 'pos-0-9-5',
    version: '0.9.5',
    platform: 'pos',
    platformName: 'Niteo POS (Desktop)',
    date: '10 de Octubre, 2026',
    title: 'Mejoras en el Arqueo de Caja y Normalización de Búsqueda',
    badge: 'MEJORA',
    badgeStyle: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    summary: 'Ajustes en los cálculos de cierre de turno y soporte extendido para caracteres y filtros rápidos de catálogo.',
    highlights: [
      'Buscador Inteligente sin Acentos: Normalización de texto para localizar productos sin importar tildes o mayúsculas en el teclado táctil.',
      'Desglose Multimoneda en Cierre de Caja: Visualización detallada de Efectivo USD, Efectivo Bs, Pago Móvil, Punto de Venta y transferencias.',
      'Promociones y Cócteles 2x1: Descuentos automáticos en productos seleccionados para el rubro gastronómico.'
    ]
  }
];

export default function NovedadesPage() {
  const [filtro, setFiltro] = useState<'todos' | 'pos' | 'web'>('todos');

  const itemsFiltrados = CHANGELOG_DATA.filter((item) => {
    if (filtro === 'todos') return true;
    return item.platform === filtro;
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-indigo-500/30 antialiased overflow-x-hidden">
      
      {/* ─── HEADER PÚBLICO ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img
              src="/logo.png"
              alt="Niteo"
              className="w-8 h-8 object-contain drop-shadow-[0_0_10px_rgba(99,102,241,0.6)] group-hover:drop-shadow-[0_0_18px_rgba(99,102,241,0.9)] transition-all"
            />
            <span className="text-xl font-black tracking-tighter text-white">Niteo</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} /> Volver al Inicio
            </Link>
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </header>

      {/* ─── HERO SECTION ───────────────────────────────────────────── */}
      <section className="relative pt-16 pb-12 px-6 overflow-hidden">
        {/* Glow de fondo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold px-4 py-1.5 rounded-full shadow-inner">
            <Sparkles size={13} className="text-indigo-400" />
            Notas de la Versión y Novedades del Ecosistema
          </div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white leading-tight">
            ¿Qué hay de nuevo en{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Niteo
            </span>
            ?
          </h1>

          <p className="text-sm md:text-base text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Conoce las últimas actualizaciones, mejoras de rendimiento y nuevas funcionalidades añadidas a{' '}
            <strong className="text-white">Niteo POS (Desktop)</strong> y{' '}
            <strong className="text-white">Niteo Web (Cloud)</strong>.
          </p>
        </div>
      </section>

      {/* ─── CARDS DE VERSIONES ACTUALES ────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 mb-12">
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Card: Niteo POS Desktop */}
          <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 hover:border-neutral-700/80 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Monitor size={20} />
                </div>
                <span className="text-[11px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  v{versionData.version || '1.0.0'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Niteo POS Desktop</h3>
              <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                Aplicación de escritorio para Windows con SQLite local, impresión térmica y sincronización en vivo.
              </p>
            </div>
            <a
              href="/downloads/niteo-pos-setup.exe"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              <Download size={14} /> Descargar Niteo POS Setup
            </a>
          </div>

          {/* Card: Niteo Web Cloud */}
          <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 hover:border-neutral-700/80 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Cloud size={20} />
                </div>
                <span className="text-[11px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  v1.0.0 Cloud
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Niteo Web (Cloud)</h3>
              <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                Panel administrativo central, comanda móvil de meseros, monitor KDS y reportes financieros.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <Zap size={14} className="fill-white" /> Acceder a la Plataforma
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FILTROS Y FEED DE CAMBIOS ──────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        
        {/* Selector de Pestañas */}
        <div className="flex items-center justify-center sm:justify-start gap-2 mb-8 border-b border-neutral-800 pb-4">
          <button
            onClick={() => setFiltro('todos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filtro === 'todos'
                ? 'bg-neutral-800 text-white shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            Todos los Cambios
          </button>
          <button
            onClick={() => setFiltro('pos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              filtro === 'pos'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Monitor size={14} /> Niteo POS Desktop
          </button>
          <button
            onClick={() => setFiltro('web')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              filtro === 'web'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Cloud size={14} /> Niteo Web Cloud
          </button>
        </div>

        {/* Lista de Changelog */}
        <div className="space-y-8 relative before:absolute before:inset-0 before:left-3 sm:before:left-4 before:w-0.5 before:bg-neutral-800/80 before:h-full">
          {itemsFiltrados.map((item) => (
            <div key={item.id} className="relative pl-8 sm:pl-10 space-y-3">
              {/* Nodo timeline */}
              <div
                className={`absolute left-1 sm:left-2 top-1.5 w-4 h-4 rounded-full border-2 border-neutral-950 ${
                  item.platform === 'pos' ? 'bg-emerald-400' : 'bg-indigo-400'
                }`}
              />

              <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-6 sm:p-7 shadow-xl hover:border-neutral-700/80 transition-all">
                {/* Metadatos */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-black tracking-wider uppercase text-white bg-neutral-800 px-3 py-1 rounded-lg border border-neutral-700">
                      v{item.version}
                    </span>
                    <span className="text-xs font-bold text-neutral-400 flex items-center gap-1.5">
                      {item.platform === 'pos' ? (
                        <Monitor size={14} className="text-emerald-400" />
                      ) : (
                        <Cloud size={14} className="text-indigo-400" />
                      )}
                      {item.platformName}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${item.badgeStyle}`}>
                      {item.badge}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-500 font-medium">{item.date}</span>
                </div>

                {/* Título y Resumen */}
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 mb-5 leading-relaxed">
                  {item.summary}
                </p>

                {/* Lista de Novedades */}
                <div className="space-y-2.5 border-t border-neutral-800/70 pt-4">
                  {item.highlights.map((puntos, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-neutral-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0 shadow-sm" />
                      <span className="leading-relaxed">{puntos}</span>
                    </div>
                  ))}
                </div>

                {/* Botón de descarga si aplica */}
                {item.installerUrl && (
                  <div className="mt-5 pt-4 border-t border-neutral-800/70 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-neutral-500">
                      Instalador ejecutable para Windows (AMD64)
                    </span>
                    <a
                      href={item.installerUrl}
                      className="inline-flex items-center gap-2 text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-xl border border-neutral-700 transition-colors"
                    >
                      <Download size={14} className="text-emerald-400" /> Descargar esta versión
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FOOTER PÚBLICO ─────────────────────────────────────────── */}
      <footer className="border-t border-neutral-800 bg-black/50 py-10 px-6 text-xs text-neutral-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Niteo. Todos los derechos reservados.</p>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Términos y Condiciones</Link>
            <a href="mailto:niteosupport@gmail.com" className="hover:text-white transition-colors">Soporte</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
