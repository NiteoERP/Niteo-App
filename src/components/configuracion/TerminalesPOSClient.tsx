'use client';

import { useState } from 'react';
import { Monitor, Copy, Check, WifiOff } from 'lucide-react';

interface Sede {
  id: string;
  nombre_sede: string;
  estado_activo: boolean;
  codigo_terminal: string | null;
}

export default function TerminalesPOSClient({ sedes }: { sedes: Sede[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <section className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl">
      <div className="flex items-center gap-3 border-b border-neutral-800/50 pb-4 mb-6">
        <Monitor size={20} className="text-indigo-400" />
        <div>
          <h2 className="text-lg font-medium text-white">Terminales POS — Módulo Mesero</h2>
          <p className="text-neutral-500 text-sm mt-0.5">Código único de cada terminal para vincular la app del mesero.</p>
        </div>
      </div>

      {sedes.length === 0 ? (
        <div className="text-center py-8 px-4 border border-dashed border-neutral-800 rounded-xl">
          <p className="text-neutral-400 text-sm">No se encontraron sedes activas registradas.</p>
          <p className="text-neutral-600 text-xs mt-1">Crea una sede en la sección Sedes & Sucursales para poder asociar terminales POS.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sedes.map(sede => (
          <div
            key={sede.id}
            className="flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 gap-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                sede.codigo_terminal ? 'bg-green-400' : 'bg-neutral-600'
              }`} />
              <div className="min-w-0">
                <p className="text-white font-medium text-sm truncate">{sede.nombre_sede}</p>
                <p className="text-neutral-600 text-xs">
                  {sede.codigo_terminal ? 'Terminal activo' : 'Sin código — el POS lo genera al conectarse'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {sede.codigo_terminal ? (
                <>
                  <span className="font-mono text-indigo-300 font-bold text-sm tracking-widest bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg">
                    {sede.codigo_terminal}
                  </span>
                  <button
                    onClick={() => handleCopy(sede.codigo_terminal!, sede.id)}
                    className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-all"
                    title="Copiar código"
                  >
                    {copiedId === sede.id
                      ? <Check size={15} className="text-green-400" />
                      : <Copy size={15} />}
                  </button>
                </>
              ) : (
                <span className="text-neutral-600 text-xs flex items-center gap-1">
                  <WifiOff size={13} /> Sin POS conectado
                </span>
              )}
            </div>
          </div>
        ))}
        </div>
      )}

      <p className="text-neutral-500 text-xs mt-4">
        El código aparece cuando el Niteo POS se conecta a la nube por primera vez. Para verlo en el POS: Ajustes → Enlace Cloud.
      </p>
    </section>
  );
}
