'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Euro, 
  Loader2, 
  CheckCircle2, 
  RefreshCw, 
  Sliders, 
  Sparkles, 
  AlertCircle,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { 
  getEmpresaConfigTasaAction, 
  updateEmpresaConfigTasaAction, 
  syncBcvDirectAction,
  updateEmpresaMonedaAction
} from '@/actions/config-actions';

export default function GlobalTasaManager() {
  const [loading, setLoading] = useState(true);
  const [tipoTasa, setTipoTasa] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [monedaActual, setMonedaActual] = useState<'USD' | 'EUR'>('USD');
  const [tasaManualInput, setTasaManualInput] = useState<string>('');
  
  // Datos del BCV
  const [bcvUsd, setBcvUsd] = useState<number>(814.69);
  const [bcvEur, setBcvEur] = useState<number>(947.30);
  const [fechaTasa, setFechaTasa] = useState<string>('');
  const [isNextDay, setIsNextDay] = useState<boolean>(false);
  const [tasaActiva, setTasaActiva] = useState<number>(814.69);

  // Estados de acciones
  const [isSyncingBcv, setIsSyncingBcv] = useState(false);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [isChangingMode, setIsChangingMode] = useState(false);
  const [isChangingMoneda, setIsChangingMoneda] = useState(false);
  
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const cargarConfiguracion = async () => {
    try {
      setLoading(true);
      const res = await getEmpresaConfigTasaAction();
      if (res.success && res.tipoTasa) {
        setTipoTasa((res.tipoTasa as 'AUTO' | 'MANUAL') || 'AUTO');
        setMonedaActual(res.monedaReferencia || 'USD');
        setTasaManualInput(res.tasaManual && res.tasaManual > 0 ? String(res.tasaManual) : '');
        setBcvUsd(res.bcvUsd || 814.69);
        setBcvEur(res.bcvEur || 947.30);
        setFechaTasa(res.fechaTasa || '');
        setIsNextDay(Boolean(res.isNextDay));
        setTasaActiva(res.tasaActiva || res.bcvUsd || 814.69);
      }
    } catch (err) {
      console.error('Error cargando configuración de tasa:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cambiar entre Modo Automático y Modo Manual
  const handleCambiarModo = async (nuevoModo: 'AUTO' | 'MANUAL') => {
    if (nuevoModo === tipoTasa) return;
    setIsChangingMode(true);
    setFeedback(null);

    try {
      let tasaManualNum = parseFloat(tasaManualInput);
      if (nuevoModo === 'MANUAL' && (isNaN(tasaManualNum) || tasaManualNum <= 0)) {
        // Asignar por defecto la tasa actual del BCV como punto de partida
        tasaManualNum = monedaActual === 'EUR' ? bcvEur : bcvUsd;
        setTasaManualInput(String(tasaManualNum));
      }

      const res = await updateEmpresaConfigTasaAction({
        tipo_tasa: nuevoModo,
        tasa_manual: nuevoModo === 'MANUAL' ? tasaManualNum : undefined
      });

      if (res.success) {
        setTipoTasa(nuevoModo);
        setTasaActiva(nuevoModo === 'MANUAL' ? tasaManualNum : (monedaActual === 'EUR' ? bcvEur : bcvUsd));
        showFeedback(
          'success', 
          nuevoModo === 'AUTO' 
            ? '¡Modo Automático activado! Tu empresa usará la tasa oficial del BCV.' 
            : '¡Modo Manual activado! La tasa automática ha quedado deshabilitada.'
        );
      } else {
        showFeedback('error', res.error || 'Error al cambiar modo de tasa');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Error al cambiar modo');
    } finally {
      setIsChangingMode(false);
    }
  };

  // Guardar la tasa manual personalizada
  const handleGuardarTasaManual = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = parseFloat(tasaManualInput);
    if (isNaN(parsed) || parsed <= 0) {
      showFeedback('error', 'Por favor ingresa un monto válido mayor a 0 para la tasa manual.');
      return;
    }

    setIsSavingManual(true);
    setFeedback(null);

    try {
      const res = await updateEmpresaConfigTasaAction({
        tipo_tasa: 'MANUAL',
        tasa_manual: parsed
      });

      if (res.success) {
        setTipoTasa('MANUAL');
        setTasaActiva(parsed);
        showFeedback('success', `¡Tasa manual guardada! Las operaciones usarán ahora ${parsed.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} Bs.`);
      } else {
        showFeedback('error', res.error || 'Error al guardar la tasa manual.');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Error de conexión.');
    } finally {
      setIsSavingManual(false);
    }
  };

  // Sincronizar directamente con el portal del BCV
  const handleSincronizarBcv = async () => {
    setIsSyncingBcv(true);
    setFeedback(null);

    try {
      const res = await syncBcvDirectAction();
      if (res.success && res.usdRate) {
        const uRate = res.usdRate;
        const eRate = res.eurRate || res.usdRate;
        const targetFec = res.fecha || '';
        setBcvUsd(uRate);
        setBcvEur(eRate);
        setFechaTasa(targetFec);
        setIsNextDay(Boolean(res.isNextDay));

        if (tipoTasa === 'AUTO') {
          setTasaActiva(monedaActual === 'EUR' ? eRate : uRate);
        }

        const detalle = res.isNextDay 
          ? `(Detectada Fecha Valor del día siguiente: ${targetFec})`
          : `(Fecha: ${targetFec})`;

        showFeedback('success', `¡Tasa BCV sincronizada exitosamente! USD: ${uRate} Bs., EUR: ${eRate} Bs. ${detalle}`);
      } else {
        showFeedback('error', res.error || 'No se pudo sincronizar la tasa del BCV.');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Error al sincronizar con el BCV.');
    } finally {
      setIsSyncingBcv(false);
    }
  };

  // Cambiar Moneda Base Referencial
  const handleCambiarMoneda = async (moneda: 'USD' | 'EUR') => {
    if (moneda === monedaActual) return;
    setIsChangingMoneda(true);
    try {
      await updateEmpresaMonedaAction(moneda);
      setMonedaActual(moneda);
      if (tipoTasa === 'AUTO') {
        setTasaActiva(moneda === 'EUR' ? bcvEur : bcvUsd);
      }
      showFeedback('success', `Moneda de referencia actualizada a ${moneda}.`);
    } catch (err: any) {
      showFeedback('error', 'Error al cambiar la moneda.');
    } finally {
      setIsChangingMoneda(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-indigo-500 mr-2" size={20} />
        <span className="text-neutral-400 text-sm">Cargando configuración de tasa...</span>
      </div>
    );
  }

  const tasaBcvMostrar = monedaActual === 'EUR' ? bcvEur : bcvUsd;

  return (
    <section className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            {monedaActual === 'EUR' ? <Euro size={24} /> : <DollarSign size={24} />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Tasa de Cambio y Moneda Central
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                tipoTasa === 'AUTO' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {tipoTasa === 'AUTO' ? 'Modo Automático (BCV)' : 'Modo Manual'}
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Administra la tasa con la que opera tu empresa para pagos, proveedores, compras y reportes.
            </p>
          </div>
        </div>

        {/* Selector rápido de moneda */}
        <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-xl border border-neutral-800 self-start sm:self-center">
          <button
            type="button"
            onClick={() => handleCambiarMoneda('USD')}
            disabled={isChangingMoneda}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              monedaActual === 'USD'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Dólar (USD)
          </button>
          <button
            type="button"
            onClick={() => handleCambiarMoneda('EUR')}
            disabled={isChangingMoneda}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              monedaActual === 'EUR'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Euro (EUR)
          </button>
        </div>
      </div>

      {/* Selector de Modo: 2 Opciones */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
          Selecciona cómo calcular la tasa:
        </label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Opción 1: Automática (BCV) */}
          <div 
            onClick={() => !isChangingMode && handleCambiarModo('AUTO')}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
              tipoTasa === 'AUTO'
                ? 'border-emerald-500 bg-emerald-500/5 shadow-lg shadow-emerald-500/5'
                : 'border-neutral-800 bg-neutral-950/40 hover:border-neutral-700 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${tipoTasa === 'AUTO' ? 'bg-emerald-500 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-400'}`}>
                  <RefreshCw size={18} className={tipoTasa === 'AUTO' ? '' : ''} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Automática (Tasa Oficial BCV)</h3>
                  <span className="text-[11px] text-emerald-400 font-semibold">Tasa del Banco Central de Venezuela</span>
                </div>
              </div>
              <input 
                type="radio" 
                name="tipo_tasa" 
                checked={tipoTasa === 'AUTO'} 
                onChange={() => handleCambiarModo('AUTO')}
                className="mt-1 accent-emerald-500 w-4 h-4 cursor-pointer"
              />
            </div>

            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              El sistema actualiza la tasa automáticamente. <strong className="text-neutral-300">Entre las 4:00 PM y 7:00 PM</strong>, cuando el BCV publica el cierre del día siguiente (Fecha Valor), el sistema la adopta de inmediato.
            </p>

            {tipoTasa === 'AUTO' && (
              <div className="mt-4 pt-3 border-t border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                <ShieldCheck size={14} /> Sincronización automática activa
              </div>
            )}
          </div>

          {/* Opción 2: Manual (Personalizada) */}
          <div 
            onClick={() => !isChangingMode && handleCambiarModo('MANUAL')}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
              tipoTasa === 'MANUAL'
                ? 'border-amber-500 bg-amber-500/5 shadow-lg shadow-amber-500/5'
                : 'border-neutral-800 bg-neutral-950/40 hover:border-neutral-700 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${tipoTasa === 'MANUAL' ? 'bg-amber-500 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-400'}`}>
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Manual (Personalizada)</h3>
                  <span className="text-[11px] text-amber-400 font-semibold">Tú defines el valor fijo</span>
                </div>
              </div>
              <input 
                type="radio" 
                name="tipo_tasa" 
                checked={tipoTasa === 'MANUAL'} 
                onChange={() => handleCambiarModo('MANUAL')}
                className="mt-1 accent-amber-500 w-4 h-4 cursor-pointer"
              />
            </div>

            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              Deshabilita la actualización automática. Puedes escribir la tasa que tú quieras y ninguna sincronización del BCV alterará los precios o deudas de tu empresa.
            </p>

            {tipoTasa === 'MANUAL' && (
              <div className="mt-4 pt-3 border-t border-amber-500/20 flex items-center gap-2 text-xs text-amber-400 font-semibold">
                <Sliders size={14} /> Modo manual activo (BCV automático desactivado)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contenido según el Modo Activo */}
      {tipoTasa === 'AUTO' ? (
        /* --- PANEL MODO AUTOMÁTICO --- */
        <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-neutral-500 font-medium uppercase tracking-wider block mb-1">
                Tasa Oficial Actual ({monedaActual})
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white font-mono">
                  {tasaBcvMostrar.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-sm font-bold text-neutral-400">Bs. / {monedaActual}</span>
              </div>
            </div>

            {/* Badges de Fecha / Día siguiente */}
            <div className="flex flex-col sm:items-end gap-1.5">
              {isNextDay ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  <Sparkles size={13} className="text-indigo-400" />
                  Fecha Valor de Mañana: {fechaTasa}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                  <Clock size={13} />
                  Fecha Oficial: {fechaTasa || 'Hoy'}
                </span>
              )}
              <span className="text-[11px] text-neutral-500">
                USD: {bcvUsd} Bs. | EUR: {bcvEur} Bs.
              </span>
            </div>
          </div>

          {/* Banner explicativo de la tasa de la tarde */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-3.5 text-xs text-neutral-400 flex items-start gap-2.5">
            <Sparkles size={16} className="text-indigo-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-neutral-200">Lectura del día siguiente:</strong> El BCV publica la tasa oficial de la siguiente jornada bancaria entre las 4:00 PM y 7:00 PM. El sistema lee esa tasa con su respectiva Fecha Valor y la activa inmediatamente para tus operaciones.
            </p>
          </div>

          {/* Botón de Sincronización Manual con BCV */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSincronizarBcv}
              disabled={isSyncingBcv}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-neutral-700 hover:border-neutral-600 shadow-sm disabled:opacity-50"
            >
              {isSyncingBcv ? (
                <>
                  <Loader2 size={14} className="animate-spin text-indigo-400" />
                  Consultando portal del BCV...
                </>
              ) : (
                <>
                  <RefreshCw size={14} className="text-indigo-400" />
                  Sincronizar con BCV ahora
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* --- PANEL MODO MANUAL --- */
        <form onSubmit={handleGuardarTasaManual} className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-white">Definir Tasa Manual</h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Ingresa el valor numérico en Bolívares (Bs.) correspondiente a 1 {monedaActual}.
              </p>
            </div>
            {tasaActiva > 0 && (
              <div className="text-right">
                <span className="text-[11px] text-neutral-500 uppercase tracking-wider block">Tasa Manual Activa</span>
                <span className="text-xl font-bold text-amber-400 font-mono">
                  {tasaActiva.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} Bs.
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-bold text-sm">
                Bs.
              </span>
              <input
                type="number"
                step="0.0001"
                min="0.01"
                placeholder="Ej: 850.00"
                value={tasaManualInput}
                onChange={(e) => setTasaManualInput(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-xl pl-12 pr-4 py-2.5 text-base font-bold font-mono focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingManual}
              className="w-full sm:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 disabled:opacity-50 whitespace-nowrap"
            >
              {isSavingManual ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Sliders size={14} />
                  Guardar Tasa Manual
                </>
              )}
            </button>
          </div>

          {/* Comparativa con BCV */}
          <div className="pt-2 text-xs text-neutral-500 flex items-center justify-between border-t border-neutral-800/80">
            <span>Referencia Oficial BCV actual: <strong className="text-neutral-400">{tasaBcvMostrar.toFixed(2)} Bs.</strong></span>
            <button
              type="button"
              onClick={() => setTasaManualInput(String(tasaBcvMostrar))}
              className="text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Copiar tasa BCV al campo manual
            </button>
          </div>
        </form>
      )}

      {/* Feedback Toast / Alert */}
      {feedback && (
        <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-medium animate-in fade-in duration-200 ${
          feedback.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}
    </section>
  );
}
