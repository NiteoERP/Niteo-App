'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Store, Key, Copy, CheckCircle2, ArrowRight, Loader2, LogOut } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { setupWorkspace } from './actions';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    nombreEmpresa: '',
    nombreSede: '',
    sistemaPos: 'Aronium',
  });
  
  const [masterKey, setMasterKey] = useState('');

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleNext = () => {
    if (step === 1 && !formData.nombreEmpresa.trim()) {
      setError('Por favor, ingresa el nombre de tu empresa');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleFinish = async () => {
    // 1. Protección contra doble clic preventivo en UI
    if (loading) return; 

    setLoading(true);
    setError('');
    
    try {
      const res = await setupWorkspace(formData);
      
      if (!res.success) {
        setError(res.error || 'Ocurrió un retraso guardando tus datos. Por favor, intenta de nuevo.');
        setLoading(false);
        return;
      }
      
      // Si todo fue bien, pero no hay llave (sede opcional omitida), vamos al Dashboard
      if (!res.masterKey) {
        window.location.href = '/dashboard';
        return;
      }
      
      setMasterKey(res.masterKey);
      setStep(3);
    } catch (err: any) {
      setError('Hubo un problema de conexión con el servidor. Por favor intenta de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(masterKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 selection:bg-indigo-500/30">
      
      {/* Botón de Salir */}
      <button 
        onClick={handleLogout}
        className="absolute top-6 right-6 text-neutral-500 hover:text-white transition-colors flex items-center gap-2 text-sm bg-neutral-900/50 px-4 py-2 rounded-lg border border-neutral-800 z-20"
      >
        <LogOut size={16} />
        <span>Cerrar Sesión</span>
      </button>

      {/* Background Decorativo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Logo */}
      <div className="mb-8 z-10 text-center">
        <img src="/logo.png" alt="Niteo Logo" className="w-16 h-16 object-contain mx-auto mb-4 drop-shadow-[0_0_15px_rgba(99,102,241,0.6)]" />
        <h1 className="text-3xl font-bold text-white tracking-tight">Bienvenido a Niteo</h1>
        <p className="text-neutral-400 mt-2">Vamos a configurar tu espacio de trabajo</p>
      </div>

      {/* Card del Wizard */}
      <div className="w-full max-w-md bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-3xl p-8 z-10 shadow-2xl">
        
        {/* Indicador de Pasos (Oculto en Paso 3) */}
        {step < 3 && (
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1 ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-neutral-800 text-neutral-500'}`}>1</div>
              <div className={`w-12 h-1 rounded-full ${step >= 2 ? 'bg-indigo-500/50' : 'bg-neutral-800'}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2 ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-neutral-800 text-neutral-500'}`}>2</div>
            </div>
            <span className="text-sm font-medium text-neutral-400">Paso {step} de 2</span>
          </div>
        )}

        {/* Mensaje de Error Global */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* PASO 1: Empresa */}
        {step === 1 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="mb-6">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400">
                <Building2 size={24} />
              </div>
              <h2 className="text-xl font-semibold text-white">Tu Empresa</h2>
              <p className="text-sm text-neutral-400 mt-1">¿Cómo se llama tu negocio u organización?</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Nombre Comercial</label>
                <input 
                  type="text" 
                  value={formData.nombreEmpresa}
                  onChange={(e) => setFormData({...formData, nombreEmpresa: e.target.value})}
                  placeholder="Ej: Inversiones Los Andes C.A."
                  className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-neutral-600"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                />
              </div>

              <button 
                onClick={handleNext}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2"
              >
                Continuar <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* PASO 2: Sede (Opcional) */}
        {step === 2 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="mb-6">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400">
                <Store size={24} />
              </div>
              <h2 className="text-xl font-semibold text-white">Configuración del Punto de Venta (Opcional)</h2>
              <p className="text-neutral-400 text-sm mt-1">
                Si usas un sistema POS (como Aronium), crea tu primera sede. Si solo usarás Niteo para compras y finanzas, puedes omitir este paso.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">Nombre de la Sede</label>
                <input
                  type="text"
                  placeholder="Ej. Local Principal"
                  value={formData.nombreSede}
                  onChange={(e) => setFormData({ ...formData, nombreSede: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">Software POS Actual</label>
                <select
                  value={formData.sistemaPos}
                  onChange={(e) => setFormData({ ...formData, sistemaPos: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none"
                >
                  <option value="Aronium">Aronium</option>
                  <option value="A2Softway">A2 Softway</option>
                  <option value="Ninguno">Ninguno</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="w-full py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-xl transition-all"
                >
                  Atrás
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : (formData.nombreSede ? 'Finalizar' : 'Omitir y Finalizar')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PASO 3: Éxito y Master Key */}
        {step === 3 && (
          <div className="animate-in zoom-in-95 fade-in duration-500 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <CheckCircle2 size={32} />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">¡Todo listo!</h2>
            <p className="text-neutral-400 text-sm mb-8">
              Tu empresa ha sido creada. Ahora necesitas conectar el Sincronizador de Escritorio en tu PC usando esta llave maestra de seguridad:
            </p>

            <div className="bg-black/50 border border-neutral-800 rounded-2xl p-4 mb-8 relative group">
              <div className="flex items-center justify-center gap-3 mb-2 text-indigo-400">
                <Key size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">Master Key</span>
              </div>
              <p className="text-xl font-mono text-white break-all tracking-wider font-medium">{masterKey}</p>
              
              <button 
                onClick={copyToClipboard}
                className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl gap-2 text-white font-medium"
              >
                <Copy size={18} /> {copied ? '¡Copiado!' : 'Copiar llave'}
              </button>
            </div>

            <button
            onClick={() => window.location.href = '/dashboard'}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
          >
            Ir al Dashboard <ArrowRight size={18} />
          </button>
          </div>
        )}

      </div>
    </div>
  );
}
