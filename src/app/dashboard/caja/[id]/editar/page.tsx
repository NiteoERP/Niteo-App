import React from 'react';
import Link from 'next/link';

export default function EditarCierrePage() {
  return (
    <div className="p-10 flex flex-col items-center justify-center text-center max-w-lg mx-auto h-[80vh]">
      <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center text-neutral-500 mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">Edición de Cierre (Próximamente)</h1>
      <p className="text-neutral-400 mb-8">Por razones de auditoría, los cierres de caja son inmutables. Pronto habilitaremos la opción de anular un cierre para que puedas volver a registrarlo.</p>
      <Link href="/dashboard/caja" className="bg-neutral-800 hover:bg-neutral-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors">
        Volver al Historial
      </Link>
    </div>
  );
}
