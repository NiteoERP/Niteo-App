'use client';

import React, { useState } from 'react';
import { reportarPagoSuscripcion } from '@/actions/licencia-actions';
import { CheckCircle, Clock, UploadCloud, FileText, AlertCircle, RefreshCw, Check, PackagePlus, ShieldCheck, CreditCard, Info } from 'lucide-react';

const PLANES_CONFIG: Record<string, { nombre: string; precio: number; desc: string }> = {
  STARTER: { nombre: 'Starter', precio: 10, desc: '1 Sede · Inventario y Compras · Hasta 3 usuarios' },
  PRO: { nombre: 'Pro', precio: 25, desc: 'Hasta 2 Sedes · Despachos y traslados · Motor de Recetas · Costeo promedio' },
  ENTERPRISE: { nombre: 'Enterprise', precio: 45, desc: 'Sedes ilimitadas · Auditoría Invisible · Soporte prioritario' },
};

const PLUGINS_DISPONIBLES = [
  { id: 'recetas', nombre: 'Motor de Recetas', precio: 5, desc: 'Fichas técnicas y mermas (Solo para plan Starter)' },
  { id: 'multi-price', nombre: 'Múltiples Listas de Precios', precio: 5, desc: 'Tarifas por mayorista, mostrador o delivery' },
  { id: 'virtual-pos', nombre: 'Terminal de Venta Virtual', precio: 8, desc: 'Canal de facturación cloud para redes o WhatsApp' },
  { id: 'caja-extra', nombre: 'Licencia de Caja Adicional', precio: 5, desc: 'Conectar un punto de cobro físico extra' },
];

// Iconos por tipo de método
const METODO_ICON: Record<string, string> = {
  zelle: '💸',
  binance: '🔶',
  pago_movil: '📱',
  transferencia: '🏦',
  efectivo: '💵',
};

export default function BillingClientForm({ 
  historialPagos, 
  planActual,
  modulosActuales = [],
  metodosPago = [],
}: { 
  historialPagos: any[]; 
  planActual: string;
  modulosActuales?: string[];
  metodosPago?: { id: string; tipo: string; nombre: string; datos: any; instrucciones: string }[];
}) {
  const [tab, setTab] = useState<'reportar' | 'historial'>('reportar');
  const [loading, setLoading] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState('');

  // Configuración interactiva de plan y addons (pre-seleccionamos los que ya tiene contratados)
  const initialPlan = (planActual?.toUpperCase() in PLANES_CONFIG) ? planActual.toUpperCase() : 'STARTER';
  const [selectedPlan, setSelectedPlan] = useState<string>(initialPlan);
  const [selectedPlugins, setSelectedPlugins] = useState<string[]>(modulosActuales);

  // Selección del método de pago
  const metodosDisponibles = metodosPago.length > 0 ? metodosPago : [];
  const [metodoSeleccionado, setMetodoSeleccionado] = useState<string>(metodosDisponibles[0]?.id || '');
  const [referencia, setReferencia] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Cálculo automático del monto
  const planPrecio = PLANES_CONFIG[selectedPlan]?.precio || 10;
  const pluginsPrecio = selectedPlugins.reduce((acc, pId) => {
    const p = PLUGINS_DISPONIBLES.find(x => x.id === pId);
    return acc + (p?.precio || 0);
  }, 0);
  const montoCalculado = planPrecio + pluginsPrecio;

  const togglePlugin = (pId: string) => {
    setSelectedPlugins(prev => 
      prev.includes(pId) ? prev.filter(x => x !== pId) : [...prev, pId]
    );
  };

  const metodoActual = metodosDisponibles.find(m => m.id === metodoSeleccionado);

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
    if (file) {
      formData.append('comprobante', file);
    }

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
                  Tu sistema continúa 100% activo gracias al periodo de gracia de 5 días. Nuestro equipo verificará el pago y aplicará la renovación mensual de inmediato.
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

                {/* 1. Selección de Plan Base */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Paso 1: Elige tu Plan Base
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {Object.entries(PLANES_CONFIG).map(([key, p]) => {
                      const isSelected = selectedPlan === key;
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
                            <span className="text-xs font-bold text-indigo-400">${p.precio}/mes</span>
                          </div>
                          <p className="text-xs text-neutral-500 leading-tight">{p.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Selección de Plugins / Módulos Adicionales */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">
                      Paso 2: Plugins y Módulos Adicionales (Opcional)
                    </label>
                    <span className="text-[11px] text-neutral-500">Añade funciones a la carta</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {PLUGINS_DISPONIBLES.map((pl) => {
                      const isChecked = selectedPlugins.includes(pl.id);
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
                              <span className="text-xs font-bold text-indigo-400">+${pl.precio}</span>
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

                {/* Resumen Total Calculado */}
                <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-neutral-500 font-medium">Total mensual a pagar:</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Plan {PLANES_CONFIG[selectedPlan]?.nombre} (${planPrecio})
                      {selectedPlugins.length > 0 && ` + ${selectedPlugins.length} plugin(s) ($${pluginsPrecio})`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-white">${montoCalculado}.00</span>
                    <span className="text-xs text-neutral-500 ml-1">USD/mes</span>
                  </div>
                </div>

                {/* 3. Datos del Reporte de Pago */}
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
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 text-sm"
                >
                  {loading ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                  Reportar Pago (${montoCalculado}.00 USD)
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
                      ${p.monto} <span className="text-neutral-500 font-normal ml-2">via {p.metodo_pago}</span>
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
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
