'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Settings, 
  Trash2, 
  Edit2, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Percent,
  PenTool,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { 
  getListasPrecios, 
  createListaPrecio, 
  updateListaPrecio, 
  toggleListaPrecio, 
  deleteListaPrecio 
} from '@/actions/listas-precios-actions';

interface ListaPrecio {
  id: string;
  nombre: string;
  tipo_calculo: string;
  porcentaje_modificador: number;
  moneda: string;
  estado_activo: boolean;
}

export default function ListasPreciosManager() {
  const [listas, setListas] = useState<ListaPrecio[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [nombre, setNombre] = useState('');
  const [tipoCalculo, setTipoCalculo] = useState('MANUAL');
  const [porcentaje, setPorcentaje] = useState('');
  const [moneda, setMoneda] = useState('USD');
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadListas();
  }, []);

  const loadListas = async () => {
    setLoading(true);
    const res = await getListasPrecios();
    if (res.success && res.data) {
      setListas(res.data);
    }
    setLoading(false);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setNombre('');
    setTipoCalculo('MANUAL');
    setPorcentaje('');
    setMoneda('USD');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (lista: ListaPrecio) => {
    setEditingId(lista.id);
    setNombre(lista.nombre);
    setTipoCalculo(lista.tipo_calculo);
    setPorcentaje(lista.porcentaje_modificador.toString());
    setMoneda(lista.moneda || 'USD');
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    if (!nombre.trim()) {
      setError('El nombre es requerido');
      setFormLoading(false);
      return;
    }

    const payload = {
      nombre,
      tipo_calculo: tipoCalculo,
      porcentaje_modificador: tipoCalculo === 'PORCENTAJE_BASE' ? parseFloat(porcentaje) || 0 : 0,
      moneda
    };

    let res;
    if (editingId) {
      res = await updateListaPrecio(editingId, payload);
    } else {
      res = await createListaPrecio(payload);
    }

    if (res.success) {
      setIsModalOpen(false);
      await loadListas();
    } else {
      setError(res.error || 'Ocurrió un error');
    }
    setFormLoading(false);
  };

  const handleToggle = async (id: string, current: boolean) => {
    const res = await toggleListaPrecio(id, !current);
    if (res.success) {
      setListas(listas.map(l => l.id === id ? { ...l, estado_activo: !current } : l));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta lista de precios? Se eliminarán también los precios asociados en todos los productos.')) return;
    const res = await deleteListaPrecio(id);
    if (res.success) {
      setListas(listas.filter(l => l.id !== id));
    } else {
      alert(res.error || 'Error al eliminar');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="animate-spin text-neutral-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={openCreateModal}
          className="bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-medium px-4 py-2 rounded-xl text-sm transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Nueva Lista
        </button>
      </div>

      <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl overflow-hidden">
        {listas.length === 0 ? (
          <div className="p-10 text-center text-neutral-500">
            No hay listas de precios configuradas.
          </div>
        ) : (
          <div className="divide-y divide-neutral-800/80">
            {listas.map((lista) => (
              <div key={lista.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-white font-medium text-sm">{lista.nombre}</h4>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-400">
                    <span className="flex items-center gap-1">
                      {lista.tipo_calculo === 'MANUAL' ? <PenTool size={14} /> : <Percent size={14} />}
                      {lista.tipo_calculo === 'MANUAL' ? 'Precio Manual' : `Basado en Porcentaje (${lista.porcentaje_modificador}%)`}
                    </span>
                    <span className="w-1 h-1 bg-neutral-700 rounded-full" />
                    <span>Moneda: {lista.moneda || 'USD'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleToggle(lista.id, lista.estado_activo)}
                    className="text-neutral-400 hover:text-white transition-colors"
                  >
                    {lista.estado_activo ? (
                      <ToggleRight size={28} className="text-emerald-500" />
                    ) : (
                      <ToggleLeft size={28} />
                    )}
                  </button>
                  <button 
                    onClick={() => openEditModal(lista)}
                    className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-300 transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(lista.id)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/30">
              <h3 className="text-lg font-semibold text-white">
                {editingId ? 'Editar Lista de Precios' : 'Nueva Lista de Precios'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-500 hover:text-white transition-colors"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Nombre de la Lista <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Precio Mayor"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Tipo de Cálculo
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTipoCalculo('MANUAL')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition-colors ${
                      tipoCalculo === 'MANUAL' 
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                        : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    <PenTool size={16} />
                    Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoCalculo('PORCENTAJE_BASE')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition-colors ${
                      tipoCalculo === 'PORCENTAJE_BASE' 
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                        : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    <Percent size={16} />
                    Porcentaje
                  </button>
                </div>
                <p className="text-[11px] text-neutral-500 mt-2">
                  {tipoCalculo === 'MANUAL' 
                    ? 'Tendrás que ingresar el precio de forma manual para cada producto.' 
                    : 'El precio se calculará automáticamente sumando o restando un porcentaje al precio base.'}
                </p>
              </div>

              {tipoCalculo === 'PORCENTAJE_BASE' && (
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                    Modificador (Ej: -20 para 20% de descuento)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={porcentaje}
                      onChange={(e) => setPorcentaje(e.target.value)}
                      placeholder="-20"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-4 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">
                      %
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-semibold py-2.5 rounded-xl text-sm transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {formLoading ? <Loader2 className="animate-spin" size={18} /> : 'Guardar Lista'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
