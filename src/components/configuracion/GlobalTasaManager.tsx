'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, DollarSign, Loader2, CheckCircle2 } from 'lucide-react';
import { updateTasaBcvAction, getTasaBcvAction } from '@/actions/config-actions';

export default function GlobalTasaManager() {
  const [tasaActual, setTasaActual] = useState<number>(36.5);
  const [fechaActualizacion, setFechaActualizacion] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    cargarTasa();
  }, []);

  const cargarTasa = async () => {
    const data = await getTasaBcvAction();
    if (data.tasa) setTasaActual(data.tasa);
    if (data.fecha) setFechaActualizacion(data.fecha);
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    setSuccess(false);
    
    // Fetch from external API
    try {
      const response = await fetch('https://pydolarvenezuela-api.vercel.app/api/v1/dollar/page?page=bcv', { cache: 'no-store' });
      const apiData = await response.json();
      const newRate = apiData.monitors?.bcv?.price;

      if (newRate) {
        // Save centrally
        const res = await updateTasaBcvAction(newRate);
        if (res.success) {
          setTasaActual(newRate);
          setFechaActualizacion(new Date().toLocaleString());
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        }
      }
    } catch (e) {
      console.error('Error fetching BCV', e);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl mt-8">
      <div className="flex items-center gap-3 border-b border-neutral-800/50 pb-4 mb-6">
        <DollarSign className="text-emerald-400" />
        <h2 className="text-lg font-medium text-white">Tasa BCV Central</h2>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl p-5 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 w-full h-1 bg-emerald-500"></div>
          <p className="text-neutral-400 text-sm mb-1">Tasa Oficial Actual</p>
          <h3 className="text-4xl font-black text-emerald-400">{tasaActual.toFixed(2)} Bs</h3>
          <p className="text-neutral-500 text-xs mt-2">Última act: {fechaActualizacion || 'Desconocida'}</p>
        </div>

        <div className="flex-1 w-full space-y-4">
          <p className="text-neutral-300 text-sm">
            Esta es la tasa central que usarán todos los módulos de la empresa (Ventas, Compras, Reportes). 
            Se conecta directamente a <strong>DolarApi Venezuela</strong>.
          </p>
          
          <button 
            onClick={handleUpdate}
            disabled={isUpdating}
            className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 border border-neutral-700 disabled:opacity-50"
          >
            {isUpdating ? (
              <><Loader2 size={18} className="animate-spin text-emerald-400" /> Sincronizando con DolarApi...</>
            ) : success ? (
              <><CheckCircle2 size={18} className="text-emerald-400" /> ¡Tasa Actualizada!</>
            ) : (
              <><RefreshCw size={18} className="text-emerald-400" /> Sincronizar Ahora</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
