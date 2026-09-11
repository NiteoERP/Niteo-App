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
        <div className="border-t border-neutral-800 p-5 space-y-4 bg-neutral-950/40">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">Referencia</p>
              <p className="text-white font-mono">{pago.referencia || '—'}</p>
            </div>
            <div>
              <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">Plan solicitado</p>
              <p className="text-white">{pago.referencia?.includes('ENTERPRISE') ? 'Enterprise' : pago.referencia?.includes('STARTER') ? 'Starter' : 'Pro'}</p>
            </div>
            <div>
              <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">Empresa actual</p>
              <p className="text-white capitalize">{empresa?.plan || '—'} / {empresa?.estado || '—'}</p>
            </div>
          </div>

          {/* Comprobante */}
          {pago.comprobante_url && (
            <div>
              <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-2">Comprobante</p>
              <a
                href={`https://gqlhillifpxizbaqaagl.supabase.co/storage/v1/object/public/comprobantes/${pago.comprobante_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm underline"
              >
                <ExternalLink size={14} /> Ver comprobante
              </a>
            </div>
          )}

          {/* Acciones */}
          {pago.estado === 'pendiente_aprobacion' && (
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => onAprobar(pago.id)}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm"
              >
                {isPending ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Aprobar y Activar
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
