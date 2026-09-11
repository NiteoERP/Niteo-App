'use client';

import React, { useState, useTransition } from 'react';
import { cambiarPlan, extenderLicencia, suspenderEmpresa } from './actions';
import { Building2, Calendar, CheckCircle, AlertTriangle, XCircle, Clock, ChevronDown, ChevronUp, RefreshCw, Plus, Minus, Shield } from 'lucide-react';

const PLAN_BADGE: Record<string, string> = {
  STARTER:    'bg-neutral-700 text-neutral-300',
  PRO:        'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20',
  ENTERPRISE: 'bg-purple-500/20 text-purple-400 border border-purple-500/20',
  LIFETIME:   'bg-amber-500/20 text-amber-400 border border-amber-500/20',
  SUSPENDIDA: 'bg-red-500/20 text-red-400 border border-red-500/20',
};

const PLANES = ['STARTER', 'PRO', 'ENTERPRISE', 'LIFETIME'];

function EmpresaCard({ empresa, onAction, isPending }: {
  empresa: any;
  onAction: (fn: () => Promise<any>) => void;
  isPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [diasExtender, setDiasExtender] = useState(30);

  const sub = empresa.suscripciones_empresas?.[0];
  const plan = (sub?.plan || empresa.plan || 'STARTER').toUpperCase();
  const estado = sub?.estado || empresa.estado || 'TRIAL';
  const fechaVenc = sub?.fecha_vencimiento || empresa.fecha_vencimiento_plan;

  const diasRestantes = fechaVenc
    ? Math.ceil((new Date(fechaVenc).getTime() - Date.now()) / 86400000)
    : null;

  const estadoColor =
    estado === 'activa' || estado === 'ACTIVA' ? 'text-emerald-400' :
    estado === 'suspendida' ? 'text-red-400' :
    'text-amber-400';

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
      <div
        className="p-5 flex flex-wrap items-center gap-4 cursor-pointer hover:bg-neutral-800/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={16} className="text-indigo-400 shrink-0" />
            <p className="font-bold text-white">{empresa.nombre_comercial}</p>
          </div>
          <p className="text-xs text-neutral-500">{empresa.email_contacto}</p>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${PLAN_BADGE[plan] || PLAN_BADGE.STARTER}`}>
            {plan}
          </span>
          <span className={`text-xs font-medium ${estadoColor}`}>
            {diasRestantes !== null
              ? diasRestantes > 0
                ? `${diasRestantes}d restantes`
                : `Vencida hace ${Math.abs(diasRestantes)}d`
              : 'Sin suscripción'}
          </span>
          {expanded ? <ChevronUp size={18} className="text-neutral-500" /> : <ChevronDown size={18} className="text-neutral-500" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-neutral-800 p-5 space-y-5 bg-neutral-950/40">
          {/* Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">Registro</p>
              <p className="text-white text-sm">{new Date(empresa.fecha_registro).toLocaleDateString('es-ES')}</p>
            </div>
            <div>
              <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">Vencimiento</p>
              <p className="text-white text-sm">
                {fechaVenc ? new Date(fechaVenc).toLocaleDateString('es-ES') : '—'}
              </p>
            </div>
            <div>
              <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">Estado</p>
              <p className={`font-bold text-sm capitalize ${estadoColor}`}>{estado}</p>
            </div>
            <div>
              <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">Plan actual</p>
              <p className="text-white font-bold text-sm">{plan}</p>
            </div>
          </div>

          {/* Cambiar plan */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Cambiar Plan (30 días)</p>
            <div className="flex flex-wrap gap-2">
              {PLANES.map(p => (
                <button
                  key={p}
                  disabled={isPending || plan === p}
                  onClick={() => onAction(() => cambiarPlan(empresa.id, p, 30))}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors border ${
                    plan === p
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 cursor-default'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700'
                  } disabled:opacity-50`}
                >
                  {p === plan ? '✓ ' : ''}{p}
                </button>
              ))}
            </div>
          </div>

          {/* Extender licencia */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Extender Licencia</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDiasExtender(d => Math.max(7, d - 7))}
                className="w-9 h-9 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-white"
              >
                <Minus size={16} />
              </button>
              <span className="text-white font-bold w-20 text-center">{diasExtender} días</span>
              <button
                onClick={() => setDiasExtender(d => d + 7)}
                className="w-9 h-9 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-white"
              >
                <Plus size={16} />
              </button>
              <button
                disabled={isPending}
                onClick={() => onAction(() => extenderLicencia(empresa.id, diasExtender))}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center gap-2 transition-colors"
              >
                {isPending ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                Extender
              </button>
            </div>
          </div>

          {/* Suspender */}
          <div className="pt-2 border-t border-neutral-800">
            <button
              disabled={isPending || estado === 'suspendida'}
              onClick={() => {
                if (confirm(`¿Seguro que deseas suspender a ${empresa.nombre_comercial}?`)) {
                  onAction(() => suspenderEmpresa(empresa.id));
                }
              }}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-xl text-sm flex items-center gap-2 transition-colors border border-red-500/20 disabled:opacity-50"
            >
              <XCircle size={14} />
              Suspender Cuenta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminEmpresasClient({ empresas }: { empresas: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [alerta, setAlerta] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const mostrarAlerta = (texto: string, tipo: 'ok' | 'error') => {
    setAlerta({ texto, tipo });
    setTimeout(() => setAlerta(null), 4000);
  };

  const handleAction = (fn: () => Promise<any>) => {
    startTransition(async () => {
      const res = await fn();
      if (res.success) {
        mostrarAlerta('✅ Cambio aplicado correctamente.', 'ok');
      } else {
        mostrarAlerta(`❌ Error: ${res.error}`, 'error');
      }
    });
  };

  const filtradas = empresas.filter(e =>
    e.nombre_comercial?.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.email_contacto?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white mb-1">Empresas</h1>
        <p className="text-neutral-400 text-sm">{empresas.length} empresas registradas en Niteo.</p>
      </header>

      {alerta && (
        <div className={`p-4 rounded-xl border text-sm font-medium ${
          alerta.tipo === 'ok'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {alerta.texto}
        </div>
      )}

      {isPending && (
        <div className="flex items-center gap-2 text-indigo-400 text-sm">
          <RefreshCw size={14} className="animate-spin" /> Aplicando cambio...
        </div>
      )}

      {/* Buscador */}
      <input
        type="text"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        placeholder="Buscar empresa..."
        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl h-11 px-4 text-white text-sm focus:border-indigo-500 focus:outline-none"
      />

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['STARTER', 'PRO', 'ENTERPRISE', 'LIFETIME'].map(plan => {
          const count = empresas.filter(e => {
            const sub = e.suscripciones_empresas?.[0];
            return (sub?.plan || e.plan || 'STARTER').toUpperCase() === plan;
          }).length;
          return (
            <div key={plan} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-white">{count}</p>
              <p className="text-xs text-neutral-500 font-bold mt-1">{plan}</p>
            </div>
          );
        })}
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {filtradas.length === 0 ? (
          <div className="text-center py-16 text-neutral-500">
            <Building2 size={40} className="mx-auto mb-3 opacity-40" />
            <p>No se encontraron empresas</p>
          </div>
        ) : (
          filtradas.map(e => (
            <EmpresaCard
              key={e.id}
              empresa={e}
              onAction={handleAction}
              isPending={isPending}
            />
          ))
        )}
      </div>
    </div>
  );
}
