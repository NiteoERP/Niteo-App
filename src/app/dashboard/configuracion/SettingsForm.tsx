'use client';

import React, { useState, useTransition } from 'react';
import { updateEmpresaSaaS } from './actions';
import { Building2, Save, Loader2, AlertCircle, Globe, DollarSign } from 'lucide-react';

export default function SettingsForm({ empresa }: { empresa: any }) {
  const [formData, setFormData] = useState({
    nombre_comercial: empresa.nombre_comercial || '',
    moneda: empresa.moneda || 'USD',
    simbolo_moneda: empresa.simbolo_moneda || '$',
    zona_horaria: empresa.zona_horaria || 'America/Caracas',
  });
  
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    startTransition(async () => {
      const res = await updateEmpresaSaaS(empresa.id, formData);
      if (!res.success) {
        setError('Error al guardar: ' + res.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">Nombre Comercial</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
            <input
              type="text"
              value={formData.nombre_comercial} 
              onChange={(e) => setFormData({...formData, nombre_comercial: e.target.value})}
              className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">Zona Horaria</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
            <select
              value={formData.zona_horaria}
              onChange={(e) => setFormData({...formData, zona_horaria: e.target.value})}
              className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none"
            >
              <option value="America/Caracas">America/Caracas</option>
              <option value="America/Bogota">America/Bogota</option>
              <option value="America/Lima">America/Lima</option>
              <option value="America/Mexico_City">America/Mexico_City</option>
              <option value="America/Argentina/Buenos_Aires">America/Buenos_Aires</option>
              <option value="America/Santiago">America/Santiago</option>
              <option value="Europe/Madrid">Europe/Madrid</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">Moneda Base ISO</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
            <select
              value={formData.moneda}
              onChange={(e) => setFormData({...formData, moneda: e.target.value})}
              className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none"
            >
              <option value="USD">Dólar Estadounidense (USD)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="COP">Peso Colombiano (COP)</option>
              <option value="MXN">Peso Mexicano (MXN)</option>
              <option value="ARS">Peso Argentino (ARS)</option>
              <option value="CLP">Peso Chileno (CLP)</option>
              <option value="PEN">Sol Peruano (PEN)</option>
              <option value="VES">Bolívar Soberano (VES)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">Símbolo de la Moneda</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-bold w-5 h-5 flex items-center justify-center">S/</span>
            <input
              type="text"
              value={formData.simbolo_moneda} 
              onChange={(e) => setFormData({...formData, simbolo_moneda: e.target.value})}
              className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
      </div>
      
      {error && (
        <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
      
      {success && (
        <p className="text-emerald-400 text-sm font-medium">¡Configuración guardada exitosamente! Recarga la página para aplicar la zona horaria en los reportes.</p>
      )}

      <div className="flex justify-end pt-2">
        <button 
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Guardar Configuración
        </button>
      </div>
    </form>
  );
}
