'use client';

import React, { useState } from 'react';
import { registrarGasto } from '@/actions/gastos-actions';
import { Loader2, Receipt, CheckCircle2, Wallet } from 'lucide-react';

const CATEGORIAS = [
  { id: 'NOMINA', label: 'Nómina / Pagos' },
  { id: 'SERVICIOS_PUBLICOS', label: 'Luz / Agua / Internet' },
  { id: 'MANTENIMIENTO', label: 'Mantenimiento' },
  { id: 'COMPRAS_MENORES', label: 'Caja Chica' },
  { id: 'VIATICOS', label: 'Viáticos' },
  { id: 'MARKETING', label: 'Marketing / Publicidad' },
  { id: 'OTROS', label: 'Otros' }
];

export default function GastosForm() {
  const [categoria, setCategoria] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!categoria) {
      setErrorMsg('Selecciona una categoría para el gasto.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    formData.append('categoria', categoria);
    
    const result = await registrarGasto(formData);

    if (result?.error) {
      setErrorMsg(result.error);
    } else if (result?.success) {
      setSuccess(true);
      e.currentTarget.reset();
      setCategoria('');
      
      // Ocultar mensaje de éxito después de 4 segundos
      setTimeout(() => setSuccess(false), 4000);
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="w-full max-w-lg mx-auto p-4 sm:p-6 bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800">
      
      {/* Header Widget */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
          <Wallet size={24} strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Registrar Gasto</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Salidas de caja diarias</p>
        </div>
      </div>

      {success && (
        <div className="mb-6 p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="text-green-600 dark:text-green-400" size={24} />
          <p className="text-green-800 dark:text-green-300 font-medium">¡Gasto registrado con éxito!</p>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-red-800 dark:text-red-300 text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Descripción Libre */}
        <div className="space-y-2">
          <label htmlFor="descripcion" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
            Descripción del Pago
          </label>
          <input
            id="descripcion"
            name="descripcion"
            type="text"
            required
            placeholder="Ej: Pago al técnico por reparar la nevera..."
            className="w-full h-14 px-4 text-base rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
          />
        </div>

        {/* Monto del Gasto */}
        <div className="space-y-2">
          <label htmlFor="monto" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
            Monto Extraído (Bs / $)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-gray-500 font-medium text-lg">$</span>
            </div>
            <input
              id="monto"
              name="monto"
              type="text"
              inputMode="decimal"
              required
              placeholder="0.00"
              className="w-full h-16 pl-10 pr-4 text-2xl font-bold rounded-2xl bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 focus:ring-2 focus:ring-purple-500 text-purple-700 dark:text-purple-300 placeholder-purple-300"
            />
          </div>
        </div>

        {/* Categoría (Pills) */}
        <div className="space-y-2 pt-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
            Categoría Contable
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoria(cat.id)}
                className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                  categoria === cat.id
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Botón de Enviar */}
        <div className="pt-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 flex justify-center items-center gap-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-lg font-semibold rounded-2xl transition-colors disabled:opacity-70 shadow-lg shadow-purple-600/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <Receipt size={20} />
                <span>Registrar Pago</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
