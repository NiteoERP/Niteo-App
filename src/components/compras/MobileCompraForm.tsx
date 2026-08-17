'use client';

import React, { useState, useEffect } from 'react';
import { registrarCompra, getInsumos } from '@/actions/compras-actions';
import { Loader2, CheckCircle2, ShoppingCart } from 'lucide-react';

type Insumo = {
  id: string;
  nombre: string;
  unidad_medida: string;
};

export default function MobileCompraForm() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [selectedInsumo, setSelectedInsumo] = useState<string>('');
  const [unidad, setUnidad] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cargar insumos al montar el componente
  useEffect(() => {
    const fetchInsumos = async () => {
      const data = await getInsumos();
      setInsumos(data);
    };
    fetchInsumos();
  }, []);

  const handleInsumoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedInsumo(val);
    const found = insumos.find((i) => i.id === val);
    if (found) {
      setUnidad(found.unidad_medida);
    } else {
      setUnidad('');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const result = await registrarCompra(formData);

    if (result?.error) {
      setErrorMsg(result.error);
    } else if (result?.success) {
      setSuccess(true);
      e.currentTarget.reset();
      setSelectedInsumo('');
      setUnidad('');
      
      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(false), 3000);
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 sm:p-6 bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800">
      
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <ShoppingCart size={24} strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Registrar Compra</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Ingresa la materia prima adquirida</p>
        </div>
      </div>

      {success && (
        <div className="mb-6 p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="text-green-600 dark:text-green-400" size={24} />
          <p className="text-green-800 dark:text-green-300 font-medium">¡Compra registrada con éxito!</p>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-red-800 dark:text-red-300 text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Selector de Insumo */}
        <div className="space-y-2">
          <label htmlFor="insumo_id" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
            Insumo a comprar
          </label>
          <div className="relative">
            <select
              id="insumo_id"
              name="insumo_id"
              required
              value={selectedInsumo}
              onChange={handleInsumoChange}
              className="w-full h-14 pl-4 pr-10 text-base rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none text-gray-900 dark:text-white"
            >
              <option value="" disabled>Selecciona un insumo...</option>
              {insumos.map((insumo) => (
                <option key={insumo.id} value={insumo.id}>
                  {insumo.nombre}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Cantidad y Unidad */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="cantidad" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
              Cantidad
            </label>
            <input
              id="cantidad"
              name="cantidad"
              type="text"
              inputMode="decimal"
              required
              placeholder="0.00"
              className="w-full h-14 px-4 text-lg font-medium rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
              Unidad
            </label>
            <div className="w-full h-14 px-4 flex items-center text-base font-medium rounded-2xl bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
              {unidad || '-'}
            </div>
          </div>
        </div>

        {/* Costo Total */}
        <div className="space-y-2 pt-2">
          <label htmlFor="costo_total" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
            Costo Total Pagado
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-gray-500 font-medium text-lg">$</span>
            </div>
            <input
              id="costo_total"
              name="costo_total"
              type="text"
              inputMode="decimal"
              required
              placeholder="0.00"
              className="w-full h-16 pl-10 pr-4 text-xl font-bold rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Botón de Enviar */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-lg font-semibold rounded-2xl transition-colors disabled:opacity-70 shadow-lg shadow-blue-600/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                <span>Guardando...</span>
              </>
            ) : (
              <span>Registrar Compra</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
