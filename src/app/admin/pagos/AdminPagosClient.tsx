'use client';

import React, { useState, useTransition } from 'react';
import { aprobarPago, rechazarPago } from './actions';
import { CheckCircle, XCircle, Clock, Building2, CreditCard, Calendar, AlertCircle, ChevronDown, ChevronUp, ExternalLink, RefreshCw } from 'lucide-react';

const ESTADO_BADGE = {
  pendiente_aprobacion: 'bg-amber-500/20 text-amber-400 border border-amber-500/20',
  aprobado: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20',
  rechazado: 'bg-red-500/20 text-red-400 border border-red-500/20',
};

const METODO_ICON: Record<string, string> = {
  Zelle: '💸',
  'Binance Pay': '🔶',
  'Pago Móvil': '📱',
  'Transferencia Bancaria': '🏦',
  'Efectivo USD': '💵',
};

// Precios de referencia de planes (para verificar monto esperado)
const PLAN_PRECIOS: Record<string, number> = {
  STARTER: 10, PRO: 25, ENTERPRISE: 45,
};
const PLUGIN_PRECIOS: Record<string, number> = {
  recetas: 5, 'multi-price': 5, 'virtual-pos': 8, 'caja-extra': 5,
};

function calcularMontoEsperado(planSolicitado: string | null): number {
  if (!planSolicitado) return 0;
  // Formato: "PRO + [recetas,multi-price]"
  const [planParte, pluginsParte] = planSolicitado.split(' + ');
  const planBase = PLAN_PRECIOS[planParte?.toUpperCase()] || 0;
  const pluginsStr = pluginsParte?.replace(/[\[\]]/g, '') || '';
  const pluginsTotal = pluginsStr
    ? pluginsStr.split(',').reduce((acc, p) => acc + (PLUGIN_PRECIOS[p.trim()] || 0), 0)
    : 0;
  return planBase + pluginsTotal;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

function PagoCard({ pago, onAprobar, onRechazar, isPending }: {
  pago: any;
  onAprobar: (id: string) => void;
  onRechazar: (id: string, motivo: string) => void;
  isPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [showRechazar, setShowRechazar] = useState(false);

  const empresa = pago.empresas;
  const fecha = new Date(pago.fecha_registro).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  // Fecha real del pago (puede ser fecha_pago o fecha_registro)
  const fechaPagoReal = pago.fecha_pago
    ? new Date(pago.fecha_pago + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
    : fecha;

  const montoEsperado = calcularMontoEsperado(pago.plan_solicitado);
  const montoBs = pago.monto_bs_calculado;
  const tasaBCV = pago.tasa_bcv;

  // URL del comprobante
  const comprobanteUrl = pago.comprobante_url
    ? `${SUPABASE_URL}/storage/v1/object/public/comprobantes/${pago.comprobante_url}`
    : null;
  const esImagen = comprobanteUrl && !comprobanteUrl.toLowerCase().endsWith('.pdf');

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div
        className="p-5 flex flex-wrap items-center gap-4 cursor-pointer hover:bg-neutral-800/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={16} className="text-indigo-400" />
            <p className="font-bold text-white text-sm">{empresa?.nombre_comercial || 'Empresa desconocida'}</p>
          </div>
          <p className="text-xs text-neutral-500 flex items-center gap-1">
            <Calendar size={11} /> {fecha}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xl font-black text-white">${pago.monto} USD</p>
            <p className="text-xs text-neutral-400">
              {METODO_ICON[pago.metodo_pago] || '💳'} {pago.metodo_pago}
            </p>
          </div>
          <div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${ESTADO_BADGE[pago.estado as keyof typeof ESTADO_BADGE] || ''}`}>
              {pago.estado === 'pendiente_aprobacion' ? 'PENDIENTE' : pago.estado?.toUpperCase()}
            </span>
          </div>
          {expanded ? <ChevronUp size={18} className="text-neutral-500" /> : <ChevronDown size={18} className="text-neutral-500" />}
        </div>
      </div>

      {/* Detalle expandido */}
      {expanded && (
        <div className="border-t border-neutral-800 p-5 space-y-5 bg-neutral-950/40">

          {/* ── Info del pago ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">Referencia</p>
              <p className="text-white font-mono">{pago.referencia || '—'}</p>
            </div>
            <div>
              <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">Fecha del pago</p>
              <p className="text-white">{fechaPagoReal}</p>
            </div>
            <div>
              <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">Plan solicitado</p>
              <p className="text-white">
                {pago.plan_solicitado
                  ? pago.plan_solicitado
                  : pago.referencia?.includes('ENTERPRISE') ? 'Enterprise'
                  : pago.referencia?.includes('STARTER') ? 'Starter'
                  : 'Pro'}
              </p>
            </div>
            <div>
              <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">Estado empresa</p>
              <p className="text-white capitalize">{empresa?.plan || '—'} / {empresa?.estado || '—'}</p>
            </div>
          </div>

          {/* ── Verificación de monto ── */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">Monto declarado</p>
              <p className="text-xl font-black text-white">${pago.monto} <span className="text-xs font-normal text-neutral-500">USD</span></p>
            </div>
            {montoEsperado > 0 && (
              <div>
                <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">Monto esperado</p>
                <p className={`text-xl font-black ${pago.monto >= montoEsperado ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${montoEsperado} <span className="text-xs font-normal text-neutral-500">USD</span>
                </p>
                {pago.monto < montoEsperado && (
                  <p className="text-xs text-red-400 mt-0.5">⚠ Pagó menos de lo esperado</p>
                )}
              </div>
            )}
            <div>
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">
                Equivalente BCV {tasaBCV ? `(Bs ${tasaBCV.toLocaleString('es-VE')})` : ''}
              </p>
              {montoBs ? (
                <p className="text-xl font-black text-indigo-300">
                  Bs {montoBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </p>
              ) : (
                <p className="text-sm text-neutral-600">Sin tasa BCV para esta fecha</p>
              )}
            </div>
          </div>

          {/* ── Comprobante ── */}
          {comprobanteUrl ? (
            <div>
              <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-2">Comprobante adjunto</p>
              {esImagen ? (
                <a href={comprobanteUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src={comprobanteUrl}
                    alt="Comprobante de pago"
                    className="max-h-64 w-auto rounded-xl border border-neutral-800 object-contain hover:opacity-90 transition-opacity cursor-zoom-in"
                  />
                  <p className="text-xs text-indigo-400 mt-1.5 flex items-center gap-1">
                    <ExternalLink size={11} /> Abrir en pantalla completa
                  </p>
                </a>
              ) : (
                <a
                  href={comprobanteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm underline"
                >
                  <ExternalLink size={14} /> Ver comprobante (PDF)
                </a>
              )}
            </div>
          ) : (
            <div>
              <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">Comprobante</p>
              <p className="text-sm text-neutral-600 italic">No adjuntó comprobante</p>
            </div>
          )}

          {/* ── Acciones aprobar / rechazar ── */}
          {pago.estado === 'pendiente_aprobacion' && (
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-neutral-800">
              <button
                onClick={() => onAprobar(pago.id)}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm"
              >
                {isPending ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Aprobar y Activar — vence el 1ro
              </button>

              {!showRechazar ? (
                <button
                  onClick={() => setShowRechazar(true)}
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-xl transition-colors text-sm border border-red-500/20"
                >
                  <XCircle size={16} />
                  Rechazar
                </button>
              ) : (
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={motivoRechazo}
                    onChange={e => setMotivoRechazo(e.target.value)}
                    placeholder="Motivo del rechazo (opcional)"
                    className="flex-1 bg-neutral-900 border border-red-500/30 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-red-500"
                  />
                  <button
                    onClick={() => { onRechazar(pago.id, motivoRechazo); setShowRechazar(false); }}
                    disabled={isPending}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-colors"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setShowRechazar(false)}
                    className="px-4 py-2 bg-neutral-800 text-neutral-400 font-bold rounded-xl text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminPagosClient({ pagosPendientes, pagosHistorial }: {
  pagosPendientes: any[];
  pagosHistorial: any[];
}) {
  const [tab, setTab] = useState<'pendientes' | 'historial'>('pendientes');
  const [isPending, startTransition] = useTransition();
  const [alerta, setAlerta] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null);
  const [listaPendientes, setListaPendientes] = useState(pagosPendientes);

  const mostrarAlerta = (texto: string, tipo: 'ok' | 'error') => {
    setAlerta({ texto, tipo });
    setTimeout(() => setAlerta(null), 4000);
  };

  const handleAprobar = (id: string) => {
    startTransition(async () => {
      const res = await aprobarPago(id);
      if (res.success) {
        mostrarAlerta(`✅ Pago aprobado. Plan ${res.plan} activado por 30 días.`, 'ok');
        setListaPendientes(p => p.filter(x => x.id !== id));
      } else {
        mostrarAlerta(`❌ Error: ${res.error}`, 'error');
      }
    });
  };

  const handleRechazar = (id: string, motivo: string) => {
    startTransition(async () => {
      const res = await rechazarPago(id, motivo);
      if (res.success) {
        mostrarAlerta('Pago rechazado correctamente.', 'ok');
        setListaPendientes(p => p.filter(x => x.id !== id));
      } else {
        mostrarAlerta(`❌ Error: ${res.error}`, 'error');
      }
    });
  };

  const tabClass = (t: string) =>
    tab === t
      ? 'px-5 py-2.5 text-sm font-bold text-indigo-400 border-b-2 border-indigo-400 transition-colors'
      : 'px-5 py-2.5 text-sm font-bold text-neutral-500 hover:text-neutral-300 transition-colors';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white mb-1">Pagos de Suscripción</h1>
        <p className="text-neutral-400 text-sm">Aprueba o rechaza los pagos reportados por los restaurantes.</p>
      </header>

      {alerta && (
        <div className={`p-4 rounded-xl border text-sm font-medium flex items-center gap-2 ${
          alerta.tipo === 'ok'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          <AlertCircle size={16} />
          {alerta.texto}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-neutral-800">
        <button onClick={() => setTab('pendientes')} className={tabClass('pendientes')}>
          Pendientes
          {listaPendientes.length > 0 && (
            <span className="ml-2 bg-amber-500 text-black text-xs font-black px-2 py-0.5 rounded-full">
              {listaPendientes.length}
            </span>
          )}
        </button>
        <button onClick={() => setTab('historial')} className={tabClass('historial')}>
          Historial
        </button>
      </div>

      {/* Pendientes */}
      {tab === 'pendientes' && (
        <div className="space-y-3">
          {listaPendientes.length === 0 ? (
            <div className="text-center py-16 text-neutral-500">
              <Clock size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">Sin pagos pendientes</p>
              <p className="text-sm mt-1 text-neutral-600">Todos los pagos han sido procesados.</p>
            </div>
          ) : (
            listaPendientes.map(p => (
              <PagoCard
                key={p.id}
                pago={p}
                onAprobar={handleAprobar}
                onRechazar={handleRechazar}
                isPending={isPending}
              />
            ))
          )}
        </div>
      )}

      {/* Historial */}
      {tab === 'historial' && (
        <div className="space-y-3">
          {pagosHistorial.length === 0 ? (
            <div className="text-center py-16 text-neutral-500">
              <CreditCard size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">Sin historial aún</p>
            </div>
          ) : (
            pagosHistorial.map(p => (
              <div key={p.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-white text-sm">{p.empresas?.nombre_comercial || 'Empresa'}</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    ${p.monto} USD · {p.metodo_pago} · {p.referencia}
                  </p>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    {new Date(p.fecha_revision || p.fecha_registro).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold shrink-0 ${ESTADO_BADGE[p.estado as keyof typeof ESTADO_BADGE] || ''}`}>
                  {p.estado?.toUpperCase()}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
