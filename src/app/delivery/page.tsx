import React from 'react';
import { Camera, Search, History, CheckCircle, DollarSign, MapPin } from 'lucide-react';

// NOTA: Esta es la UI visual (Client Component provisional) para el módulo de Delivery.
// Falta conectar los Server Actions reales una vez confirmemos la lógica de la base de datos.

export default function DeliveryDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      {/* HEADER */}
      <header className="bg-blue-600 text-white p-6 rounded-b-3xl shadow-md">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">Hola, Repartidor</h1>
            <p className="text-blue-100 text-sm">Empresa El Peluche</p>
          </div>
          <div className="bg-blue-500 p-2 rounded-full">
            <History size={24} />
          </div>
        </div>
        
        {/* RESUMEN DEL DÍA */}
        <div className="bg-white rounded-2xl p-4 text-gray-800 shadow-lg flex items-center justify-between mt-2">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase">Ganancias de Hoy</p>
            <p className="text-3xl font-black text-green-600">$12.50</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 font-semibold uppercase">Entregas</p>
            <p className="text-xl font-bold">8</p>
          </div>
        </div>
      </header>

      <main className="p-4 mt-4 space-y-6">
        
        {/* OPCIÓN A: ESCANER CON CÁMARA */}
        <section>
          <p className="text-sm font-bold text-gray-500 mb-2 uppercase px-2">Opción Rápida</p>
          <button className="w-full bg-green-500 active:bg-green-600 transition text-white rounded-2xl p-6 shadow-md flex flex-col items-center justify-center gap-3">
            <div className="bg-white/20 p-4 rounded-full">
              <Camera size={48} />
            </div>
            <span className="text-xl font-bold">Escanear Comanda</span>
            <span className="text-xs text-green-100">Usa la cámara para leer el ticket</span>
          </button>
        </section>

        <div className="flex items-center gap-4 px-2">
          <div className="h-px bg-gray-300 flex-1"></div>
          <span className="text-gray-400 text-sm font-medium">O ingresa manual</span>
          <div className="h-px bg-gray-300 flex-1"></div>
        </div>

        {/* OPCIÓN B: INGRESO MANUAL */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <label className="text-sm font-bold text-gray-700 mb-2 block">Número de Orden</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input 
                type="text" 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-lg font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej. 001524"
              />
            </div>
            <button className="bg-blue-600 active:bg-blue-700 text-white px-6 rounded-xl font-bold shadow-md transition">
              Reclamar
            </button>
          </div>
        </section>

      </main>
    </div>
  );
}
