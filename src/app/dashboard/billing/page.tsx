import React from 'react';

export default function BillingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center space-y-6">
      <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </div>
      <h1 className="text-3xl font-bold text-white tracking-tight">Suscripción Inactiva</h1>
      <p className="text-neutral-400 max-w-md">
        No pudimos validar una suscripción activa para tu empresa. Por favor, contacta con soporte o actualiza tu plan para continuar utilizando Niteo ERP.
      </p>
      {/* Botón temporal de regresar al home o soporte */}
      <a href="mailto:soporte@niteo.app" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors">
        Contactar Soporte
      </a>
    </div>
  );
}
