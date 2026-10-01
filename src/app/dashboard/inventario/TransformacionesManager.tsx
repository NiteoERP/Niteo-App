'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  ArrowRightLeft, 
  Save, 
  Play, 
  Loader2, 
  RotateCcw, 
  Sparkles,
  Calculator,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  ejecutarTransformacion, 
  guardarPlantillaTransformacion, 
  getPlantillasTransformacion,
  eliminarPlantillaTransformacion,
  TransformacionItem 
} from '@/actions/transformaciones-actions';

interface PlantillaBase {
  id: string;
  nombre: string;
  origenes: TransformacionItem[];
  destinos: TransformacionItem[];
}

export default function TransformacionesManager({ 
  insumos, 
  activeSedeId 
}: { 
  insumos: any[]; 
  activeSedeId: string; 
}) {
  const [origenes, setOrigenes] = useState<TransformacionItem[]>([{ insumo_id: '', cantidad: '1' }]);
  const [destinos, setDestinos] = useState<TransformacionItem[]>([{ insumo_id: '', cantidad: '1', porcentaje_costo: '100' }]);
  
  const [plantillas, setPlantillas] = useState<any[]>([]);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<string>('');
  const [plantillaBase, setPlantillaBase] = useState<PlantillaBase | null>(null);
  const [factorEscala, setFactorEscala] = useState<number>(1.0);
  
  const [isEjecuting, setIsEjecuting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal para guardar plantilla
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nombreNuevaPlantilla, setNombreNuevaPlantilla] = useState('');

  const insumosOptions = insumos.map(i => ({ 
    value: i.id, 
    label: `${i.nombre} (${i.unidad_medida}) - Disp: ${i.cantidad_actual}` 
  }));

  useEffect(() => {
    cargarPlantillas();
  }, []);

  const cargarPlantillas = async () => {
    const res = await getPlantillasTransformacion();
    if (res.success) setPlantillas(res.plantillas || []);
  };

  const handleCargarPlantilla = (id: string) => {
    setPlantillaSeleccionada(id);
    setErrorMsg('');
    setSuccessMsg('');

    if (!id) {
      setPlantillaBase(null);
      setFactorEscala(1.0);
      setOrigenes([{ insumo_id: '', cantidad: '1' }]);
      setDestinos([{ insumo_id: '', cantidad: '1', porcentaje_costo: '100' }]);
      return;
    }

    const p = plantillas.find(x => x.id === id);
    if (p) {
      const mapItem = (item: any) => {
        let matched = insumos.find(i => i.id === item.insumo_id);
        if (!matched && item.nombre_insumo) {
          matched = insumos.find(i => i.nombre?.toLowerCase().trim() === item.nombre_insumo.toLowerCase().trim());
        }
        return {
          ...item,
          insumo_id: matched ? matched.id : '',
          cantidad: item.cantidad !== undefined ? String(item.cantidad) : '1',
          porcentaje_costo: item.porcentaje_costo !== undefined ? String(item.porcentaje_costo) : undefined,
          nombre_insumo: item.nombre_insumo || matched?.nombre || ''
        };
      };
      
      const mappedOrigenes = (p.insumos_origen || []).map(mapItem);
      const mappedDestinos = (p.insumos_destino || []).map(mapItem);

      // Guardar copia limpia de base para cálculo proporcional
      setPlantillaBase({
        id: p.id,
        nombre: p.nombre,
        origenes: JSON.parse(JSON.stringify(mappedOrigenes)),
        destinos: JSON.parse(JSON.stringify(mappedDestinos))
      });
      setFactorEscala(1.0);
      setOrigenes(mappedOrigenes);
      setDestinos(mappedDestinos);
    }
  };

  const handleRestablecerBase = () => {
    if (!plantillaBase) return;
    setOrigenes(JSON.parse(JSON.stringify(plantillaBase.origenes)));
    setDestinos(JSON.parse(JSON.stringify(plantillaBase.destinos)));
    setFactorEscala(1.0);
    setSuccessMsg('Cantidades restablecidas a los valores base de la plantilla.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const agregarOrigen = () => setOrigenes([...origenes, { insumo_id: '', cantidad: '1' }]);
  const agregarDestino = () => setDestinos([...destinos, { insumo_id: '', cantidad: '1', porcentaje_costo: '0' }]);
  
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

  // Manejo de cantidades con soporte total para decimales y recálculo automático proporcional
  const handleDestinoCantidadChange = (idx: number, rawVal: string) => {
    const cleanVal = rawVal.replace(',', '.');
    
    // Permitir dígitos y hasta un punto decimal (ej: "0.", "1.25", etc)
    if (cleanVal !== '' && !/^\d*\.?\d*$/.test(cleanVal)) {
      return;
    }

    // Actualizar el valor actual en destinos inmediatamente para que el usuario pueda escribir
    const newDestinos = [...destinos];
    newDestinos[idx] = { ...newDestinos[idx], cantidad: cleanVal };

    // Si hay una plantilla base cargada, calcular el factor de escala y ajustar automáticamente los orígenes
    if (plantillaBase && plantillaBase.destinos[idx]) {
      const baseDestino = plantillaBase.destinos[idx];
      const baseQty = parseFloat(String(baseDestino.cantidad)) || 0;
      const newQty = parseFloat(cleanVal) || 0;

      if (baseQty > 0 && newQty > 0) {
        const factor = newQty / baseQty;
        setFactorEscala(factor);

        // Recalcular todos los insumos de origen basados en la plantilla
        const newOrigenes = origenes.map((orig, oIdx) => {
          const baseOrig = plantillaBase.origenes[oIdx];
          if (!baseOrig) return orig;
          const baseOrigQty = parseFloat(String(baseOrig.cantidad)) || 0;
          const scaledQty = baseOrigQty * factor;
          const formattedQty = Number.isInteger(scaledQty)
            ? String(scaledQty)
            : String(parseFloat(scaledQty.toFixed(4)));
          return {
            ...orig,
            cantidad: formattedQty
          };
        });
        setOrigenes(newOrigenes);

        // Si hay otros destinos en la plantilla, también escalarlos proporcionalmente
        if (destinos.length > 1) {
          destinos.forEach((d, dIdx) => {
            if (dIdx !== idx) {
              const bDest = plantillaBase.destinos[dIdx];
              if (bDest) {
                const bQty = parseFloat(String(bDest.cantidad)) || 0;
                const scaledQty = bQty * factor;
                newDestinos[dIdx] = {
                  ...newDestinos[dIdx],
                  cantidad: Number.isInteger(scaledQty)
                    ? String(scaledQty)
                    : String(parseFloat(scaledQty.toFixed(4)))
                };
              }
            }
          });
        }
      }
    }

    setDestinos(newDestinos);
  };

  const handleOrigenCantidadChange = (idx: number, rawVal: string) => {
    const cleanVal = rawVal.replace(',', '.');
    if (cleanVal !== '' && !/^\d*\.?\d*$/.test(cleanVal)) {
      return;
    }
    updateOrigen(idx, 'cantidad', cleanVal);
  };

  const handleDestinoPorcentajeChange = (idx: number, rawVal: string) => {
    const cleanVal = rawVal.replace(',', '.');
    if (cleanVal !== '' && !/^\d*\.?\d*$/.test(cleanVal)) {
      return;
    }
    updateDestino(idx, 'porcentaje_costo', cleanVal);
  };

  const calcularCostoTotalOrigen = () => {
    let total = 0;
    origenes.forEach(o => {
      const ins = insumos.find(i => i.id === o.insumo_id);
      const cant = parseFloat(String(o.cantidad)) || 0;
      if (ins && cant > 0) total += (parseFloat(String(ins.costo_promedio)) || 0) * cant;
    });
    return total;
  };

  const handleEjecutar = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    
    // Validaciones
    const validOrigenes = origenes
      .filter(o => o.insumo_id && (parseFloat(String(o.cantidad)) || 0) > 0)
      .map(o => ({
        ...o,
        cantidad: parseFloat(String(o.cantidad)) || 0
      }));

    const validDestinos = destinos
      .filter(d => d.insumo_id && (parseFloat(String(d.cantidad)) || 0) > 0)
      .map(d => ({
        ...d,
        cantidad: parseFloat(String(d.cantidad)) || 0,
        porcentaje_costo: d.porcentaje_costo !== undefined 
          ? (parseFloat(String(d.porcentaje_costo)) || 0) 
          : undefined
      }));

    if (validOrigenes.length === 0 || validDestinos.length === 0) {
      setErrorMsg('Debes agregar al menos un insumo de origen y uno de destino con cantidades mayores a cero.');
      return;
    }

    // Validar suma de porcentajes si hay más de 1 destino
    if (validDestinos.length > 1) {
      const sum = validDestinos.reduce((acc, d) => acc + (d.porcentaje_costo || 0), 0);
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
      setSuccessMsg('Transformación ejecutada correctamente e inventario actualizado.');
      if (!plantillaSeleccionada) {
        setOrigenes([{ insumo_id: '', cantidad: '1' }]);
        setDestinos([{ insumo_id: '', cantidad: '1', porcentaje_costo: '100' }]);
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const abrirModalGuardar = () => {
    const validOrigenes = origenes.filter(o => o.insumo_id && (parseFloat(String(o.cantidad)) || 0) > 0);
    const validDestinos = destinos.filter(d => d.insumo_id && (parseFloat(String(d.cantidad)) || 0) > 0);
    if (validOrigenes.length === 0 || validDestinos.length === 0) {
      setErrorMsg('Debes seleccionar insumos y cantidades válidas antes de guardar una plantilla.');
      return;
    }
    const plantillaActual = plantillas.find(p => p.id === plantillaSeleccionada);
    setNombreNuevaPlantilla(plantillaActual ? plantillaActual.nombre : '');
    setIsModalOpen(true);
  };

  const handleGuardarPlantilla = async (actualizarExistente: boolean = false) => {
    const validOrigenes = origenes.filter(o => o.insumo_id && (parseFloat(String(o.cantidad)) || 0) > 0).map(o => ({
      ...o,
      cantidad: parseFloat(String(o.cantidad)) || 0,
      nombre_insumo: insumos.find(i => i.id === o.insumo_id)?.nombre
    }));

    const validDestinos = destinos.filter(d => d.insumo_id && (parseFloat(String(d.cantidad)) || 0) > 0).map(d => ({
      ...d,
      cantidad: parseFloat(String(d.cantidad)) || 0,
      porcentaje_costo: d.porcentaje_costo !== undefined ? (parseFloat(String(d.porcentaje_costo)) || 0) : undefined,
      nombre_insumo: insumos.find(i => i.id === d.insumo_id)?.nombre
    }));

    const nombre = nombreNuevaPlantilla.trim();
    if (!nombre) {
      setErrorMsg('Por favor ingresa un nombre para la plantilla.');
      return;
    }

    setIsSaving(true);
    const idToUpdate = (actualizarExistente && plantillaSeleccionada) ? plantillaSeleccionada : undefined;
    const res = await guardarPlantillaTransformacion(nombre, validOrigenes, validDestinos, idToUpdate);
    setIsSaving(false);

    if (res.success) {
      setSuccessMsg(idToUpdate ? 'Plantilla actualizada exitosamente.' : 'Plantilla guardada exitosamente.');
      setIsModalOpen(false);
      await cargarPlantillas();
      if (res.plantilla?.id) {
        handleCargarPlantilla(res.plantilla.id);
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(res.error || 'Error al guardar la plantilla');
    }
  };

  const handleEliminarPlantilla = async () => {
    if (!plantillaSeleccionada) return;
    const p = plantillas.find(x => x.id === plantillaSeleccionada);
    const confirmacion = window.confirm(`¿Estás seguro de que deseas eliminar la plantilla "${p?.nombre}"?`);
    if (!confirmacion) return;

    setIsDeleting(true);
    const res = await eliminarPlantillaTransformacion(plantillaSeleccionada);
    setIsDeleting(false);

    if (res.success) {
      setSuccessMsg('Plantilla eliminada correctamente.');
      setPlantillaSeleccionada('');
      setPlantillaBase(null);
      setFactorEscala(1.0);
      setOrigenes([{ insumo_id: '', cantidad: '1' }]);
      setDestinos([{ insumo_id: '', cantidad: '1', porcentaje_costo: '100' }]);
      cargarPlantillas();
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(res.error || 'Error al eliminar plantilla');
    }
  };

  const costoTotalOrigen = calcularCostoTotalOrigen();

  return (
    <div className="space-y-6">
      
      {/* Header & Selector de Plantillas */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ArrowRightLeft className="text-indigo-400" />
            Módulo de Transformación
          </h2>
          <p className="text-sm text-neutral-400">Convierte materia prima en productos o subproductos transfiriendo costos con precisión decimal.</p>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <select 
              value={plantillaSeleccionada}
              onChange={(e) => handleCargarPlantilla(e.target.value)}
              className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">-- Modo Manual --</option>
              {plantillas.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          {plantillaSeleccionada && (
            <button
              onClick={handleEliminarPlantilla}
              disabled={isDeleting}
              className="p-2.5 bg-neutral-800 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 border border-neutral-700/60 rounded-xl transition-colors shrink-0"
              title="Eliminar plantilla actual"
            >
              {isDeleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
            </button>
          )}

          <button 
            onClick={abrirModalGuardar}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 text-sm font-medium shadow-md shadow-indigo-600/20"
            title="Guardar como Plantilla"
          >
            <Save size={18} />
            <span className="hidden sm:inline">Guardar Plantilla</span>
          </button>
        </div>
      </div>

      {/* Banner de Plantilla Activa y Factor de Escala Dinámico */}
      {plantillaBase && (
        <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <Calculator size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">{plantillaBase.nombre}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Escala: {factorEscala.toFixed(3)}x
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Cálculo automático activado: Al modificar cualquier cantidad destino, los insumos origen se recalculan en tiempo real permitiendo decimales.
              </p>
            </div>
          </div>

          <button
            onClick={handleRestablecerBase}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-medium transition-colors border border-neutral-700/50 shrink-0"
            title="Volver a las cantidades originales de la plantilla"
          >
            <RotateCcw size={14} />
            Restablecer Base
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-sm flex items-center gap-2 animate-in fade-in duration-200">
          <AlertCircle size={18} className="shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl text-sm flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* COLUMNA 1: ORIGEN (CONSUMO) */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
              <h3 className="font-semibold text-rose-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> 
                Insumos de Origen (Se consumen)
              </h3>
              <span className="text-xs text-neutral-500 font-mono">Salida</span>
            </div>
            
            <div className="space-y-3.5">
              {origenes.map((o, idx) => {
                const baseOrig = plantillaBase?.origenes[idx];
                return (
                  <div key={idx} className="flex flex-wrap gap-2 items-end bg-black/40 p-3 rounded-xl border border-neutral-800/80 hover:border-neutral-700 transition-colors">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-neutral-400 font-medium">Insumo</label>
                        {baseOrig && (
                          <span className="text-[11px] text-neutral-500 font-mono">
                            Base: {baseOrig.cantidad}
                          </span>
                        )}
                      </div>
                      <select 
                        value={o.insumo_id}
                        onChange={(e) => updateOrigen(idx, 'insumo_id', e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-rose-500/50"
                      >
                        <option value="">Selecciona...</option>
                        {insumosOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="w-28">
                      <label className="block text-xs text-neutral-400 font-medium mb-1">Cant.</label>
                      <input 
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={o.cantidad ?? ''}
                        onChange={e => handleOrigenCantidadChange(idx, e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-rose-500/50" 
                      />
                    </div>

                    <button 
                      onClick={() => removerOrigen(idx)} 
                      className="p-2 text-neutral-500 hover:text-rose-400 transition-colors rounded-lg hover:bg-neutral-800"
                      title="Quitar insumo"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              })}
            </div>

            <button 
              onClick={agregarOrigen} 
              className="mt-4 flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              <Plus size={16} /> Agregar Insumo Origen
            </button>
          </div>
          
          <div className="mt-6 pt-4 border-t border-neutral-800 flex justify-between items-center text-sm">
            <span className="text-neutral-400">Costo Base Transferido:</span>
            <span className="font-bold text-white text-base">${costoTotalOrigen.toFixed(2)}</span>
          </div>
        </div>

        {/* COLUMNA 2: DESTINO (PRODUCCIÓN) */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
              <h3 className="font-semibold text-emerald-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> 
                Insumos de Destino (Se producen)
              </h3>
              <span className="text-xs text-neutral-500 font-mono">Entrada</span>
            </div>
            
            <div className="space-y-3.5">
              {destinos.map((d, idx) => {
                const baseDest = plantillaBase?.destinos[idx];
                return (
                  <div key={idx} className="flex flex-wrap gap-2 items-end bg-black/40 p-3 rounded-xl border border-neutral-800/80 hover:border-neutral-700 transition-colors">
                    <div className="flex-1 min-w-[160px]">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-neutral-400 font-medium">Insumo / Producto</label>
                        {baseDest && (
                          <span className="text-[11px] text-neutral-500 font-mono">
                            Base: {baseDest.cantidad}
                          </span>
                        )}
                      </div>
                      <select 
                        value={d.insumo_id}
                        onChange={(e) => updateDestino(idx, 'insumo_id', e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
                      >
                        <option value="">Selecciona...</option>
                        {insumosOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24">
                      <label className="block text-xs text-neutral-400 font-medium mb-1">Cant.</label>
                      <input 
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={d.cantidad ?? ''}
                        onChange={e => handleDestinoCantidadChange(idx, e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-emerald-500/50" 
                      />
                    </div>

                    {destinos.length > 1 && (
                      <div className="w-20">
                        <label className="block text-xs text-neutral-400 font-medium mb-1">% Costo</label>
                        <input 
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={d.porcentaje_costo ?? ''}
                          onChange={e => handleDestinoPorcentajeChange(idx, e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-emerald-500/50" 
                        />
                      </div>
                    )}

                    <button 
                      onClick={() => removerDestino(idx)} 
                      className="p-2 text-neutral-500 hover:text-rose-400 transition-colors rounded-lg hover:bg-neutral-800"
                      title="Quitar insumo"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              })}
            </div>

            <button 
              onClick={agregarDestino} 
              className="mt-4 flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              <Plus size={16} /> Agregar Insumo Destino
            </button>
          </div>
          
          <div className="mt-6 pt-4 border-t border-neutral-800">
            <p className="text-xs text-neutral-400 leading-relaxed">
              * El sistema dividirá el costo transferido (${costoTotalOrigen.toFixed(2)}) entre los insumos destino y actualizará sus costos promedios ponderados.
            </p>
          </div>
        </div>

      </div>

      <div className="flex justify-end pt-2">
        <button 
          onClick={handleEjecutar}
          disabled={isEjecuting}
          className="bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold py-3.5 px-8 rounded-xl shadow-lg shadow-indigo-900/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          {isEjecuting ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
          Ejecutar Transformación
        </button>
      </div>

      {/* MODAL GUARDAR PLANTILLA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles size={20} className="text-indigo-400" />
                Guardar Plantilla
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-neutral-400">
              Guarda las proporciones de origen y destino para usarlas en futuras producciones.
            </p>

            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1.5">Nombre de la Plantilla</label>
              <input 
                type="text"
                autoFocus
                placeholder="Ej: Salsa Boloñesa, Hamburguesas x10, etc."
                value={nombreNuevaPlantilla}
                onChange={e => setNombreNuevaPlantilla(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleGuardarPlantilla(false); }}
                className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {plantillaSeleccionada && (
                <button
                  onClick={() => handleGuardarPlantilla(true)}
                  disabled={isSaving}
                  className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Sobrescribir plantilla actual
                </button>
              )}

              <button
                onClick={() => handleGuardarPlantilla(false)}
                disabled={isSaving}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                {plantillaSeleccionada ? 'Guardar como nueva plantilla' : 'Guardar Plantilla'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
