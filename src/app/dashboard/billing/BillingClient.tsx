'use client';
import React, { useState } from 'react';
import { Loader2, DollarSign, Send, Check, Building2, Crown, ShieldAlert, Store, Server, Smartphone, QrCode, Building, CreditCard } from 'lucide-react';
import { reportarPagoManual } from '@/actions/billing-actions';

export default function BillingClient({ planActual }: { planActual: string }) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'BINANCE' | 'MANUAL'>('BINANCE');
  
  // Formulario Manual
  const [metodo, setMetodo] = useState('ZELLE');
  const [referencia, setReferencia] = useState('');
  const [bancoDestino, setBancoDestino] = useState('');
  const [fechaPago, setFechaPago] = useState('');

  const submitManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await reportarPagoManual(metodo, referencia, 29.99, bancoDestino, fechaPago);
    setLoading(false);
    if (res.success) {
      alert('Pago reportado exitosamente. Será validado en breve.');
      setShowModal(false);
    } else {
      alert(res.error);
    }
  };

  if (planActual === 'LIFETIME') {
    return (
      <div className="bg-gradient-to-br from-indigo-900 via-neutral-900 to-neutral-900 border border-indigo-500/30 rounded-2xl p-10 flex flex-col items-center justify-center text-center shadow-[0_0_50px_rgba(79,70,229,0.2)]">
        <Crown className="w-20 h-20 text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
        <h2 className="text-4xl font-black text-white mb-4">Plan Master Vitalicio Activo</h2>
        <p className="text-xl text-indigo-200 max-w-2xl">
          Tienes acceso ilimitado y de por vida a todas las funciones actuales y futuras de Niteo.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
        
        {/* BASICO */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 lg:p-8 flex flex-col h-full shadow-lg">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Store className="w-5 h-5 text-neutral-400" /> Básico
            </h3>
            <p className="text-neutral-400 text-sm mt-1">Ideal para comercios de 1 sola sede</p>
          </div>
          <div className="mb-6">
            <span className="text-4xl font-black text-white">$0</span>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-start gap-3 text-sm text-neutral-300">
              <Check className="w-5 h-5 text-neutral-500 shrink-0" /> Límite de 1 Sede
            </li>
            <li className="flex items-start gap-3 text-sm text-neutral-300">
              <Check className="w-5 h-5 text-neutral-500 shrink-0" /> Sincronización POS (Aronium / A2)
            </li>
            <li className="flex items-start gap-3 text-sm text-neutral-300">
              <Check className="w-5 h-5 text-neutral-500 shrink-0" /> Cierres de caja básicos
            </li>
            <li className="flex items-start gap-3 text-sm text-neutral-300">
              <Check className="w-5 h-5 text-neutral-500 shrink-0" /> Control de Créditos
            </li>
          </ul>
          <button disabled className="w-full py-3 px-4 rounded-xl font-bold bg-neutral-800 text-neutral-500 cursor-not-allowed">
            {planActual === 'BASICO' || planActual === 'TRIAL' || planActual === 'INACTIVO' ? 'Plan Actual' : 'No Disponible'}
          </button>
        </div>

        {/* PRO (Destacado) */}
        <div className="bg-neutral-900 border-2 border-indigo-500 rounded-2xl p-6 lg:p-8 flex flex-col h-full relative shadow-[0_0_30px_rgba(79,70,229,0.15)] transform md:-translate-y-4">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white text-xs font-black uppercase tracking-widest px-4 py-1 rounded-full">
            Más Popular
          </div>
          <div className="mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-400" /> Niteo PRO
            </h3>
            <p className="text-neutral-400 text-sm mt-1">El poder completo en la nube</p>
          </div>
          <div className="mb-6">
            <span className="text-4xl font-black text-white">$29.99</span>
            <span className="text-neutral-500 text-sm"> / mes</span>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-start gap-3 text-sm text-white font-medium">
              <Check className="w-5 h-5 text-indigo-400 shrink-0" /> Todo lo del plan Básico, más:
            </li>
            <li className="flex items-start gap-3 text-sm text-neutral-300">
              <Check className="w-5 h-5 text-indigo-400 shrink-0" /> Hasta 3 Sedes sincronizadas
            </li>
            <li className="flex items-start gap-3 text-sm text-neutral-300">
              <Smartphone className="w-5 h-5 text-indigo-400 shrink-0" /> Módulo de Compras Móvil
            </li>
            <li className="flex items-start gap-3 text-sm text-neutral-300">
              <Server className="w-5 h-5 text-indigo-400 shrink-0" /> Motor de Recetas (Escandallos)
            </li>
            <li className="flex items-start gap-3 text-sm text-neutral-300">
              <Building className="w-5 h-5 text-indigo-400 shrink-0" /> Personalización de Logo
            </li>
          </ul>
          
          {planActual === 'PRO' ? (
            <button disabled className="w-full py-3 px-4 rounded-xl font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              PRO Activo
            </button>
          ) : (
            <button onClick={() => setShowModal(true)} className="w-full py-3 px-4 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-lg shadow-indigo-500/25">
              Actualizar a PRO
            </button>
          )}
        </div>

        {/* ENTERPRISE */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 lg:p-8 flex flex-col h-full shadow-lg">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-neutral-400" /> Enterprise
            </h3>
            <p className="text-neutral-400 text-sm mt-1">Para cadenas y franquicias</p>
          </div>
          <div className="mb-6">
            <span className="text-4xl font-black text-white">Custom</span>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-start gap-3 text-sm text-neutral-300">
              <Check className="w-5 h-5 text-neutral-500 shrink-0" /> Sedes Ilimitadas
            </li>
            <li className="flex items-start gap-3 text-sm text-neutral-300">
              <Check className="w-5 h-5 text-neutral-500 shrink-0" /> Auditoría Invisible de Personal
            </li>
            <li className="flex items-start gap-3 text-sm text-neutral-300">
              <Check className="w-5 h-5 text-neutral-500 shrink-0" /> Múltiples Monedas base
            </li>
            <li className="flex items-start gap-3 text-sm text-neutral-300">
              <Check className="w-5 h-5 text-neutral-500 shrink-0" /> Soporte Prioritario 24/7
            </li>
          </ul>
          <a href="mailto:ventas@niteo.app" className="w-full py-3 px-4 rounded-xl font-bold bg-neutral-800 hover:bg-neutral-700 text-white transition-colors text-center block">
            Contactar Ventas
          </a>
        </div>

      </div>

      {/* MODAL DE PAGO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 md:p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-t-3xl md:rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh] pb-safe mt-auto md:mt-0">
            
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950">
              <div>
                <h2 className="text-xl font-bold text-white">Actualizar a PRO</h2>
                <p className="text-sm text-neutral-400">Total a pagar: <span className="text-white font-bold">$29.99</span></p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-white bg-neutral-900 p-3 rounded-full">
                ✕
              </button>
            </div>

            <div className="flex border-b border-neutral-800 bg-neutral-950/50">
              <button 
                onClick={() => setActiveTab('BINANCE')}
                className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'BINANCE' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/5' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
              >
                <QrCode className="w-5 h-5" /> Binance Pay
              </button>
              <button 
                onClick={() => setActiveTab('MANUAL')}
                className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'MANUAL' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
              >
                <CreditCard className="w-5 h-5" /> Pago Manual
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {activeTab === 'BINANCE' ? (
                <div className="text-center space-y-6">
                  <div className="w-48 h-48 mx-auto bg-white rounded-xl p-2 flex items-center justify-center">
                    {/* Placeholder para QR */}
                    <div className="w-full h-full border-4 border-dashed border-neutral-200 rounded-lg flex items-center justify-center">
                      <QrCode className="w-12 h-12 text-neutral-300" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-neutral-400">Escanea el código QR con tu app de Binance para realizar el pago automático.</p>
                  </div>
                  <button onClick={() => alert('Abriendo integración Binance Pay...')} className="w-full h-14 px-4 rounded-xl font-bold bg-yellow-500 text-black hover:bg-yellow-400 transition-colors flex justify-center items-center gap-2">
                    <DollarSign className="w-5 h-5" /> Abrir en App de Binance
                  </button>
                </div>
              ) : (
                <form onSubmit={submitManualPayment} className="space-y-4">
                  <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl mb-6">
                    <p className="text-xs text-indigo-300">
                      Transfiere $29.99 a:<br/>
                      <strong className="text-indigo-200">Zelle:</strong> pagos@niteo.app<br/>
                      <strong className="text-indigo-200">Pago Móvil:</strong> 0414-1234567 / V-12345678 / Banesco (Al cambio del día)
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 mb-1">Método</label>
                      <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 h-14 rounded-lg px-4 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
                        <option value="ZELLE">Zelle (USD)</option>
                        <option value="PAGO_MOVIL">Pago Móvil (Bs)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 mb-1">Fecha</label>
                      <input required type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 h-14 rounded-lg px-4 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none [color-scheme:dark]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-400 mb-1">Banco Origen / Destino</label>
                    <input required type="text" value={bancoDestino} onChange={(e) => setBancoDestino(e.target.value)} placeholder="Ej: BofA, Banesco..." className="w-full bg-neutral-950 border border-neutral-800 h-14 rounded-lg px-4 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-neutral-700" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-400 mb-1">Número de Referencia</label>
                    <input required type="text" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Últimos dígitos" className="w-full bg-neutral-950 border border-neutral-800 h-14 rounded-lg px-4 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-neutral-700" />
                  </div>

                  <button type="submit" disabled={loading || !referencia} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white h-14 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Send className="w-6 h-6"/> Enviar para Revisión</>}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
