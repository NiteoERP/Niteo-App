'use client';

import React, { createContext, useContext } from 'react';

interface EmpresaContextType {
  empresa: {
    nombre_comercial: string;
    moneda: string;
    simbolo_moneda: string;
    zona_horaria: string;
    metodos_pago?: string[];
  } | null;
  formatCurrency: (amount: number) => string;
}

const EmpresaContext = createContext<EmpresaContextType>({
  empresa: null,
  formatCurrency: (amount: number) => `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
});

export const useEmpresa = () => useContext(EmpresaContext);

export default function EmpresaProvider({ 
  empresa, 
  children 
}: { 
  empresa: any; 
  children: React.ReactNode 
}) {
  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount === null) return `0.00 ${empresa?.moneda || 'USD'}`;
    
    return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${empresa?.moneda || 'USD'}`;
  };

  return (
    <EmpresaContext.Provider value={{ empresa, formatCurrency }}>
      {children}
    </EmpresaContext.Provider>
  );
}
