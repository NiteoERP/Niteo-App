"use client";
import { useState } from 'react';
import { Download, Zap, ShieldCheck } from 'lucide-react';

export default function MigracionClient({ sedes }: { sedes: any[] }) {
  return (
    <div className="space-y-6 max-w-5xl mx-auto mt-8">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-8 shadow-sm border border-neutral-200 dark:border-neutral-800 text-center">
        <div className="mx-auto w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
          <Zap className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Niteo Importer (Nativo)</h2>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto mb-8">
          Hemos evolucionado nuestro motor de migración. Para garantizar la máxima velocidad y seguridad al procesar miles de facturas y productos, la migración ahora se realiza mediante nuestra herramienta nativa de escritorio.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
           <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center">
              <ShieldCheck className="w-6 h-6 text-green-500 mb-2" />
              <h3 className="font-semibold dark:text-white">Conexión Segura</h3>
              <p className="text-xs text-neutral-500 text-center">Tus credenciales no se guardan. Usa tokens temporales encriptados.</p>
           </div>
           <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center">
              <Zap className="w-6 h-6 text-amber-500 mb-2" />
              <h3 className="font-semibold dark:text-white">Hyper-Velocidad</h3>
              <p className="text-xs text-neutral-500 text-center">Sube 30,000 facturas en segundos gracias al multiprocesamiento nativo.</p>
           </div>
        </div>

        <button 
          onClick={() => alert("La descarga de Niteo Importer .exe comenzará pronto.")}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all"
        >
          <Download className="w-5 h-5" />
          Descargar Niteo Importer (.exe)
        </button>
      </div>
    </div>
  );
}
