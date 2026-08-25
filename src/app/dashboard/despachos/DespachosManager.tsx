'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Truck, ArrowRight, Store, Search, Plus, Trash2, Send } from 'lucide-react';

interface Sede {
  id: string;
  nombre_sede: string;
}

interface Insumo {
  id: string;
  nombre: string;
  unidad_medida: string;
  cantidad_actual: number;
}

interface CartItem {
  insumo_id: string;
  nombre: string;
  unidad_medida: string;
  cantidad: number;
}

export default function DespachosManager({ empresaId }: { empresaId: string }) {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [origenId, setOrigenId] = useState('');
  const [destinoId, setDestinoId] = useState('');
  const [notas, setNotas] = useState('');

  const [insumosOrigen, setInsumosOrigen] = useState<Insumo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInsumo, setSelectedInsumo] = useState<Insumo | null>(null);
  const [cantidadInput, setCantidadInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const supabase = createClient();

  useEffect(() => {
    loadSedes();
  }, [empresaId]);

  useEffect(() => {
    if (origenId) {
      loadInsumosOrigen();
      setCart([]); // Resetear carrito al cambiar de origen
    } else {
      setInsumosOrigen([]);
    }
  }, [origenId]);

  const loadSedes = async () => {
    const { data } = await supabase.from('sedes').select('id, nombre_sede').eq('empresa_id', empresaId).eq('estado_activo', true);
    if (data) setSedes(data);
  };

  const loadInsumosOrigen = async () => {
    const { data } = await supabase.from('inventario_insumos').select('id, nombre, unidad_medida, cantidad_actual').eq('sede_id', origenId).order('nombre');
    if (data) setInsumosOrigen(data);
  };

  const filteredInsumos = insumosOrigen.filter(i => i.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleAddToCart = () => {
    if (!selectedInsumo || !cantidadInput) return;
    const qty = parseFloat(cantidadInput);
    if (qty <= 0) return;

    if (qty > selectedInsumo.cantidad_actual) {
      setErrorMsg(`No hay suficiente stock. Disponible: ${selectedInsumo.cantidad_actual}`);
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

    const existing = cart.find(c => c.insumo_id === selectedInsumo.id);
    if (existing) {
      if (existing.cantidad + qty > selectedInsumo.cantidad_actual) {
        setErrorMsg('La suma excede el stock disponible.');
        setTimeout(() => setErrorMsg(''), 3000);
        return;
      }
      setCart(cart.map(c => c.insumo_id === selectedInsumo.id ? { ...c, cantidad: c.cantidad + qty } : c));
    } else {
      setCart([...cart, {
        insumo_id: selectedInsumo.id,
        nombre: selectedInsumo.nombre,
        unidad_medida: selectedInsumo.unidad_medida,
        cantidad: qty
      }]);
    }

    setSelectedInsumo(null);
    setSearchTerm('');
    setCantidadInput('');
    setIsDropdownOpen(false);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(c => c.insumo_id !== id));
  };

  const handleDespachar = async () => {
    if (!origenId || !destinoId || cart.length === 0) return;
    if (origenId === destinoId) {
      setErrorMsg('El origen y destino no pueden ser la misma sede.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const payloadItems = cart.map(c => ({
        nombre: c.nombre,
        unidad_medida: c.unidad_medida,
        cantidad: c.cantidad
      }));

      const { data, error } = await supabase.rpc('procesar_despacho', {
        p_empresa_id: empresaId,
        p_sede_origen_id: origenId,
        p_sede_destino_id: destinoId,
        p_usuario_id: user?.id,
        p_notas: notas || 'Transferencia entre sucursales',
        p_items: payloadItems
      });

      if (error) throw error;

      setSuccessMsg('¡Despacho procesado con éxito!');
      setCart([]);
      setNotas('');
      loadInsumosOrigen(); // Recargar stock
      
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar el despacho.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-indigo-500/10 p-2 rounded-xl">
          <Truck className="text-indigo-400" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Nuevo Despacho</h2>
          <p className="text-sm text-neutral-400">Transfiere mercancía de una sede a otra</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Sede Origen */}
        <div className="bg-neutral-950/50 p-4 rounded-xl border border-neutral-800/50">
          <label className="block text-sm font-medium text-neutral-400 mb-2 flex items-center gap-2">
            <Store size={16} /> Sede Origen (Sale Mercancía)
          </label>
          <select 
            value={origenId} 
            onChange={e => setOrigenId(e.target.value)}
            className="w-full h-14 bg-neutral-900 border border-neutral-800 text-white rounded-xl px-4 outline-none focus:border-indigo-500"
          >
            <option value="">Selecciona el origen...</option>
            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre_sede}</option>)}
          </select>
        </div>

        {/* Sede Destino */}
        <div className="bg-neutral-950/50 p-4 rounded-xl border border-neutral-800/50">
          <label className="block text-sm font-medium text-neutral-400 mb-2 flex items-center gap-2">
            <Store size={16} className="text-emerald-400" /> Sede Destino (Entra Mercancía)
          </label>
          <select 
            value={destinoId} 
            onChange={e => setDestinoId(e.target.value)}
            className="w-full h-14 bg-neutral-900 border border-neutral-800 text-white rounded-xl px-4 outline-none focus:border-emerald-500"
          >
            <option value="">Selecciona el destino...</option>
            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre_sede}</option>)}
          </select>
        </div>
      </div>

      {origenId && (
        <div className="space-y-4 mb-8">
          <h3 className="font-semibold text-white">1. Agregar Productos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-8 relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search size={18} className="text-neutral-500" />
              </div>
              <input
                type="text"
                placeholder="Buscar insumo en origen..."
                className="w-full h-14 bg-neutral-950 border border-neutral-800 text-white rounded-xl pl-10 pr-4 focus:outline-none focus:border-indigo-500"
                value={searchTerm}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsDropdownOpen(true);
                  setSelectedInsumo(null);
                }}
              />
              {isDropdownOpen && searchTerm && !selectedInsumo && (
                <div className="absolute z-10 w-full mt-2 bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                  {filteredInsumos.map(ins => (
                    <button
                      key={ins.id}
                      onClick={() => {
                        setSelectedInsumo(ins);
                        setSearchTerm(ins.nombre);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-neutral-700 transition-colors border-b border-neutral-700/50 flex justify-between items-center"
                    >
                      <span className="text-white">{ins.nombre}</span>
                      <span className="text-xs text-neutral-400 bg-neutral-900 px-2 py-1 rounded">Stock: {ins.cantidad_actual} {ins.unidad_medida}</span>
                    </button>
                  ))}
                  {filteredInsumos.length === 0 && (
                    <div className="px-4 py-3 text-neutral-500 text-sm text-center">No encontrado en esta sede.</div>
                  )}
                </div>
              )}
            </div>
            <div className="sm:col-span-4 flex gap-2">
              <input 
                type="number" 
                min="0.01" step="0.01"
                value={cantidadInput}
                onChange={e => setCantidadInput(e.target.value)}
                placeholder="Cantidad"
                className="w-full h-14 bg-neutral-950 border border-neutral-800 rounded-xl px-4 text-white outline-none focus:border-indigo-500"
              />
              <button 
                onClick={handleAddToCart}
                disabled={!selectedInsumo || !cantidadInput}
                className="bg-neutral-800 hover:bg-neutral-700 text-white w-14 h-14 flex items-center justify-center rounded-xl transition-colors disabled:opacity-50 shrink-0"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
          {errorMsg && <p className="text-rose-400 text-sm mt-1">{errorMsg}</p>}
        </div>
      )}

      {cart.length > 0 && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <ArrowRight className="text-indigo-400" size={18} /> Resumen del Traslado
          </h3>
          <div className="space-y-2 mb-6">
            {cart.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-neutral-900 border border-neutral-800 p-3 rounded-lg">
                <div>
                  <p className="text-white text-sm font-medium">{item.nombre}</p>
                  <p className="text-neutral-500 text-xs">{item.cantidad} {item.unidad_medida}</p>
                </div>
                <button onClick={() => removeFromCart(item.insumo_id)} className="text-rose-400 p-1.5 hover:bg-rose-500/20 rounded-md transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-neutral-400 mb-1">Notas (Opcional)</label>
            <input 
              type="text" 
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Ej. Traslado semanal de insumos"
              className="w-full h-14 bg-neutral-900 border border-neutral-800 rounded-xl px-4 text-white text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={handleDespachar}
            disabled={isSubmitting || !destinoId}
            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? 'Procesando...' : <><Send size={18} /> Confirmar Despacho</>}
          </button>
          
          {successMsg && <p className="text-emerald-400 text-sm mt-3 text-center bg-emerald-500/10 py-2 rounded-lg">{successMsg}</p>}
        </div>
      )}
    </div>
  );
}
