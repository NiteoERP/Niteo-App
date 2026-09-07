'use client';

import { useState, useTransition } from 'react';
import { updateEmpresaSaaS } from './actions';
import { Building2, Save, Loader2, AlertCircle, Globe, DollarSign, Calculator, Package, FlaskConical, Info } from 'lucide-react';

export default function SettingsForm({ empresa }: { empresa: any }) {
  const [formData, setFormData] = useState({
    nombre_comercial: empresa.nombre_comercial || '',
    moneda: empresa.moneda || 'USD',
    simbolo_moneda: empresa.simbolo_moneda || '$',
    zona_horaria: empresa.zona_horaria || 'America/Caracas',
    metodo_costeo_despachos: empresa.metodo_costeo_despachos || 'PROMEDIO',
    metodos_pago: empresa.metodos_pago || [],
    metodo_costeo_inventario: empresa.metodo_costeo_inventario || 'MOVIL',
    costeo_promedio_n: empresa.costeo_promedio_n || 3,
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

  const METODO_INFO: Record<string, string> = {
    MOVIL: 'P = (Valor en stock + Valor comprado) / Cantidad total. El costo se recalcula con cada compra.',
    PROMEDIO_N: 'Promedio simple del precio unitario de las últimas N compras registradas.',
    ULTIMO: 'El costo promedio se reemplaza por el precio unitario de la última compra.',
  };

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {/* --- Perfil general --- */}
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Nombre Comercial</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
              <input type="text" value={formData.nombre_comercial}
                onChange={(e) => setFormData({...formData, nombre_comercial: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Zona Horaria</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
              <select value={formData.zona_horaria} onChange={(e) => setFormData({...formData, zona_horaria: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none">
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
              <select value={formData.moneda} onChange={(e) => setFormData({...formData, moneda: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none">
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
              <input type="text" value={formData.simbolo_moneda}
                onChange={(e) => setFormData({...formData, simbolo_moneda: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Método de Costeo (Despachos)</label>
            <div className="relative">
              <Calculator className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
              <select value={formData.metodo_costeo_despachos} onChange={(e) => setFormData({...formData, metodo_costeo_despachos: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none">
                <option value="PROMEDIO">Costo Promedio Ponderado</option>
                <option value="ULTIMO">Último Costo</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Métodos de Pago Personalizados (Separados por coma)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
              <input type="text" placeholder="Efectivo, Pago Móvil, Zelle, Tarjeta, Binance..."
                value={formData.metodos_pago?.join(', ')}
                onChange={(e) => setFormData({...formData, metodos_pago: e.target.value.split(',').map(m => m.trim()).filter(m => m)})}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" />
            </div>
            <p className="text-xs text-neutral-500 mt-1.5">Estos métodos aparecerán como opciones al registrar ventas en el POS.</p>
          </div>
        </div>
      </div>

      {/* --- NUEVA SECCIÓN: PRODUCTOS → COMPRAS E INVENTARIO --- */}
      <div className="border-t border-neutral-800 pt-7">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Package size={16} className="text-indigo-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Productos</h3>
            <p className="text-xs text-neutral-500">Compras e Inventario</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-3 flex items-center gap-2">
              <FlaskConical size={15} className="text-indigo-400" />
              Método de valoración del costo de inventario
            </label>

            <div className="space-y-3">
              {/* Opción 1: Precio Promedio Móvil */}
              <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                formData.metodo_costeo_inventario === 'MOVIL'
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-neutral-800 hover:border-neutral-700'
              }`}>
                <input type="radio" name="metodo_costeo" value="MOVIL"
                  checked={formData.metodo_costeo_inventario === 'MOVIL'}
                  onChange={() => setFormData({...formData, metodo_costeo_inventario: 'MOVIL'})}
                  className="mt-0.5 accent-indigo-500" />
                <div>
                  <p className="text-white text-sm font-medium">Precio Promedio Móvil <span className="text-xs text-indigo-400 ml-1">(Recomendado)</span></p>
                  <p className="text-neutral-500 text-xs mt-0.5">P = (Valor en stock + Valor comprado) / Cantidad total — se recalcula con cada compra.</p>
                </div>
              </label>

              {/* Opción 2: Promedio N últimas compras */}
              <div>
                <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  formData.metodo_costeo_inventario === 'PROMEDIO_N'
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}>
                  <input type="radio" name="metodo_costeo" value="PROMEDIO_N"
                    checked={formData.metodo_costeo_inventario === 'PROMEDIO_N'}
                    onChange={() => setFormData({...formData, metodo_costeo_inventario: 'PROMEDIO_N'})}
                    className="mt-0.5 accent-indigo-500" />
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">Precio Promedio de las últimas N compras</p>
                    <p className="text-neutral-500 text-xs mt-0.5">Promedio simple del precio unitario de las últimas N compras.</p>
                    {formData.metodo_costeo_inventario === 'PROMEDIO_N' && (
                      <div className="mt-3 flex items-center gap-3">
                        <label className="text-xs text-neutral-400 whitespace-nowrap">Número de compras (N):</label>
                        <div className="flex items-center gap-2">
                          {[2, 3, 5, 10].map(n => (
                            <button key={n} type="button"
                              onClick={() => setFormData({...formData, costeo_promedio_n: n})}
                              className={`w-10 h-8 rounded-lg text-sm font-bold transition-all ${
                                formData.costeo_promedio_n === n
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                              }`}>{n}
                            </button>
                          ))}
                          <input type="number" min={1} max={50} value={formData.costeo_promedio_n}
                            onChange={e => setFormData({...formData, costeo_promedio_n: parseInt(e.target.value) || 3})}
                            className="w-16 bg-neutral-950 border border-neutral-700 text-white rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-indigo-500" />
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {/* Opción 3: Último precio */}
              <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                formData.metodo_costeo_inventario === 'ULTIMO'
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-neutral-800 hover:border-neutral-700'
              }`}>
                <input type="radio" name="metodo_costeo" value="ULTIMO"
                  checked={formData.metodo_costeo_inventario === 'ULTIMO'}
                  onChange={() => setFormData({...formData, metodo_costeo_inventario: 'ULTIMO'})}
                  className="mt-0.5 accent-indigo-500" />
                <div>
                  <p className="text-white text-sm font-medium">Último precio de compra</p>
                  <p className="text-neutral-500 text-xs mt-0.5">El costo promedio se reemplaza por el precio unitario de la compra más reciente.</p>
                </div>
              </label>
            </div>

            {/* Información del método seleccionado */}
            <div className="mt-3 flex items-start gap-2 p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
              <Info size={14} className="text-neutral-500 shrink-0 mt-0.5" />
              <p className="text-xs text-neutral-500">{METODO_INFO[formData.metodo_costeo_inventario]}</p>
            </div>
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
        <button type="submit" disabled={isPending}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20">
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Guardar Configuración
        </button>
      </div>
    </form>
  );
}
