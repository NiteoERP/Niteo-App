'use client';

import React, { useState, useEffect } from 'react';
import { registrarMerma } from '@/actions/mermas-actions';
import { getInsumos } from '@/actions/compras-actions';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

type Insumo = {
  id: string;
  nombre: string;
  unidad_medida: string;
};

const MOTIVOS = [
  { id: 'DAÑADO', label: 'Dañado' },
  { id: 'VENCIDO', label: 'Vencido' },
  { id: 'ERROR_PRODUCCION', label: 'Error Prod.' },
  { id: 'CONSUMO_INTERNO', label: 'Consumo' },
  { id: 'AJUSTE_INVENTARIO', label: 'Ajuste / Falta' }
];

export default function MermaForm() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [selectedInsumo, setSelectedInsumo] = useState<string>('');
  const [unidad, setUnidad] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Reusamos getInsumos ya que hace exactamente lo mismo (traer lista de inventario_insumos)
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
    if (!motivo) {
      setErrorMsg('Selecciona un motivo para la merma.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    formData.append('motivo', motivo); // El estado maneja los pills
    const result = await registrarMerma(formData);

    if (result?.error) {
      setErrorMsg(result.error);
    } else if (result?.success) {
      setSuccess(true);
      e.currentTarget.reset();
      setSelectedInsumo('');
      setUnidad('');
      setMotivo('');
      
      // Ocultar mensaje de éxito después de 4 segundos
      setTimeout(() => setSuccess(false), 4000);
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="w-full max-w-lg mx-auto p-4 sm:p-6 bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800">
      
      {/* Header Widget */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
          <AlertTriangle size={24} strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Registrar Merma</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Descuenta inventario y cálcula la pérdida</p>
        </div>
      </div>

      {success && (
        <div className="mb-6 p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="text-green-600 dark:text-green-400" size={24} />
          <p className="text-green-800 dark:text-green-300 font-medium">¡Merma registrada! El costo se ha guardado.</p>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-red-800 dark:text-red-300 text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Selector de Insumo */}
        <div className="space-y-2">
          <label htmlFor="insumo_id" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
            Insumo a Mermar
          </label>
          <div className="relative">
            <select
              id="insumo_id"
              name="insumo_id"
              required
              value={selectedInsumo}
              onChange={handleInsumoChange}
              className="w-full h-14 pl-4 pr-10 text-base rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none text-gray-900 dark:text-white"
            >
              <option value="" disabled>Selecciona el insumo...</option>
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
              Cantidad Pérdida
            </label>
            <input
              id="cantidad"
              name="cantidad"
              type="text"
              inputMode="decimal"
              required
              placeholder="0.00"
              className="w-full h-14 px-4 text-lg font-bold text-orange-600 dark:text-orange-400 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-orange-500"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
              Unidad
            </label>
            <div className="w-full h-14 px-4 flex items-center justify-center text-base font-medium rounded-2xl bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
              {unidad || '-'}
            </div>
          </div>
        </div>

        {/* Motivo (Pills) */}
        <div className="space-y-2 pt-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
            Motivo / Razón
          </label>
          <div className="flex flex-wrap gap-2">
            {MOTIVOS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMotivo(m.id)}
                className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                  motivo === m.id
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Botón de Enviar */}
        <div className="pt-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 flex justify-center items-center gap-2 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white text-lg font-semibold rounded-2xl transition-colors disabled:opacity-70 shadow-lg shadow-orange-600/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <AlertTriangle size={20} />
                <span>Descontar Inventario</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
