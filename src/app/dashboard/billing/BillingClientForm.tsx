'use client';

import React, { useState } from 'react';
import { reportarPagoSuscripcion } from '@/actions/licencia-actions';
import {
  CheckCircle, Clock, UploadCloud, FileText, AlertCircle,
  RefreshCw, Check, Info, Zap, Calendar, Gift,
} from 'lucide-react';

const PLANES_CONFIG: Record<string, { nombre: string; precio: number; desc: string }> = {
  STARTER:    { nombre: 'Starter',    precio: 10, desc: '1 Sede · Inventario y Compras · Hasta 3 usuarios' },
  PRO:        { nombre: 'Pro',        precio: 25, desc: 'Hasta 2 Sedes · Despachos · Motor de Recetas · Costeo promedio' },
  ENTERPRISE: { nombre: 'Enterprise', precio: 45, desc: 'Sedes ilimitadas · Auditoría Invisible · Soporte prioritario' },
};

const PLUGINS_DISPONIBLES = [
  { id: 'recetas',     nombre: 'Motor de Recetas',           precio: 5, desc: 'Fichas técnicas y mermas (Solo Starter)' },
  { id: 'multi-price', nombre: 'Múltiples Listas de Precios', precio: 5, desc: 'Tarifas por mayorista, mostrador o delivery' },
  { id: 'virtual-pos', nombre: 'Terminal de Venta Virtual',  precio: 8, desc: 'Canal de facturación cloud para WhatsApp' },
  { id: 'caja-extra',  nombre: 'Licencia de Caja Adicional', precio: 5, desc: 'Punto de cobro físico adicional' },
];

const METODO_ICON: Record<string, string> = {
  zelle: '💸', binance: '🔶', pago_movil: '📱', transferencia: '🏦', efectivo: '💵',
};

// Plan anual = 10 meses de precio, 12 meses de acceso (2 meses gratis)
const MESES_COBRADOS_ANUAL = 10;
const MESES_ACCESO_ANUAL   = 12;

