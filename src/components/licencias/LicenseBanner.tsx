'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock, XCircle, ShieldAlert } from 'lucide-react';
import { EstadoLicencia } from '@/actions/licencia-actions';

interface LicenseBannerProps {
  licencia: EstadoLicencia;
}

export default function LicenseBanner({ licencia }: LicenseBannerProps) {
  // Plan LIFETIME o ACTIVA con más de 3 días → sin banner
  if (licencia.estado === 'ACTIVA' && licencia.diasRestantes > 3) return null;

  // ─── ACTIVA pero quedan 3 días o menos → advertencia temprana ────────────
  if (licencia.estado === 'ACTIVA' && licencia.diasRestantes <= 3) {
    const diasTexto = licencia.diasRestantes === 1
      ? 'mañana'
      : licencia.diasRestantes === 0
        ? 'hoy'
        : `en ${licencia.diasRestantes} días`;

    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-amber-400">
          <Clock size={18} className="shrink-0" />
          <span className="text-sm">
            Tu plan <strong className="text-amber-300">{licencia.planSuscripcion}</strong> vence{' '}
            <strong>{diasTexto}</strong> — el día 1 del mes solo podrás acceder al punto de venta.
          </span>
        </div>
        <Link
          href="/dashboard/billing"
          className="shrink-0 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-lg transition-colors"
        >
          Renovar ahora
        </Link>
      </div>
    );
  }

  // ─── TRIAL — últimos 5 días ───────────────────────────────────────────────
  if (licencia.estado === 'TRIAL') {
    if (licencia.diasRestantes > 5) return null;
    return (
      <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-indigo-400">
          <Clock size={18} className="shrink-0" />
          <span className="text-sm">
            Tu periodo de prueba termina en <strong>{licencia.diasRestantes} días</strong>.
          </span>
        </div>
        <Link href="/dashboard/billing" className="shrink-0 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-lg transition-colors">
          Activar mi cuenta
        </Link>
      </div>
    );
  }

  // ─── GRACIA — pago en revisión, 5 días de margen ─────────────────────────
  if (licencia.estado === 'GRACIA') {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-amber-400">
          <ShieldAlert size={18} className="shrink-0" />
          <span className="text-sm">
            Pago reportado — en revisión. Tienes{' '}
            <strong>{licencia.diasRestantes} días de acceso completo</strong> mientras verificamos tu pago.
          </span>
        </div>
        <Link href="/dashboard/billing" className="shrink-0 text-xs text-amber-400 underline font-semibold">
          Ver estado
        </Link>
      </div>
    );
  }

  // ─── VENCIDA — solo POS disponible ───────────────────────────────────────
  if (licencia.estado === 'VENCIDA') {
    return (
      <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-red-400">
          <XCircle size={18} className="shrink-0" />
          <span className="text-sm">
            <strong>Licencia vencida hace {licencia.diasVencido} días.</strong>{' '}
            Solo tienes acceso al punto de venta. Todos los demás módulos están bloqueados.
          </span>
        </div>
        <Link
          href="/dashboard/billing"
          className="shrink-0 px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-lg transition-colors"
        >
          Renovar — desbloquear todo
        </Link>
      </div>
    );
  }

  return null;
}
