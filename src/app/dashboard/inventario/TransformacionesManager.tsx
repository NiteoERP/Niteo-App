'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowRightLeft, Save, Play, Loader2 } from 'lucide-react';
import { 
  ejecutarTransformacion, 
  guardarPlantillaTransformacion, 
  getPlantillasTransformacion,
  eliminarPlantillaTransformacion,
  TransformacionItem 
} from '@/actions/transformaciones-actions';
import CreatableSelect from 'react-select/creatable';

export default function TransformacionesManager({ insumos, activeSedeId }: { insumos: any[], activeSedeId: string }) {
  const [origenes, setOrigenes] = useState<TransformacionItem[]>([{ insumo_id: '', cantidad: 1 }]);
  const [destinos, setDestinos] = useState<TransformacionItem[]>([{ insumo_id: '', cantidad: 1, porcentaje_costo: 100 }]);
  
  const [plantillas, setPlantillas] = useState<any[]>([]);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<string>('');
  
  const [isEjecuting, setIsEjecuting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const insumosOptions = insumos.map(i => ({ value: i.id, label: `${i.nombre} (${i.unidad_medida}) - Disp: ${i.cantidad_actual}` }));

  useEffect(() => {
    cargarPlantillas();
  }, []);

  const cargarPlantillas = async () => {
    const res = await getPlantillasTransformacion();
    if (res.success) setPlantillas(res.plantillas || []);
  };

  const handleCargarPlantilla = (id: string) => {
    setPlantillaSeleccionada(id);
    if (!id) {
      setOrigenes([{ insumo_id: '', cantidad: 1 }]);
      setDestinos([{ insumo_id: '', cantidad: 1, porcentaje_costo: 100 }]);
      return;
    }
    const p = plantillas.find(x => x.id === id);
    if (p) {
      setOrigenes(p.insumos_origen || []);
      setDestinos(p.insumos_destino || []);
    }
  };

  const agregarOrigen = () => setOrigenes([...origenes, { insumo_id: '', cantidad: 1 }]);
  const agregarDestino = () => setDestinos([...destinos, { insumo_id: '', cantidad: 1, porcentaje_costo: 0 }]);
  
  const removerOrigen = (index: number) => setOrigenes(origenes.filter((_, i) => i !== index));
  const removerDestino = (index: number) => setDestinos(destinos.filter((_, i) => i !== index));

  const updateOrigen = (index: number, field: string, value: any) => {
    const newArr = [...origenes];
    newArr[index] = { ...newArr[index], [field]: value };
    setOrigenes(newArr);
  };

  const updateDestino = (index: number, field: string, value: any) => {
    const newArr = [...destinos];
    newArr[index] = { ...newArr[index], [field]: value };
    setDestinos(newArr);
  };

  const calcularCostoTotalOrigen = () => {
    let total = 0;
    origenes.forEach(o => {
      const ins = insumos.find(i => i.id === o.insumo_id);
      if (ins) total += (ins.costo_promedio || 0) * o.cantidad;
    });
    return total;
  };

  const handleEjecutar = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    
    // Validaciones
    const validOrigenes = origenes.filter(o => o.insumo_id && o.cantidad > 0);
    const validDestinos = destinos.filter(d => d.insumo_id && d.cantidad > 0);

    if (validOrigenes.length === 0 || validDestinos.length === 0) {
      setErrorMsg('Debes agregar al menos un insumo de origen y uno de destino válidos.');
      return;
    }

    // Validar suma de porcentajes si hay más de 1 destino
    if (validDestinos.length > 1) {
      const sum = validDestinos.reduce((acc, d) => acc + (Number(d.porcentaje_costo) || 0), 0);
      if (Math.abs(sum - 100) > 0.1) {
        setErrorMsg('La suma de los porcentajes de costo en el destino debe ser 100%.');
        return;
      }
    } else if (validDestinos.length === 1) {
      validDestinos[0].porcentaje_costo = 100;
    }

    setIsEjecuting(true);
    const res = await ejecutarTransformacion(validOrigenes, validDestinos, activeSedeId);
    setIsEjecuting(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg('Transformación ejecutada correctamente.');
      // Limpiar manual
      if (!plantillaSeleccionada) {
        setOrigenes([{ insumo_id: '', cantidad: 1 }]);
        setDestinos([{ insumo_id: '', cantidad: 1, porcentaje_costo: 100 }]);
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const handleGuardarPlantilla = async () => {
    const validOrigenes = origenes.filter(o => o.insumo_id && o.cantidad > 0);
    const validDestinos = destinos.filter(d => d.insumo_id && d.cantidad > 0);
    if (validOrigenes.length === 0 || validDestinos.length === 0) {
      setErrorMsg('Debes agregar insumos para guardar la plantilla.');
      return;
    }
    const nombre = prompt('Nombre de la plantilla (Ej: Salsa de Tomate):');
    if (!nombre) return;

    setIsSaving(true);
    const res = await guardarPlantillaTransformacion(nombre, validOrigenes, validDestinos);
    setIsSaving(false);
    if (res.success) {
      setSuccessMsg('Plantilla guardada.');
      cargarPlantillas();
    } else {
      setErrorMsg(res.error || 'Error al guardar');
    }
  };

  const costoTotalOrigen = calcularCostoTotalOrigen();

  return (
    <div className="space-y-6">
      
      {/* Header & Plantillas */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ArrowRightLeft className="text-indigo-400" />
            Módulo de Transformación
          </h2>
          <p className="text-sm text-neutral-400">Convierte insumos en otros trasladando sus costos (Ej: Desposte, Producción)</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            value={plantillaSeleccionada}
            onChange={(e) => handleCargarPlantilla(e.target.value)}
            className="w-full md:w-64 bg-black border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">-- Modo Manual --</option>
            {plantillas.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
          <button 
            onClick={handleGuardarPlantilla}
            disabled={isSaving}
            className="bg-neutral-800 hover:bg-neutral-700 text-white p-2 rounded-lg transition-colors flex shrink-0"
            title="Guardar como Plantilla"
          >
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          </button>
        </div>
      </div>

      {errorMsg && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm">{errorMsg}</div>}
      {successMsg && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm">{successMsg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ORIGEN */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-rose-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> Insumos de Origen (Se consumen)
            </h3>
          </div>
          
          <div className="space-y-4">
            {origenes.map((o, idx) => (
              <div key={idx} className="flex flex-wrap gap-2 items-end bg-black/30 p-3 rounded-lg border border-neutral-800/50">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-neutral-500 mb-1">Insumo</label>
                  <select 
                    value={o.insumo_id}
                    onChange={(e) => updateOrigen(idx, 'insumo_id', e.target.value)}
                    className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white outline-none"
                  >
                    <option value="">Selecciona...</option>
                    {insumosOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-xs text-neutral-500 mb-1">Cant.</label>
                  <input 
                    type="number" step="any" min="0" 
                    value={o.cantidad || ''}
                    onChange={e => updateOrigen(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                    className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white outline-none" 
                  />
                </div>
                <button onClick={() => removerOrigen(idx)} className="p-2 text-neutral-500 hover:text-rose-400 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          <button onClick={agregarOrigen} className="mt-4 flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300">
            <Plus size={16} /> Agregar Origen
          </button>
          
          <div className="mt-6 pt-4 border-t border-neutral-800 flex justify-between text-sm">
            <span className="text-neutral-400">Costo Base Transferido:</span>
            <span className="font-bold text-white">${costoTotalOrigen.toFixed(2)}</span>
          </div>
        </div>

        {/* DESTINO */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-emerald-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Insumos de Destino (Se producen)
            </h3>
          </div>
          
          <div className="space-y-4">
            {destinos.map((d, idx) => (
              <div key={idx} className="flex flex-wrap gap-2 items-end bg-black/30 p-3 rounded-lg border border-neutral-800/50">
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs text-neutral-500 mb-1">Insumo</label>
                  <select 
                    value={d.insumo_id}
                    onChange={(e) => updateDestino(idx, 'insumo_id', e.target.value)}
                    className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white outline-none"
                  >
                    <option value="">Selecciona...</option>
                    {insumosOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="w-20">
                  <label className="block text-xs text-neutral-500 mb-1">Cant.</label>
                  <input 
                    type="number" step="any" min="0" 
                    value={d.cantidad || ''}
                    onChange={e => updateDestino(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                    className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white outline-none" 
                  />
                </div>
                {destinos.length > 1 && (
                  <div className="w-20">
                    <label className="block text-xs text-neutral-500 mb-1">% Costo</label>
                    <input 
                      type="number" step="any" min="0" max="100" 
                      value={d.porcentaje_costo}
                      onChange={e => updateDestino(idx, 'porcentaje_costo', parseFloat(e.target.value) || 0)}
                      className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white outline-none" 
                    />
                  </div>
                )}
                <button onClick={() => removerDestino(idx)} className="p-2 text-neutral-500 hover:text-rose-400 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          <button onClick={agregarDestino} className="mt-4 flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300">
            <Plus size={16} /> Agregar Destino
          </button>
          
          <div className="mt-6 pt-4 border-t border-neutral-800">
            <p className="text-xs text-neutral-500">
              * El sistema dividirá el costo origen (${costoTotalOrigen.toFixed(2)}) entre los insumos destino y actualizará sus costos promedios en base al porcentaje asignado.
            </p>
          </div>
        </div>

      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleEjecutar}
          disabled={isEjecuting}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-indigo-900/20 flex items-center gap-2 transition-all"
        >
          {isEjecuting ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
          Ejecutar Transformación
        </button>
      </div>

    </div>
  );
}
