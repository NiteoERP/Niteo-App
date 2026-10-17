'use client';

import React, { useState, useEffect } from 'react';
import { reportarPagoSuscripcion } from '@/actions/licencia-actions';
import {
  CheckCircle, Clock, UploadCloud, FileText, AlertCircle,
  RefreshCw, Check, Info, Zap, Calendar, Gift, Copy, ExternalLink, Image as ImageIcon, X, Building2
} from 'lucide-react';

const PLANES_CONFIG: Record<string, { nombre: string; precio: number; desc: string }> = {
  STARTER:    { nombre: 'Starter',    precio: 10, desc: '1 Sede · Inventario y Compras · Hasta 3 usuarios' },
  PRO:        { nombre: 'Pro',        precio: 25, desc: 'Hasta 2 Sedes · Despachos · Motor de Recetas · Costeo promedio' },
  ENTERPRISE: { nombre: 'Enterprise', precio: 45, desc: 'Sedes ilimitadas · Auditoría Invisible · Soporte prioritario' },
};

const PLUGINS_DISPONIBLES = [
  { id: 'recetas',     nombre: 'Motor de Recetas',            precio: 5, desc: 'Fichas técnicas y mermas (Solo Starter)' },
  { id: 'multi-price', nombre: 'Múltiples Listas de Precios', precio: 5, desc: 'Tarifas por mayorista, mostrador o delivery' },
  { id: 'virtual-pos', nombre: 'Terminal de Venta Virtual',   precio: 8, desc: 'Canal de facturación cloud para WhatsApp' },
  { id: 'caja-extra',  nombre: 'Licencia de Caja Adicional',  precio: 5, desc: 'Punto de cobro físico adicional' },
];

const METODO_ICON: Record<string, string> = {
  zelle: '💸', binance: '🔶', pago_movil: '📱', transferencia: '🏦', efectivo: '💵',
};

const CAMPO_LABELS: Record<string, string> = {
  email: 'Correo Zelle',
  titular: 'Beneficiario / Titular',
  pay_id: 'Binance Pay ID / Correo',
  wallet: 'Wallet USDT',
  banco: 'Banco Destino',
  telefono: 'Teléfono Pago Móvil',
  cedula: 'Cédula / RIF',
  cuenta: 'Número de Cuenta',
  tipo: 'Tipo de Cuenta',
  rif: 'RIF',
  contacto: 'Contacto de Coordinación',
};

// Plan anual = 10 meses de precio, 12 meses de acceso (2 meses gratis)
const MESES_COBRADOS_ANUAL = 10;
const MESES_ACCESO_ANUAL   = 12;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

