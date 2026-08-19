'use client';

import React, { useState, useEffect } from 'react';
import { registrarCompra, getInsumos, getTasaDelDia } from '@/actions/compras-actions';
import { Loader2, CheckCircle2, ShoppingCart, Search, Package } from 'lucide-react';

type Insumo = {
  id: string;
  nombre: string;
  unidad_medida: string;
};

export default function MobileCompraForm() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [tasaDelDia, setTasaDelDia] = useState<number>(36.5);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInsumo, setSelectedInsumo] = useState<Insumo | null>(null);
  const [isNewInsumo, setIsNewInsumo] = useState(false);
  const [newInsumoName, setNewInsumoName] = useState('');
  const [newInsumoUnit, setNewInsumoUnit] = useState('KG');

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [cantidad, setCantidad] = useState('');
  const [costoUSD, setCostoUSD] = useState('');
  const [costoVES, setCostoVES] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cargar insumos y tasa al montar el componente
  useEffect(() => {
    const initData = async () => {
      const [data, tasa] = await Promise.all([getInsumos(), getTasaDelDia()]);
      setInsumos(data);
      setTasaDelDia(tasa);
    };
    initData();
  }, []);

  const filteredInsumos = insumos.filter(i => 
    i.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exactMatchExists = insumos.some(i => i.nombre.toLowerCase() === searchTerm.toLowerCase().trim());

  // Lógica de Autocalculado Bi-direccional
  const handleUSDChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCostoUSD(val);
    if (!isNaN(Number(val)) && val !== '') {
      setCostoVES((Number(val) * tasaDelDia).toFixed(2));
    } else {
      setCostoVES('');
    }
  };

  const handleVESChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCostoVES(val);
    if (!isNaN(Number(val)) && val !== '') {
      setCostoUSD((Number(val) / tasaDelDia).toFixed(2));
    } else {
      setCostoUSD('');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccess(false);

    if (!isNewInsumo && !selectedInsumo) {
      setErrorMsg('Debes seleccionar un insumo.');
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    if (isNewInsumo) {
      formData.set('nombre_nuevo_insumo', newInsumoName);
      formData.set('unidad_medida_nueva', newInsumoUnit);
    } else if (selectedInsumo) {
      formData.set('insumo_id', selectedInsumo.id);
    }

    formData.set('cantidad', cantidad);
    formData.set('costo_total', costoUSD);

    const result = await registrarCompra(formData);

    if (result?.error) {
      setErrorMsg(result.error);
    } else if (result?.success) {
      setSuccess(true);
      
      // Reset form
      setSelectedInsumo(null);
      setIsNewInsumo(false);
      setSearchTerm('');
      setNewInsumoName('');
      setCantidad('');
      setCostoUSD('');
      setCostoVES('');
      
      // Auto-ocultar mensaje de éxito
      setTimeout(() => setSuccess(false), 3000);
      
      // Actualizar lista de insumos
      const data = await getInsumos();
      setInsumos(data);
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 sm:p-6 bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800">
      
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Package size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nueva Compra</h2>
          </div>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          Tasa BCV: <span className="text-green-600 dark:text-green-400 font-bold ml-1">{tasaDelDia}</span> Bs
        </div>
      </div>

      {success && (
        <div className="mb-6 p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="text-green-600 dark:text-green-400" size={24} />
          <p className="text-green-800 dark:text-green-300 font-medium text-sm">¡Compra registrada con éxito!</p>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-red-800 dark:text-red-300 text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Autocomplete de Insumo */}
        <div className="relative">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1 mb-2">
            Insumo a comprar
          </label>
          
          {selectedInsumo || isNewInsumo ? (
            <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 h-14 px-4 rounded-2xl">
              <span className="text-base text-gray-900 dark:text-white font-medium">
                {isNewInsumo ? (
                  <span className="flex items-center gap-2">
                    <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded-md">NUEVO</span>
                    {newInsumoName}
                  </span>
                ) : selectedInsumo?.nombre}
              </span>
              <button 
                type="button" 
                onClick={() => { setSelectedInsumo(null); setIsNewInsumo(false); setSearchTerm(''); }}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm font-medium"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar insumo..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                className="w-full h-14 pl-11 pr-4 text-base rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none text-gray-900 dark:text-white"
              />
              
              {isDropdownOpen && searchTerm.length > 0 && (
                <ul className="absolute z-10 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                  {filteredInsumos.map(insumo => (
                    <li 
                      key={insumo.id} 
                      onClick={() => {
                        setSelectedInsumo(insumo);
                        setIsDropdownOpen(false);
                      }}
                      className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-base text-gray-900 dark:text-white flex justify-between items-center border-b border-gray-100 dark:border-gray-700 last:border-0"
                    >
                      {insumo.nombre}
                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-lg">{insumo.unidad_medida}</span>
                    </li>
                  ))}
                  
                  {!exactMatchExists && searchTerm.trim().length > 0 && (
                    <li 
                      onClick={() => {
                        setNewInsumoName(searchTerm.trim());
                        setIsNewInsumo(true);
                        setIsDropdownOpen(false);
                      }}
                      className="px-4 py-3 bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer text-base text-blue-700 dark:text-blue-400 flex items-center gap-2 border-t border-gray-100 dark:border-gray-700"
                    >
                      <Package size={16} />
                      Crear "{searchTerm.trim()}"
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Unidad de medida (solo si es nuevo) */}
        {isNewInsumo && (
          <div className="animate-in fade-in slide-in-from-top-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1 mb-2">
              Unidad de Medida
            </label>
            <select
              value={newInsumoUnit}
              onChange={(e) => setNewInsumoUnit(e.target.value)}
              className="w-full h-14 px-4 text-base rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 appearance-none text-gray-900 dark:text-white"
            >
              <option value="KG">KG</option>
              <option value="LITROS">LITROS</option>
              <option value="UNIDADES">UNIDADES</option>
              <option value="CAJAS">CAJAS</option>
            </select>
          </div>
        )}

        {/* Cantidad */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1 mb-2">
            Cantidad Ingresada
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              required
              min="0.01"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="0.00"
              className="w-full h-14 px-4 text-lg font-medium rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <span className="text-gray-500 font-medium bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-md text-sm">
                {isNewInsumo ? newInsumoUnit : (selectedInsumo ? selectedInsumo.unidad_medida : 'UND')}
              </span>
            </div>
          </div>
        </div>

        {/* Calculadora Inversa */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1 mb-2">
              Costo Total ($)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-green-600 dark:text-green-500 font-bold pointer-events-none">$</span>
              <input
                type="number"
                step="any"
                required
                min="0.01"
                value={costoUSD}
                onChange={handleUSDChange}
                placeholder="0.00"
                className="w-full h-14 pl-8 pr-4 text-lg font-bold rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1 mb-2">
              Costo Total (Bs)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500 dark:text-gray-400 font-bold pointer-events-none">Bs</span>
              <input
                type="number"
                step="any"
                value={costoVES}
                onChange={handleVESChange}
                placeholder="0.00"
                className="w-full h-14 pl-10 pr-4 text-base font-medium rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Botón de Enviar */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting || (!selectedInsumo && !isNewInsumo) || !costoUSD || !cantidad}
            className="w-full h-14 flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-lg font-semibold rounded-2xl transition-colors disabled:opacity-50 shadow-lg shadow-blue-600/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                <span>Registrando...</span>
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
