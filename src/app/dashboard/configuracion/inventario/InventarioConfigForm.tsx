'use client';

import { useState, useTransition } from 'react';
import { updateEmpresaSaaS } from '../actions';
import { Package, Calculator, FlaskConical, Info, Save, Loader2, Check, AlertCircle } from 'lucide-react';

interface InventarioConfigFormProps {
  empresa: {
    id: string;
    metodo_costeo_inventario: string | null;
    costeo_promedio_n: number | null;
    metodo_costeo_despachos: string | null;
  };
}

const METODO_INFO: Record<string, string> = {
  MOVIL: 'P = (Valor en stock actual + Valor total comprado) / Cantidad total resultante. El costo ponderado se recalcula con cada compra registrada en el sistema.',
  PROMEDIO_N: 'Promedio aritmético simple del costo unitario registrado en las últimas N recepciones de compra del producto.',
  ULTIMO: 'El costo unitario del inventario se reemplaza inmediatamente por el costo unitario de la compra más reciente.',
};

export default function InventarioConfigForm({ empresa }: InventarioConfigFormProps) {
  const [formData, setFormData] = useState({
    metodo_costeo_inventario: empresa.metodo_costeo_inventario || 'MOVIL',
    costeo_promedio_n: empresa.costeo_promedio_n || 3,
    metodo_costeo_despachos: empresa.metodo_costeo_despachos || 'PROMEDIO',
  });

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    startTransition(async () => {
      const res = await updateEmpresaSaaS(empresa.id, {
        metodo_costeo_inventario: formData.metodo_costeo_inventario,
        costeo_promedio_n: formData.costeo_promedio_n,
        metodo_costeo_despachos: formData.metodo_costeo_despachos,
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
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3">
          <Check size={18} className="shrink-0" />
          <span>Parámetros de inventario y costeo actualizados.</span>
        </div>
      )}

      {/* Tarjeta 1: Valoración de Costo de Inventario */}
      <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-5 sm:p-6 space-y-6">
        <div className="border-b border-neutral-800/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <FlaskConical size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Método de Valoración de Stock</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Define cómo calcula el sistema el costo unitario de tus productos al reponer mercancía.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {/* Opción 1: Precio Promedio Móvil */}
          <label
            className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
              formData.metodo_costeo_inventario === 'MOVIL'
                ? 'border-indigo-500 bg-indigo-500/10 shadow-sm'
                : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/50'
            }`}
          >
            <input
              type="radio"
              name="metodo_costeo"
              value="MOVIL"
              checked={formData.metodo_costeo_inventario === 'MOVIL'}
              onChange={() => setFormData({ ...formData, metodo_costeo_inventario: 'MOVIL' })}
              className="mt-1 accent-indigo-500"
            />
            <div>
              <p className="text-white text-sm font-semibold">
                Precio Promedio Móvil <span className="text-xs text-indigo-400 ml-1 font-normal">(Recomendado)</span>
              </p>
              <p className="text-neutral-400 text-xs mt-1">
                P = (Valor en stock actual + Valor total comprado) / Cantidad total. Se actualiza en cada compra entrante.
              </p>
            </div>
          </label>

          {/* Opción 2: Promedio N últimas compras */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              formData.metodo_costeo_inventario === 'PROMEDIO_N'
                ? 'border-indigo-500 bg-indigo-500/10 shadow-sm'
                : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/50'
            }`}
          >
            <label className="flex items-start gap-3.5 cursor-pointer">
              <input
                type="radio"
                name="metodo_costeo"
                value="PROMEDIO_N"
                checked={formData.metodo_costeo_inventario === 'PROMEDIO_N'}
                onChange={() => setFormData({ ...formData, metodo_costeo_inventario: 'PROMEDIO_N' })}
                className="mt-1 accent-indigo-500"
              />
              <div className="flex-1">
                <p className="text-white text-sm font-semibold">Precio Promedio de las últimas N compras</p>
                <p className="text-neutral-400 text-xs mt-1">
                  Promedio aritmético simple del costo en las últimas N facturas de compra registradas.
                </p>
              </div>
            </label>

            {formData.metodo_costeo_inventario === 'PROMEDIO_N' && (
              <div className="mt-4 pt-3 border-t border-indigo-500/20 flex flex-wrap items-center gap-3">
                <label className="text-xs text-neutral-300 font-medium">Número de compras (N):</label>
                <div className="flex items-center gap-2">
                  {[2, 3, 5, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setFormData({ ...formData, costeo_promedio_n: n })}
                      className={`w-9 h-8 rounded-lg text-xs font-bold transition-all ${
                        formData.costeo_promedio_n === n
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formData.costeo_promedio_n}
                    onChange={(e) => setFormData({ ...formData, costeo_promedio_n: parseInt(e.target.value) || 3 })}
                    className="w-14 bg-neutral-900 border border-neutral-700 text-white rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Opción 3: Último precio */}
          <label
            className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
              formData.metodo_costeo_inventario === 'ULTIMO'
                ? 'border-indigo-500 bg-indigo-500/10 shadow-sm'
                : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/50'
            }`}
          >
            <input
              type="radio"
              name="metodo_costeo"
              value="ULTIMO"
              checked={formData.metodo_costeo_inventario === 'ULTIMO'}
              onChange={() => setFormData({ ...formData, metodo_costeo_inventario: 'ULTIMO' })}
              className="mt-1 accent-indigo-500"
            />
            <div>
              <p className="text-white text-sm font-semibold">Último Costo de Compra</p>
              <p className="text-neutral-400 text-xs mt-1">
                El costo promedio se sobrescribe directamente con el costo unitario de la compra más reciente.
              </p>
            </div>
          </label>
        </div>

        {/* Info card */}
        <div className="flex items-start gap-2.5 p-3.5 bg-neutral-900 border border-neutral-800 rounded-xl">
          <Info size={15} className="text-neutral-400 shrink-0 mt-0.5" />
          <p className="text-xs text-neutral-400 leading-relaxed">
            {METODO_INFO[formData.metodo_costeo_inventario] || ''}
          </p>
        </div>
      </div>

      {/* Tarjeta 2: Costeo de Despachos / Transferencias */}
      <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-5 sm:p-6 space-y-6">
        <div className="border-b border-neutral-800/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Calculator size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Costeo en Despachos y Transferencias</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Criterio contable al transferir mercancía entre sedes o almacenes.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-md">
          <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">
            Cálculo de Despachos
          </label>
          <select
            value={formData.metodo_costeo_despachos}
            onChange={(e) => setFormData({ ...formData, metodo_costeo_despachos: e.target.value })}
            className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors cursor-pointer"
          >
            <option value="PROMEDIO">Costo Promedio Ponderado</option>
            <option value="ULTIMO">Último Costo Registrado</option>
          </select>
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
              <span>Guardar Configuración</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
