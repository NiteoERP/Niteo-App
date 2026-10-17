'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie, Check } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'niteo_cookie_consent_v1';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const accepted = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!accepted) {
        setVisible(true);
      }
    } catch {
      // Si el navegador bloquea localStorage, no bloquear la interfaz
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    } catch {
      // Ignorar errores de cuota o modo incógnito estricto
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Aviso sobre cookies y privacidad"
      className="fixed bottom-0 inset-x-0 z-[100] p-3 sm:p-4 pointer-events-none"
    >
      <div className="max-w-4xl mx-auto bg-neutral-900 border border-neutral-700 rounded-2xl p-4 sm:p-5 shadow-2xl pointer-events-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
            <Cookie size={18} aria-hidden="true" />
          </div>
          <div className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
            <p className="font-bold text-white mb-0.5">Aviso de Cookies Esenciales y Privacidad</p>
            <p>
              En <strong className="text-white">Niteo</strong> utilizamos únicamente cookies técnicas esenciales y almacenamiento local para mantener tu sesión segura y resguardar tus borradores operativos, sin rastreadores publicitarios de terceros. Consulta nuestra{' '}
              <Link href="/cookies" className="text-indigo-400 hover:underline font-medium">
                Política de Cookies
              </Link>{' '}
              y{' '}
              <Link href="/privacidad" className="text-indigo-400 hover:underline font-medium">
                Política de Privacidad
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={handleAccept}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            <Check size={16} aria-hidden="true" />
            Entendido y Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
