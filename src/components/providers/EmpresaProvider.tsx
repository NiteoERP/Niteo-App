'use client';

import React, { createContext, useContext } from 'react';
import { DEFAULT_TIMEZONE, formatDateTimeLocal, toLocalDateKey } from '@/utils/date-utils';

interface EmpresaContextType {
  empresa: {
    nombre_comercial: string;
    rubro?: string;
    moneda: string;
    simbolo_moneda: string;
    zona_horaria: string;
    metodos_pago?: string[];
  } | null;
  // Identidad del tenant — disponible en todos los Client Components sin llamar al servidor
  empresaId: string | null;
  userRole: string;
  userSedeId: string | null;
  permisos: string[];
  timeZone: string;
  planSuscripcion: string;
  modulosActivos: string[];
  hasModulo: (modulo: string) => boolean;
  formatCurrency: (amount: number) => string;
  formatDateTime: (iso?: string | null) => string;
  formatDate: (iso?: string | null) => string;
}

const EmpresaContext = createContext<EmpresaContextType>({
  empresa: null,
  empresaId: null,
  userRole: 'CAJERO',
  userSedeId: null,
  permisos: [],
  timeZone: DEFAULT_TIMEZONE,
  planSuscripcion: 'STARTER',
  modulosActivos: [],
  hasModulo: () => false,
  formatCurrency: (amount: number) =>
    `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
  formatDateTime: (iso?: string | null) => formatDateTimeLocal(iso, DEFAULT_TIMEZONE),
  formatDate: (iso?: string | null) => toLocalDateKey(iso, DEFAULT_TIMEZONE),
});

export const useEmpresa = () => useContext(EmpresaContext);

export default function EmpresaProvider({
  empresa,
  empresaId,
  userRole,
  userSedeId,
  permisos = [],
  planSuscripcion = 'STARTER',
  modulosActivos = [],
  children,
}: {
  empresa: any;
  empresaId: string | null;
  userRole: string;
  userSedeId: string | null;
  permisos?: string[];
  planSuscripcion?: string;
  modulosActivos?: string[];
  children: React.ReactNode;
}) {
  const timeZone = empresa?.zona_horaria || DEFAULT_TIMEZONE;

  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount === null) return `0.00 ${empresa?.moneda || 'USD'}`;
    return `${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${empresa?.moneda || 'USD'}`;
  };

  const formatDateTime = (iso?: string | null) => formatDateTimeLocal(iso, timeZone);
  const formatDate = (iso?: string | null) => toLocalDateKey(iso, timeZone);

  const hasModulo = (modulo: string) => {
    const plan = planSuscripcion.toUpperCase();
    if (plan === 'LIFETIME' || plan === 'ENTERPRISE') return true;
    if (modulo === 'recetas' && plan === 'PRO') return true;
    return modulosActivos.includes(modulo);
  };

  return (
    <EmpresaContext.Provider
      value={{
        empresa,
        empresaId,
        userRole,
        userSedeId,
        permisos,
        timeZone,
        planSuscripcion,
        modulosActivos,
        hasModulo,
        formatCurrency,
        formatDateTime,
        formatDate,
      }}
    >
      {children}
    </EmpresaContext.Provider>
  );
}
