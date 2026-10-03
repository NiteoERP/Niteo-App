'use client';

import React, { useState, useRef } from 'react';
import { Camera, Search, History, CheckCircle, AlertTriangle } from 'lucide-react';
import { procesarFotoDelivery, reclamarDeliveryManual } from '@/actions/deliveryActions';

export default function DeliveryDashboard() {
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'error' | 'success' | '' }>({ texto: '', tipo: '' });
  const [numeroManual, setNumeroManual] = useState('');
  const [gananciasHoy, setGananciasHoy] = useState(0); // Esto idealmente se carga desde BD al iniciar
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Función mágica para comprimir la foto en el celular antes de gastar datos
  const comprimirImagen = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; // Resolución ideal para que la IA lea rápido y pese poco
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Exportamos a JPEG con calidad baja/media (0.6) para reducir a ~50kb
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCapturaFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMensaje({ texto: 'Analizando comanda...', tipo: '' });

    try {
      const base64Comprimido = await comprimirImagen(file);
      const resultado = await procesarFotoDelivery(base64Comprimido);
      
      if (resultado.success) {
        setMensaje({ texto: resultado.message, tipo: 'success' });
        if (resultado.pagoSumado) setGananciasHoy(prev => prev + resultado.pagoSumado);
      } else {
        setMensaje({ texto: resultado.message, tipo: 'error' });
      }
    } catch (error) {
      setMensaje({ texto: 'Error de conexión. Intente manual.', tipo: 'error' });
    } finally {
      setLoading(false);
      // Limpiamos el input para poder volver a tomar la misma foto si se necesita
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReclamoManual = async () => {
    if (!numeroManual.trim()) return;
    
    setLoading(true);
    setMensaje({ texto: 'Verificando orden...', tipo: '' });

    const resultado = await reclamarDeliveryManual(numeroManual.trim());
    
    if (resultado.success) {
      setMensaje({ texto: resultado.message, tipo: 'success' });
      if (resultado.pagoSumado) setGananciasHoy(prev => prev + resultado.pagoSumado);
      setNumeroManual(''); // Limpiamos el input
    } else {
      setMensaje({ texto: resultado.message, tipo: 'error' });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      <header className="bg-blue-600 text-white p-6 rounded-b-3xl shadow-md">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">Mis Entregas</h1>
          </div>
          <button className="bg-blue-500 p-2 rounded-full active:scale-95 transition">
            <History size={24} />
          </button>
        </div>
        
        <div className="bg-white rounded-2xl p-4 text-gray-800 shadow-lg flex items-center justify-between mt-2">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase">Ganado Hoy</p>
            <p className="text-3xl font-black text-green-600">${gananciasHoy.toFixed(2)}</p>
          </div>
        </div>
      </header>

      <main className="p-4 mt-4 space-y-6">
        
        {/* ALERTAS Y MENSAJES */}
        {mensaje.texto && !loading && (
          <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in ${mensaje.tipo === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
            {mensaje.tipo === 'success' ? <CheckCircle /> : <AlertTriangle />}
            <p className="font-bold">{mensaje.texto}</p>
          </div>
        )}

        {loading && (
          <div className="p-4 bg-blue-50 text-blue-800 rounded-xl flex justify-center items-center font-bold animate-pulse">
            Procesando... por favor espera.
          </div>
        )}

        {/* CÁMARA OCULTA */}
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          ref={fileInputRef}
          onChange={handleCapturaFoto}
          className="hidden" 
        />

        {/* BOTÓN GIGANTE */}
        <section>
          <p className="text-sm font-bold text-gray-500 mb-2 uppercase px-2">Opción Rápida</p>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className={`w-full text-white rounded-2xl p-6 shadow-md flex flex-col items-center justify-center gap-3 transition ${loading ? 'bg-gray-400' : 'bg-green-500 active:bg-green-600'}`}
          >
            <div className="bg-white/20 p-4 rounded-full">
              <Camera size={48} />
            </div>
            <span className="text-2xl font-black">Escanear Comanda</span>
          </button>
        </section>

        <div className="flex items-center gap-4 px-2">
          <div className="h-px bg-gray-300 flex-1"></div>
          <span className="text-gray-400 text-sm font-medium">O manual</span>
          <div className="h-px bg-gray-300 flex-1"></div>
        </div>

        {/* INGRESO MANUAL */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <label className="text-sm font-bold text-gray-700 mb-2 block">Número de Orden</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input 
                type="text" 
                value={numeroManual}
                onChange={(e) => setNumeroManual(e.target.value)}
                disabled={loading}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-lg font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej. 1234"
              />
            </div>
            <button 
              onClick={handleReclamoManual}
              disabled={loading || !numeroManual}
              className="bg-blue-600 active:bg-blue-700 disabled:bg-gray-400 text-white px-6 rounded-xl font-bold shadow-md transition"
            >
              Reclamar
            </button>
          </div>
        </section>

      </main>
    </div>
  );
}