export default function BillingClientForm({
  historialPagos,
  planActual,
  modulosActuales = [],
  metodosPago = [],
  licenciaEstado,
  diasRestantes,
}: {
  historialPagos: any[];
  planActual: string;
  modulosActuales?: string[];
  metodosPago?: { id: string; tipo: string; nombre: string; datos: any; instrucciones: string }[];
  licenciaEstado?: string;
  diasRestantes?: number;
}) {
  const [tab, setTab] = useState<'reportar' | 'historial'>('reportar');
  const [loading, setLoading] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState('');

  // Ciclo de facturación: mensual o anual (10 meses → 12 meses de acceso)
  const [ciclo, setCiclo] = useState<'mensual' | 'anual'>('mensual');

  // Plan y addons pre-seleccionados desde los contratados
  const initialPlan = (planActual?.toUpperCase() in PLANES_CONFIG) ? planActual.toUpperCase() : 'STARTER';
  const [selectedPlan, setSelectedPlan] = useState<string>(initialPlan);
  const [selectedPlugins, setSelectedPlugins] = useState<string[]>(modulosActuales);

  const metodosDisponibles = metodosPago.length > 0 ? metodosPago : [];
  const [metodoSeleccionado, setMetodoSeleccionado] = useState<string>(metodosDisponibles[0]?.id || '');
  const [referencia, setReferencia] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // ── Cálculo de montos ────────────────────────────────────────────────────
  const planPrecio  = PLANES_CONFIG[selectedPlan]?.precio || 10;
  const pluginsPrecio = selectedPlugins.reduce((acc, pId) => {
    const p = PLUGINS_DISPONIBLES.find(x => x.id === pId);
    return acc + (p?.precio || 0);
  }, 0);
  const baseMonthly = planPrecio + pluginsPrecio;

  // Mensual: precio normal. Anual: × 10 meses (2 gratis)
  const montoMensual = baseMonthly;
  const montoAnual   = baseMonthly * MESES_COBRADOS_ANUAL;
  const ahorro       = baseMonthly * (MESES_ACCESO_ANUAL - MESES_COBRADOS_ANUAL); // 2 meses

  const montoCalculado = ciclo === 'anual' ? montoAnual : montoMensual;

  const togglePlugin = (pId: string) => {
    setSelectedPlugins(prev =>
      prev.includes(pId) ? prev.filter(x => x !== pId) : [...prev, pId]
    );
  };

  const metodoActual = metodosDisponibles.find(m => m.id === metodoSeleccionado);

  // ¿El usuario está en plan activo con más de 3 días? → pago anticipado
  const esPagoAnticipado = licenciaEstado === 'ACTIVA' && (diasRestantes === undefined || diasRestantes > 3);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('monto', montoCalculado.toString());
    formData.append('metodo_pago', metodoActual?.nombre || metodoSeleccionado);
    formData.append('referencia', referencia);
    formData.append('plan_solicitado', selectedPlan);
    formData.append('modulos', selectedPlugins.join(','));
    formData.append('ciclo', ciclo);   // mensual | anual
    if (file) formData.append('comprobante', file);

    try {
      const res = await reportarPagoSuscripcion(formData);
      if (res.success) {
        setExito(true);
        setReferencia('');
        setFile(null);
        window.location.reload();
      } else {
        setError(res.error || 'Error desconocido');
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col">
      <div className="flex items-center border-b border-neutral-800 bg-neutral-950/40">
        <button
          onClick={() => setTab('reportar')}
          className={`flex-1 py-4 text-sm font-bold transition-colors ${tab === 'reportar' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-neutral-900/50' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          Activar o Renovar Plan
        </button>
        <button
          onClick={() => setTab('historial')}
          className={`flex-1 py-4 text-sm font-bold transition-colors ${tab === 'historial' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-neutral-900/50' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          Historial de Pagos
        </button>
      </div>

      <div className="p-6">
        {tab === 'reportar' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {exito ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-2xl text-center space-y-4">
                <CheckCircle size={52} className="text-emerald-500 mx-auto" />
                <h3 className="text-xl font-bold text-white">Pago reportado con éxito</h3>
                <p className="text-sm text-emerald-400 max-w-md mx-auto leading-relaxed">
                  Tu sistema continúa 100% activo gracias al periodo de gracia de 5 días.
                  Nuestro equipo verificará el pago y aplicará la renovación de inmediato.
                </p>
                <button
                  type="button"
                  onClick={() => setExito(false)}
                  className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-semibold text-sm transition-colors"
                >
                  Reportar otro comprobante
                </button>
              </div>
            ) : (
              <>
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle size={18} className="shrink-0" /> {error}
                  </div>
                )}

                {/* Banner pago anticipado (plan activo, más de 3 días) */}
                {esPagoAnticipado && (
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-3 flex items-center gap-3 text-indigo-300 text-sm">
                    <Clock size={16} className="shrink-0 text-indigo-400" />
                    <span>
                      Tu plan está <strong className="text-white">activo</strong> — estás haciendo una{' '}
                      <strong>renovación anticipada</strong>. Al aprobar, la fecha de vencimiento se extenderá
                      al 1ro del mes siguiente.
                    </span>
                  </div>
                )}

                {/* ── Toggle Mensual / Anual ─────────────────────────────── */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Ciclo de facturación
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Mensual */}
                    <button
                      type="button"
                      onClick={() => setCiclo('mensual')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        ciclo === 'mensual'
                          ? 'bg-indigo-600/15 border-indigo-500 text-white'
                          : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <Calendar size={14} />
                        <span className="font-bold text-sm">Mensual</span>
                      </div>
                      <p className="text-xs text-neutral-500">Pagas cada mes · 1 mes de acceso</p>
                    </button>

                    {/* Anual */}
                    <button
                      type="button"
                      onClick={() => setCiclo('anual')}
                      className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden ${
                        ciclo === 'anual'
                          ? 'bg-emerald-600/15 border-emerald-500 text-white'
                          : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'
                      }`}
                    >
                      {/* Badge 2 meses gratis */}
                      <span className="absolute top-1.5 right-2 bg-emerald-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full">
                        2 MESES GRATIS
                      </span>
                      <div className="flex items-center gap-2 mb-0.5">
                        <Gift size={14} className={ciclo === 'anual' ? 'text-emerald-400' : ''} />
                        <span className="font-bold text-sm">Anual</span>
                      </div>
                      <p className="text-xs text-neutral-500">Pagas 10 meses · 12 de acceso</p>
                    </button>
                  </div>
                </div>

                {/* ── 1. Selección de Plan Base ─────────────────────────── */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Paso 1: Elige tu Plan Base
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {Object.entries(PLANES_CONFIG).map(([key, p]) => {
                      const isSelected = selectedPlan === key;
                      const precioAnual = p.precio * MESES_COBRADOS_ANUAL;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedPlan(key)}
                          className={`p-4 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-indigo-600/15 border-indigo-500 shadow-lg shadow-indigo-600/10 text-white'
                              : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-base">{p.nombre}</span>
                            {ciclo === 'mensual' ? (
                              <span className="text-xs font-bold text-indigo-400">${p.precio}/mes</span>
                            ) : (
                              <div className="text-right">
                                <span className="text-xs font-bold text-emerald-400">${precioAnual}/año</span>
                                <p className="text-[10px] text-neutral-500">≈ ${p.precio}/mes</p>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-neutral-500 leading-tight">{p.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── 2. Plugins ────────────────────────────────────────── */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">
                      Paso 2: Plugins Adicionales (Opcional)
                    </label>
                    <span className="text-[11px] text-neutral-500">A la carta</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {PLUGINS_DISPONIBLES.map((pl) => {
                      const isChecked = selectedPlugins.includes(pl.id);
                      const precioPlugin = ciclo === 'anual' ? pl.precio * MESES_COBRADOS_ANUAL : pl.precio;
                      return (
                        <div
                          key={pl.id}
                          onClick={() => togglePlugin(pl.id)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                            isChecked
                              ? 'bg-indigo-500/10 border-indigo-500/50 text-white'
                              : 'bg-neutral-950/50 border-neutral-800/80 text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold truncate">{pl.nombre}</span>
                              <span className="text-xs font-bold text-indigo-400">
                                {ciclo === 'anual' ? `+$${precioPlugin}/año` : `+$${pl.precio}/mes`}
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-500 truncate mt-0.5">{pl.desc}</p>
                          </div>
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isChecked ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-neutral-700 bg-neutral-900'
                          }`}>
                            {isChecked && <Check size={14} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Resumen Total ─────────────────────────────────────── */}
                <div className={`rounded-xl p-4 border ${
                  ciclo === 'anual'
                    ? 'bg-emerald-950/30 border-emerald-800/50'
                    : 'bg-neutral-950 border-neutral-800/80'
                }`}>
                  {ciclo === 'mensual' ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-neutral-500 font-medium">Total mensual a pagar:</p>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Plan {PLANES_CONFIG[selectedPlan]?.nombre} (${planPrecio})
                          {selectedPlugins.length > 0 && ` + ${selectedPlugins.length} plugin(s) ($${pluginsPrecio})`}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-white">${montoMensual.toFixed(2)}</span>
                        <span className="text-xs text-neutral-500 ml-1">USD/mes</span>
                      </div>
                    </div>
                  ) : (
                    /* Resumen anual con ahorro destacado */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-neutral-400 font-medium">Total anual a pagar:</p>
                            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                              2 MESES GRATIS
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            Plan {PLANES_CONFIG[selectedPlan]?.nombre} · {MESES_COBRADOS_ANUAL} meses cobrados · {MESES_ACCESO_ANUAL} meses de acceso
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black text-white">${montoAnual.toFixed(2)}</span>
                          <span className="text-xs text-neutral-500 ml-1">USD/año</span>
                        </div>
                      </div>
                      {/* Desglose de ahorro */}
                      <div className="pt-3 border-t border-emerald-800/40 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-400">
                          <Zap size={14} />
                          <span className="text-xs font-semibold">
                            Vs. pagar mensual: ${(montoMensual * 12).toFixed(2)}/año
                          </span>
                        </div>
                        <div className="bg-emerald-500 text-black text-xs font-black px-3 py-1 rounded-lg">
                          Ahorras ${ahorro.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── 3. Método de pago ─────────────────────────────────── */}
                <div className="space-y-4 pt-2 border-t border-neutral-800">
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Paso 3: Elige cómo vas a pagar
                  </label>

                  {metodosDisponibles.length === 0 ? (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-400 text-sm">
                      El equipo de Niteo aún no ha configurado métodos de pago. Escríbenos a soporte@niteo.app
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {metodosDisponibles.map(m => {
                        const isSelected = metodoSeleccionado === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setMetodoSeleccionado(m.id)}
                            className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                              isSelected
                                ? 'bg-indigo-600/15 border-indigo-500 text-white'
                                : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                            }`}
                          >
                            <span className="text-2xl">{METODO_ICON[m.tipo] || '💳'}</span>
                            <span className="font-semibold text-sm">{m.nombre}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Datos del método seleccionado */}
                  {metodoActual && (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Info size={13} /> Datos para realizar el pago
                      </p>
                      {/* Monto a pagar bien visible */}
                      <div className="bg-indigo-600/20 rounded-lg px-3 py-2 flex items-center justify-between">
                        <span className="text-xs text-indigo-300">Monto exacto a enviar:</span>
                        <span className="text-lg font-black text-white">
                          ${montoCalculado.toFixed(2)} USD
                          {ciclo === 'anual' && <span className="text-xs font-normal text-emerald-400 ml-1">(anual)</span>}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(metodoActual.datos as Record<string, string>).map(([k, v]) => v && (
                          <div key={k}>
                            <p className="text-xs text-indigo-300/70 capitalize">{k.replace(/_/g, ' ')}</p>
                            <p className="text-sm text-white font-mono font-semibold">{v}</p>
                          </div>
                        ))}
                      </div>
                      {metodoActual.instrucciones && (
                        <p className="text-xs text-indigo-200/80 mt-2 pt-2 border-t border-indigo-500/20">
                          {metodoActual.instrucciones}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Número de Referencia / Confirmación</label>
                    <input
                      required
                      type="text"
                      value={referencia}
                      onChange={e => setReferencia(e.target.value)}
                      placeholder="Ej. 9845210"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl h-11 px-3 text-white text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Comprobante de Pago (Captura)</label>
                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-neutral-800 hover:border-indigo-500 rounded-xl bg-neutral-950/40 hover:bg-neutral-800/30 transition-all cursor-pointer">
                      <div className="flex flex-col items-center justify-center py-4 text-neutral-400">
                        <UploadCloud size={22} className="mb-1.5 text-indigo-400" />
                        <p className="text-xs">{file ? file.name : 'Haz clic para adjuntar comprobante (PNG, JPG o PDF)'}</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={e => setFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !referencia}
                  className={`w-full h-12 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg text-sm ${
                    ciclo === 'anual'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                      : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
                  }`}
                >
                  {loading ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                  {ciclo === 'anual'
                    ? `Reportar Pago Anual — $${montoCalculado.toFixed(2)} USD (ahorras $${ahorro.toFixed(2)})`
                    : `Reportar Pago — $${montoCalculado.toFixed(2)} USD`
                  }
                </button>
              </>
            )}
          </form>
        )}

        {tab === 'historial' && (
          <div className="space-y-3">
            {historialPagos.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                <FileText size={36} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">No tienes pagos reportados todavía</p>
              </div>
            ) : (
              historialPagos.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-neutral-950 rounded-xl border border-neutral-800">
                  <div>
                    <p className="font-bold text-white text-sm">
                      ${p.monto}{' '}
                      <span className="text-neutral-500 font-normal ml-2">via {p.metodo_pago}</span>
                      {p.plan_solicitado?.includes('[ANUAL]') && (
                        <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded-full">ANUAL</span>
                      )}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {p.plan_solicitado && <span className="mr-2">Plan: {p.plan_solicitado.split(' [')[0]}</span>}
                      Ref: {p.referencia} • {new Date(p.fecha_reporte || p.fecha_registro || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                      p.estado === 'APROBADO' || p.estado === 'aprobado' ? 'bg-emerald-500/20 text-emerald-400' :
                      p.estado === 'RECHAZADO' || p.estado === 'rechazado' ? 'bg-red-500/20 text-red-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {p.estado}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
