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
  formatCurrency: (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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
    if (isNaN(amount) || amount === null) return `${empresa?.simbolo_moneda || '$'}0.00`;
    
    // Si tenemos una moneda ISO y el navegador la soporta, la usamos. Si no, fallback manual.
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: empresa?.moneda || 'USD',
        currencyDisplay: 'narrowSymbol'
      }).format(amount);
    } catch (e) {
      return `${empresa?.simbolo_moneda || '$'}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  return (
    <EmpresaContext.Provider value={{ empresa, formatCurrency }}>
      {children}
    </EmpresaContext.Provider>
  );
}
