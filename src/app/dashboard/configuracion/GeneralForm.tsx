'use client';

import { useState, useTransition } from 'react';
import { updateEmpresaSaaS } from './actions';
import { Building2, Save, Loader2, Globe, DollarSign, Store, Check, AlertCircle } from 'lucide-react';

interface GeneralFormProps {
  empresa: {
    id: string;
    nombre_comercial: string | null;
    rubro: string | null;
    zona_horaria: string | null;
    moneda: string | null;
    simbolo_moneda: string | null;
  };
}

export default function GeneralForm({ empresa }: GeneralFormProps) {
  const [formData, setFormData] = useState({
    nombre_comercial: empresa.nombre_comercial || '',
    rubro: empresa.rubro || 'restaurante',
    zona_horaria: empresa.zona_horaria || 'America/Caracas',
    moneda: empresa.moneda || 'USD',
    simbolo_moneda: empresa.simbolo_moneda || '$',
  });

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    startTransition(async () => {
      const res = await updateEmpresaSaaS(empresa.id, {
        nombre_comercial: formData.nombre_comercial,
        rubro: formData.rubro,
        zona_horaria: formData.zona_horaria,
        moneda: formData.moneda,
        simbolo_moneda: formData.simbolo_moneda,
      });

      if (!res.success) {
        setError('Error al guardar: ' + res.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3500);
      }
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Alertas */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3 animate-in fade-in">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3 animate-in fade-in">
          <Check size={18} className="shrink-0" />
          <span>Información de la empresa actualizada correctamente.</span>
        </div>
      )}

      <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-5 sm:p-6 space-y-6">
        <div className="border-b border-neutral-800/60 pb-4">
          <h3 className="text-base font-semibold text-white">Identidad Comercial</h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Configura el nombre visible, rubro comercial y huso horario de tu negocio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Nombre Comercial */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">
              Nombre Comercial de la Empresa
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4 pointer-events-none" />
              <input
                type="text"
                required
                value={formData.nombre_comercial}
                onChange={(e) => setFormData({ ...formData, nombre_comercial: e.target.value })}
                placeholder="Ej. Inversiones Niteo C.A."
                className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Rubro Comercial */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">
              Rubro / Tipo de Negocio
            </label>
            <div className="relative">
              <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4 pointer-events-none" />
              <select
                value={formData.rubro}
                onChange={(e) => setFormData({ ...formData, rubro: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
              >
                <option value="restaurante">Restaurante / Comida Rápida</option>
                <option value="minimarket">Minimarket / Bodegón</option>
                <option value="ferreteria">Ferretería / Construcción</option>
                <option value="farmacia">Farmacia / Salud</option>
                <option value="tienda_ropa">Tienda de Ropa / Boutique</option>
                <option value="servicios">Servicios Generales</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              {formData.rubro === 'restaurante'
                ? 'Habilita el módulo de meseros y control de comandas por mesa.'
                : 'Oculta módulos de hostelería para mantener el sistema limpio.'}
            </p>
          </div>

          {/* Zona Horaria */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">
              Zona Horaria
            </label>
            <div className="relative">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4 pointer-events-none" />
              <select
                value={formData.zona_horaria}
                onChange={(e) => setFormData({ ...formData, zona_horaria: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
              >
                <option value="America/Caracas">America/Caracas (Venezuela - GMT-4)</option>
                <option value="America/Bogota">America/Bogota (Colombia - GMT-5)</option>
                <option value="America/Lima">America/Lima (Perú - GMT-5)</option>
                <option value="America/Mexico_City">America/Mexico_City (México - GMT-6)</option>
                <option value="America/Argentina/Buenos_Aires">America/Buenos_Aires (Argentina - GMT-3)</option>
                <option value="America/Santiago">America/Santiago (Chile - GMT-4)</option>
                <option value="Europe/Madrid">Europe/Madrid (España - GMT+1)</option>
                <option value="UTC">UTC (Tiempo Universal)</option>
              </select>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Usada para registrar cierres de caja y fecha/hora de tickets.
            </p>
          </div>
        </div>
      </div>

      {/* Moneda Base */}
      <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-5 sm:p-6 space-y-6">
        <div className="border-b border-neutral-800/60 pb-4">
          <h3 className="text-base font-semibold text-white">Moneda Base Contable</h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Moneda principal en la que se registran los reportes e inventario de la empresa.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">
              Código ISO
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4 pointer-events-none" />
              <select
                value={formData.moneda}
                onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
              >
                <option value="USD">Dólar Estadounidense (USD)</option>
                <option value="VES">Bolívar Soberano (VES)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="COP">Peso Colombiano (COP)</option>
                <option value="MXN">Peso Mexicano (MXN)</option>
                <option value="ARS">Peso Argentino (ARS)</option>
                <option value="CLP">Peso Chileno (CLP)</option>
                <option value="PEN">Sol Peruano (PEN)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">
              Símbolo de Visualización
            </label>
            <input
              type="text"
              value={formData.simbolo_moneda}
              onChange={(e) => setFormData({ ...formData, simbolo_moneda: e.target.value })}
              placeholder="$ o Bs"
              className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Botón Guardar */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
