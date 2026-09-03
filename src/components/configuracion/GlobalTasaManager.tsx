'use client';

import React, { useState, useEffect } from 'react';
import { Save, DollarSign, Euro, Loader2, CheckCircle2 } from 'lucide-react';
import { updateTasaBcvAction, getTasaBcvAction, getEmpresaMonedaAction, updateEmpresaMonedaAction } from '@/actions/config-actions';

export default function GlobalTasaManager() {
  const [tasaActual, setTasaActual] = useState<number>(36.5);
  const [tasaInput, setTasaInput] = useState<string>('36.5');
  const [fechaActualizacion, setFechaActualizacion] = useState<string>('');
  
  const [monedaActual, setMonedaActual] = useState<'USD'|'EUR'>('USD');
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMoneda, setSuccessMoneda] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const data = await getTasaBcvAction();
    if (data.tasa) {
      setTasaActual(data.tasa);
      setTasaInput(data.tasa.toString());
    }
    if (data.fecha) setFechaActualizacion(data.fecha);

    const monRes = await getEmpresaMonedaAction();
    if (monRes.success) {
      setMonedaActual(monRes.moneda as 'USD' | 'EUR');
    }
  };

  const handleUpdate = async () => {
    const newRate = parseFloat(tasaInput);
    if (isNaN(newRate) || newRate <= 0) return;

    setIsUpdating(true);
    setSuccess(false);
    
    try {
      const res = await updateTasaBcvAction(newRate, monedaActual === 'EUR');
      if (res.success) {
        setTasaActual(newRate);
        setFechaActualizacion(new Date().toLocaleString());
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (e) {
      console.error('Error guardando tasa', e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateMoneda = async (moneda: 'USD' | 'EUR') => {
    setMonedaActual(moneda);
    setIsUpdating(true);
    try {
      await updateEmpresaMonedaAction(moneda);
      await cargarDatos(); // Recargar la tasa correspondiente
      setSuccessMoneda(true);
      setTimeout(() => setSuccessMoneda(false), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl mt-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
          {monedaActual === 'EUR' ? <Euro size={24} /> : <DollarSign size={24} />}
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Moneda y Tasa Central</h2>
          <p className="text-sm text-neutral-400">
            Define si el sistema operará en USD o EUR y ajusta su tasa manualmente si no usas la automatizada.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Selector de Moneda */}
        <div className="flex-1 bg-neutral-950/50 p-5 rounded-xl border border-neutral-800 relative">
          <label className="block text-sm font-medium text-neutral-400 mb-2">Moneda Referencial</label>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleUpdateMoneda('USD')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold border transition-colors ${monedaActual === 'USD' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:bg-neutral-800'}`}
            >
              Dólar (USD)
            </button>
            <button 
              onClick={() => handleUpdateMoneda('EUR')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold border transition-colors ${monedaActual === 'EUR' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:bg-neutral-800'}`}
            >
              Euro (EUR)
            </button>
          </div>
          {successMoneda && <span className="absolute top-5 right-5 text-emerald-400 flex items-center gap-1 text-xs"><CheckCircle2 size={14}/> Guardado</span>}
        </div>

        {/* Tasa Manual */}
        <div className="flex-1 bg-neutral-950/50 p-5 rounded-xl border border-neutral-800 relative">
          <label className="block text-sm font-medium text-neutral-400 mb-2">
            Tasa {monedaActual === 'EUR' ? 'Euro' : 'BCV'} Manual
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="0.01"
              value={tasaInput}
              onChange={(e) => setTasaInput(e.target.value)}
              className="flex-1 bg-neutral-900 border border-neutral-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Guardar
            </button>
          </div>
          
          <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
            <p>Tasa Central: <span className="text-emerald-400 font-bold ml-1">{tasaActual} Bs.</span></p>
            {fechaActualizacion && <p>Actualizado: {fechaActualizacion}</p>}
          </div>

          {success && (
            <div className="absolute top-5 right-5 text-emerald-400 flex items-center gap-1 text-xs font-medium">
              <CheckCircle2 size={14} /> Guardado
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