export default function BillingClientForm({
  historialPagos,
  planActual,
  modulosActuales = [],
  metodosPago = [],
  licenciaEstado,
  diasRestantes,
  tasaBcv = null,
}: {
  historialPagos: any[];
  planActual: string;
  modulosActuales?: string[];
  metodosPago?: { id: string; tipo: string; nombre: string; datos: any; instrucciones: string }[];
  licenciaEstado?: string;
  diasRestantes?: number;
  tasaBcv?: number | null;
}) {
  const [tab, setTab] = useState<'reportar' | 'historial'>('reportar');
  const [loading, setLoading] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  // Ciclo de facturación: mensual o anual (10 meses → 12 meses de acceso)
  const [ciclo, setCiclo] = useState<'mensual' | 'anual'>('mensual');

  // Plan y addons pre-seleccionados desde los contratados
  const initialPlan = (planActual?.toUpperCase() in PLANES_CONFIG) ? planActual.toUpperCase() : 'PRO';
  const [selectedPlan, setSelectedPlan] = useState<string>(initialPlan);
  const [selectedPlugins, setSelectedPlugins] = useState<string[]>(
    (modulosActuales || []).filter(m => PLUGINS_DISPONIBLES.some(p => p.id === m))
  );

  const metodosDisponibles = metodosPago.length > 0 ? metodosPago : [];
  const [metodoSeleccionado, setMetodoSeleccionado] = useState<string>(metodosDisponibles[0]?.id || '');
  const [referencia, setReferencia] = useState('');
  const [bancoOrigen, setBancoOrigen] = useState('');
  const [fechaPago, setFechaPago] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setFilePreview(null);
      return;
    }
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setFilePreview(null);
    }
  }, [file]);

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
  const esMetodoEnBs = metodoActual?.tipo === 'pago_movil' || metodoActual?.tipo === 'transferencia';
  const esEfectivo = metodoActual?.tipo === 'efectivo';
  const montoEnBs = (tasaBcv && tasaBcv > 0) ? Math.round(montoCalculado * tasaBcv * 100) / 100 : null;

  // ¿El usuario está en plan activo con más de 3 días? → pago anticipado
  const esPagoAnticipado = licenciaEstado === 'ACTIVA' && (diasRestantes === undefined || diasRestantes > 3);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!metodoActual) {
      setError('Selecciona un método de pago válido.');
      return;
    }
    if (!referencia.trim()) {
      setError('Ingresa el número de referencia o confirmación del pago.');
      return;
    }
    if (!esEfectivo && !file) {
      setError('Adjunta la captura de pantalla (comprobante) de tu pago para poder verificarlo.');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('monto', montoCalculado.toString());
    formData.append('metodo_pago', metodoActual.nombre);
    formData.append('referencia', referencia.trim());
    formData.append('banco_destino', bancoOrigen.trim());
    formData.append('fecha_pago', fechaPago);
    formData.append('plan_solicitado', selectedPlan);
    formData.append('modulos', selectedPlugins.join(','));
    formData.append('ciclo', ciclo); // mensual | anual
    if (file) formData.append('comprobante', file);

    try {
      const res = await reportarPagoSuscripcion(formData);
      if (res.success) {
        setExito(true);
        setReferencia('');
        setBancoOrigen('');
        setFile(null);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setError(res.error || 'Error desconocido al registrar el pago');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión al reportar el pago');
    }
    setLoading(false);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col">
      <div className="flex items-center border-b border-neutral-800 bg-neutral-950/40">
        <button
          type="button"
          onClick={() => setTab('reportar')}
          className={`flex-1 py-4 text-sm font-bold transition-colors ${tab === 'reportar' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-neutral-900/50' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          Activar o Renovar Plan
        </button>
        <button
          type="button"
          onClick={() => setTab('historial')}
          className={`flex-1 py-4 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${tab === 'historial' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-neutral-900/50' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          <span>Historial de Pagos</span>
          {historialPagos.length > 0 && (
            <span className="px-2 py-0.5 text-[11px] rounded-full bg-neutral-800 text-neutral-300">
              {historialPagos.length}
            </span>
          )}
        </button>
      </div>

      <div className="p-6">
        {tab === 'reportar' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {exito ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-2xl text-center space-y-4">
                <CheckCircle size={52} className="text-emerald-500 mx-auto" />
                <h3 className="text-xl font-bold text-white">¡Pago y captura registrados con éxito!</h3>
                <p className="text-sm text-emerald-400 max-w-md mx-auto leading-relaxed">
                  Hemos recibido los datos de tu pago y su comprobante. Tu sistema continúa 100% activo
                  mientras verificamos la transacción.
                </p>
                <button
                  type="button"
                  onClick={() => { setExito(false); setTab('historial'); }}
                  className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-semibold text-sm transition-colors"
                >
                  Ver en mi historial de pagos
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
                      <strong>renovación anticipada</strong>. Al aprobarse tu pago, se sumará el nuevo periodo sin perder tus días actuales.
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
                        {montoEnBs && (
                          <p className="text-xs text-indigo-400 font-semibold mt-0.5">
                            ≈ Bs {montoEnBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (BCV)
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
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
                          {montoEnBs && (
                            <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                              ≈ Bs {montoEnBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (BCV)
                            </p>
                          )}
                        </div>
                      </div>
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

                {/* ── 3. Método de pago y Comprobante ───────────────────── */}
                <div className="space-y-4 pt-2 border-t border-neutral-800">
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Paso 3: Elige tu Método de Pago y Reporta tu Comprobante
                  </label>

                  {metodosDisponibles.length === 0 ? (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-400 text-sm">
                      El equipo de Niteo aún no ha habilitado métodos de pago activos. Contáctanos para asistirte.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {metodosDisponibles.map(m => {
                        const isSelected = metodoSeleccionado === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setMetodoSeleccionado(m.id)}
                            className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm'
                                : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{METODO_ICON[m.tipo] || '💳'}</span>
                              <div>
                                <span className="font-bold text-sm block">{m.nombre}</span>
                                <span className="text-[11px] text-neutral-500">
                                  {m.tipo === 'pago_movil' || m.tipo === 'transferencia' ? 'Bolívares (Tasa BCV)' : 'Dólares (USD / USDT)'}
                                </span>
                              </div>
                            </div>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-indigo-400 bg-indigo-500' : 'border-neutral-700'
                            }`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Datos del método seleccionado con copiado rápido */}
                  {metodoActual && (
                    <div className="bg-indigo-500/10 border border-indigo-500/25 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Info size={14} /> Datos oficiales para transferir ({metodoActual.nombre})
                        </p>
                        <span className="text-[11px] text-indigo-300/70">Toca cualquier dato para copiar</span>
                      </div>

                      {/* Monto exacto a pagar */}
                      <div className="bg-neutral-950/70 border border-indigo-500/20 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-xs text-indigo-300 block">Monto exacto a transferir:</span>
                          <span className="text-lg font-black text-white">
                            ${montoCalculado.toFixed(2)} USD
                          </span>
                        </div>

                        {esMetodoEnBs && montoEnBs ? (
                          <button
                            type="button"
                            onClick={() => handleCopy('monto_bs', montoEnBs.toFixed(2))}
                            className="bg-indigo-600/25 hover:bg-indigo-600/35 border border-indigo-500/40 rounded-lg px-3 py-1.5 text-right transition-colors flex items-center gap-2"
                            title="Copiar monto en Bolívares"
                          >
                            <div>
                              <span className="text-[10px] text-indigo-300 block uppercase font-bold">
                                En Bolívares (Tasa BCV: {tasaBcv?.toLocaleString('es-VE')})
                              </span>
                              <span className="text-base font-black text-emerald-400">
                                Bs {montoEnBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            {copiedKey === 'monto_bs' ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} className="text-indigo-300" />}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCopy('monto_usd', montoCalculado.toFixed(2))}
                            className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                          >
                            {copiedKey === 'monto_usd' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                            {copiedKey === 'monto_usd' ? 'Copiado' : 'Copiar monto'}
                          </button>
                        )}
                      </div>

                      {/* Campos de cuenta/teléfono/cédula/correo */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {Object.entries((metodoActual.datos || {}) as Record<string, string>).map(([k, v]) => {
                          if (!v || k === 'qr_url') return null;
                          return (
                            <div
                              key={k}
                              onClick={() => handleCopy(k, v)}
                              className="bg-neutral-950/60 hover:bg-neutral-950 border border-indigo-500/15 hover:border-indigo-500/40 rounded-lg p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-all group"
                            >
                              <div className="min-w-0">
                                <p className="text-[11px] text-indigo-300/70 font-medium">
                                  {CAMPO_LABELS[k] || k.replace(/_/g, ' ')}
                                </p>
                                <p className="text-sm text-white font-mono font-bold truncate">{v}</p>
                              </div>
                              <span className="text-indigo-400/70 group-hover:text-indigo-300 shrink-0 p-1">
                                {copiedKey === k ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Si el método tiene QR configurado */}
                      {metodoActual.datos?.qr_url && (
                        <div className="pt-2 flex flex-col items-center">
                          <p className="text-xs text-indigo-300 mb-2 font-medium">Código QR de pago:</p>
                          <img
                            src={metodoActual.datos.qr_url}
                            alt={`QR ${metodoActual.nombre}`}
                            className="w-40 h-40 object-contain bg-white p-2 rounded-xl border border-indigo-500/30"
                          />
                        </div>
                      )}

                      {metodoActual.instrucciones && (
                        <p className="text-xs text-indigo-200/90 pt-2 border-t border-indigo-500/20 leading-relaxed">
                          {metodoActual.instrucciones}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Campos de registro del pago realizado */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Número de Referencia / ID <span className="text-red-400">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        value={referencia}
                        onChange={e => setReferencia(e.target.value)}
                        placeholder="Ej. 98452104"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl h-11 px-3 text-white text-sm font-mono focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Banco Emisor / Titular Origen
                      </label>
                      <input
                        type="text"
                        value={bancoOrigen}
                        onChange={e => setBancoOrigen(e.target.value)}
                        placeholder={esMetodoEnBs ? 'Ej. Banesco / Mercantil' : 'Nombre del titular o cuenta'}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl h-11 px-3 text-white text-sm focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Fecha del Pago <span className="text-red-400">*</span>
                      </label>
                      <input
                        required
                        type="date"
                        value={fechaPago}
                        onChange={e => setFechaPago(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl h-11 px-3 text-white text-sm focus:border-indigo-500 focus:outline-none [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  {/* Adjuntar Comprobante (Capture) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Captura de Pantalla / Comprobante de Pago {!esEfectivo && <span className="text-red-400">*</span>}
                      </label>
                      {file && (
                        <button
                          type="button"
                          onClick={() => setFile(null)}
                          className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                        >
                          <X size={13} /> Quitar captura
                        </button>
                      )}
                    </div>

                    <label className={`flex flex-col items-center justify-center w-full min-h-[120px] border-2 border-dashed rounded-xl transition-all cursor-pointer p-4 ${
                      file
                        ? 'border-emerald-500/50 bg-emerald-500/5'
                        : 'border-neutral-800 hover:border-indigo-500 bg-neutral-950/40 hover:bg-neutral-800/30'
                    }`}>
                      {file ? (
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                          {filePreview ? (
                            <img
                              src={filePreview}
                              alt="Vista previa del comprobante"
                              className="h-24 w-24 object-cover rounded-lg border border-emerald-500/30 shrink-0"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                              <FileText size={28} />
                            </div>
                          )}
                          <div className="flex-1 text-center sm:text-left min-w-0">
                            <p className="text-sm font-bold text-emerald-400 flex items-center justify-center sm:justify-start gap-1.5">
                              <CheckCircle size={15} /> Captura lista para enviar
                            </p>
                            <p className="text-xs text-white truncate mt-0.5">{file.name}</p>
                            <p className="text-[11px] text-neutral-500 mt-0.5">
                              {(file.size / 1024).toFixed(0)} KB · Haz clic si deseas cambiar la imagen
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-3 text-neutral-400 text-center">
                          <UploadCloud size={26} className="mb-2 text-indigo-400" />
                          <p className="text-xs font-semibold text-neutral-200">
                            Haz clic aquí para subir el capture de tu transferencia o pago
                          </p>
                          <p className="text-[11px] text-neutral-500 mt-1">
                            Formatos soportados: Imagen (JPG, PNG, WEBP) o PDF · Máx. 10 MB
                          </p>
                        </div>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={e => setFile(e.target.files?.[0] || null)}
                      />
                    </label>
                    <p className="text-[11px] text-neutral-400 mt-1.5">
                      🔒 Minimización de datos: Tu comprobante solo debe mostrar el monto, fecha y número de referencia. No incluyas claves ni datos bancarios confidenciales.
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-400 text-center">
                  Al reportar este pago confirmas que los datos son verídicos y aceptas los{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                    Términos de Uso
                  </a>{' '}
                  y la{' '}
                  <a href="/reembolsos" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                    Política de Reembolso
                  </a>
                  .
                </p>

                <button
                  type="submit"
                  disabled={loading || !referencia.trim() || (!esEfectivo && !file)}
                  className={`w-full h-12 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg text-sm ${
                    ciclo === 'anual'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                      : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
                  }`}
                >
                  {loading ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                  {ciclo === 'anual'
                    ? `Reportar Pago Anual — $${montoCalculado.toFixed(2)} USD`
                    : `Reportar Pago Mensual — $${montoCalculado.toFixed(2)} USD`
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
                <p className="text-sm font-medium text-neutral-400">No tienes pagos reportados todavía</p>
                <p className="text-xs text-neutral-600 mt-1">
                  Cuando reportes el pago de tu mensualidad, aparecerá aquí con su capture y estado de verificación.
                </p>
              </div>
            ) : (
              historialPagos.map((p, i) => {
                const comprobanteUrl = p.comprobante_url
                  ? `${SUPABASE_URL}/storage/v1/object/public/comprobantes/${p.comprobante_url}`
                  : null;
                const esImg = comprobanteUrl && !comprobanteUrl.toLowerCase().endsWith('.pdf');
                const estadoNorm = (p.estado || '').toLowerCase();
                const fechaMostrar = p.fecha_pago
                  ? new Date(p.fecha_pago + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
                  : new Date(p.fecha_registro || Date.now()).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });

                return (
                  <div key={p.id || i} className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-white text-base">
                            ${Number(p.monto).toFixed(2)} USD
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
                            {p.metodo_pago}
                          </span>
                          {p.plan_solicitado && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300">
                              {p.plan_solicitado}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 mt-1.5 font-mono">
                          Ref: <strong className="text-neutral-200">{p.referencia}</strong>
                          {p.banco_destino && <span className="font-sans text-neutral-500"> · Origen: {p.banco_destino}</span>}
                          <span className="font-sans text-neutral-500"> · Fecha: {fechaMostrar}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {comprobanteUrl && (
                          esImg ? (
                            <button
                              type="button"
                              onClick={() => setPreviewModalUrl(comprobanteUrl)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral-900 hover:bg-neutral-800 text-indigo-400 border border-neutral-800 flex items-center gap-1.5 transition-colors"
                            >
                              <ImageIcon size={13} /> Ver Capture
                            </button>
                          ) : (
                            <a
                              href={comprobanteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral-900 hover:bg-neutral-800 text-indigo-400 border border-neutral-800 flex items-center gap-1.5 transition-colors"
                            >
                              <ExternalLink size={13} /> Ver PDF
                            </a>
                          )
                        )}

                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                          estadoNorm === 'aprobado' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          estadoNorm === 'rechazado' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {estadoNorm === 'pendiente_aprobacion' ? 'EN REVISIÓN' : p.estado?.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {p.notas_admin && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-300">
                        <strong>Nota de revisión:</strong> {p.notas_admin}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Modal para ver el capture adjunto sin salir de Niteo */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div
            className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-2xl w-full p-4 space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ImageIcon size={16} className="text-indigo-400" /> Comprobante de Pago Adjunto
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={previewModalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800"
                >
                  <ExternalLink size={12} /> Abrir original
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewModalUrl(null)}
                  className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="bg-black rounded-xl overflow-hidden flex items-center justify-center max-h-[75vh]">
              <img
                src={previewModalUrl}
                alt="Comprobante de pago"
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
