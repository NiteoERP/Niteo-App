'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, XCircle, ShieldCheck, Sparkles, X } from 'lucide-react';
import { EstadoLicencia } from '@/actions/licencia-actions';

interface LicenseBannerProps {
  licencia: EstadoLicencia;
}

export default function LicenseBanner({ licencia }: LicenseBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const storageKey = `niteo_banner_dismiss_${licencia.estado}_${licencia.fechaVencimiento ? licencia.fechaVencimiento.slice(0, 10) : 'default'}`;

  useEffect(() => {
    try {
      if (sessionStorage.getItem(storageKey) === '1') {
        setDismissed(true);
      }
    } catch {
      // Ignorar si sessionStorage no está disponible
    }
  }, [storageKey]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(storageKey, '1');
    } catch {
      // Ignorar
    }
  };

  // Plan LIFETIME o ACTIVA con más de 3 días → sin banner
  if (licencia.estado === 'ACTIVA' && licencia.diasRestantes > 3) return null;
  // TRIAL con más de 3 días → sin banner para no ser invasivo
  if (licencia.estado === 'TRIAL' && licencia.diasRestantes > 3) return null;

  // Permitir ocultar avisos preventivos o de cortesía durante la sesión actual
  if (dismissed && licencia.estado !== 'VENCIDA') return null;

  // ─── ACTIVA pero quedan 3 días o menos → aviso discreto y cerrable ────────
  if (licencia.estado === 'ACTIVA' && licencia.diasRestantes <= 3) {
    const diasTexto = licencia.diasRestantes <= 0
      ? 'hoy a las 11:59 PM'
      : licencia.diasRestantes === 1
        ? 'mañana'
        : `en ${licencia.diasRestantes} días`;

    return (
      <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl px-3.5 py-2 mb-3 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-amber-300/90 min-w-0">
          <Clock size={15} className="shrink-0 text-amber-400" />
          <span className="truncate">
            Recordatorio: Tu plan <strong className="text-amber-200">{licencia.planSuscripcion}</strong> vence <strong>{diasTexto}</strong>.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/billing"
            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold rounded-lg transition-colors"
          >
            Renovar
          </Link>
          <button
            onClick={handleDismiss}
            title="Ocultar por esta sesión"
            className="p-1 text-amber-400/60 hover:text-amber-200 rounded-md transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ─── TRIAL — últimos 3 días (discreto y cerrable) ─────────────────────────
  if (licencia.estado === 'TRIAL') {
    const diasTexto = licencia.diasRestantes <= 0
      ? 'hoy'
      : licencia.diasRestantes === 1
        ? 'mañana'
        : `en ${licencia.diasRestantes} días`;

    return (
      <div className="bg-indigo-500/8 border border-indigo-500/20 rounded-xl px-3.5 py-2 mb-3 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-indigo-300/90 min-w-0">
          <Sparkles size={15} className="shrink-0 text-indigo-400" />
          <span className="truncate">
            Tu periodo de prueba finaliza <strong>{diasTexto}</strong>. Activa tu plan para mantener todos los módulos administrativos.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/billing"
            className="px-2.5 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 font-bold rounded-lg transition-colors"
          >
            Elegir plan
          </Link>
          <button
            onClick={handleDismiss}
            title="Ocultar por esta sesión"
            className="p-1 text-indigo-400/60 hover:text-indigo-200 rounded-md transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ─── GRACIA — Pago en verificación (5 días) o Periodo de cortesía (3 días) ─
  if (licencia.estado === 'GRACIA') {
    const diasGracia = Math.max(1, licencia.diasRestantes);
    return (
      <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-3.5 py-2 mb-3 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-emerald-300/90 min-w-0">
          <ShieldCheck size={15} className="shrink-0 text-emerald-400" />
          {licencia.pagoEnRevision ? (
            <span className="truncate">
              <strong>Pago en verificación:</strong> Cuentas con acceso completo ({diasGracia} {diasGracia === 1 ? 'día' : 'días'} de margen) mientras validamos tu comprobante.
            </span>
          ) : (
            <span className="truncate">
              <strong>Periodo de cortesía activo ({diasGracia} {diasGracia === 1 ? 'día' : 'días'}):</strong> Tu fecha de corte pasó, pero mantienes acceso total para reportar tu pago sin interrupciones.
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/billing"
            className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-bold rounded-lg transition-colors"
          >
            {licencia.pagoEnRevision ? 'Ver estado' : 'Reportar pago'}
          </Link>
          <button
            onClick={handleDismiss}
            title="Ocultar por esta sesión"
            className="p-1 text-emerald-400/60 hover:text-emerald-200 rounded-md transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ─── VENCIDA — POS y Caja activos, módulos administrativos restringidos ────
  if (licencia.estado === 'VENCIDA') {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2 mb-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-red-300">
          <XCircle size={15} className="shrink-0 text-red-400" />
          <span>
            <strong>Suscripción vencida:</strong> Tu Punto de Venta y Caja siguen 100% operativos. Renueva tu plan para reactivar los módulos administrativos.
          </span>
        </div>
        <Link
          href="/dashboard/billing"
          className="shrink-0 px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors"
        >
          Reportar pago
        </Link>
      </div>
    );
  }

  return null;
}

