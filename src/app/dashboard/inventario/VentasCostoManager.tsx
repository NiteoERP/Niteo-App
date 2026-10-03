'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trash2, 
  Plus, 
  Search, 
  TrendingDown, 
  AlertTriangle, 
  Package, 
  DollarSign, 
  Calendar, 
  RotateCcw, 
  Loader2, 
  CheckCircle2, 
  X, 
  Info,
  Layers,
  ArrowDownCircle,
  FileSpreadsheet,
  UtensilsCrossed,
  ChefHat,
  Sparkles,
  ShoppingBag,
  BadgePercent,
  UserCircle
} from 'lucide-react';
import { 
  registrarVentaAlCostoMulti,
  getVentasCostoHistory,
  VentaCostoOperacion,
  VentaCostoItem
} from '@/actions/ventas-costo-actions';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface VentasCostoManagerProps {
  initialHistory: VentaCostoOperacion[];
  insumos: any[];
  empresaId: string;
  activeSedeId: string;
  canSeeCosts?: boolean;
}

export default function VentasCostoManager({
  initialHistory,
  insumos,
  empresaId,
  activeSedeId,
  canSeeCosts = true
}: VentasCostoManagerProps) {
  const [history, setHistory] = useState<VentaCostoOperacion[]>(initialHistory);
  
  // -- Venta al Costo CART --
  const [cartItems, setCartItems] = useState<(VentaCostoItem & { nombre: string; unidad: string; costo: number; stock: number; })[]>([]);
  const [beneficiario, setBeneficiario] = useState('');
  const [notas, setNotas] = useState('');
  
  // -- Add item to cart --
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [qtyToAdd, setQtyToAdd] = useState('');
  
  // -- Loading / Errors --
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Selectors
  const selectedInsumo = useMemo(() => insumos.find(i => i.id === selectedInsumoId), [insumos, selectedInsumoId]);

  const handleAddItem = () => {
    if (!selectedInsumo) return;
    const q = Number(qtyToAdd);
    if (!q || q <= 0) return;
    if (q > selectedInsumo.cantidad_actual) {
      setErrorMsg(`Cantidad máxima disponible: ${selectedInsumo.cantidad_actual}`);
      return;
    }

    const existing = cartItems.find(i => i.insumoId === selectedInsumo.id);
    if (existing) {
      if (existing.cantidad + q > selectedInsumo.cantidad_actual) {
        setErrorMsg(`La cantidad total excede el stock disponible`);
        return;
      }
      setCartItems(cartItems.map(i => i.insumoId === selectedInsumo.id ? { ...i, cantidad: i.cantidad + q } : i));
    } else {
      setCartItems([...cartItems, {
        insumoId: selectedInsumo.id,
        cantidad: q,
        nombre: selectedInsumo.nombre,
        unidad: selectedInsumo.unidad_medida,
        costo: selectedInsumo.costo_promedio || 0,
        stock: selectedInsumo.cantidad_actual
      }]);
    }

    setQtyToAdd('');
    setSelectedInsumoId('');
    setErrorMsg('');
  };

  const handleRemoveItem = (id: string) => {
    setCartItems(cartItems.filter(i => i.insumoId !== id));
  };

  const totalCostoCart = cartItems.reduce((acc, curr) => acc + (curr.cantidad * curr.costo), 0);

  const handleSubmit = async () => {
    if (cartItems.length === 0) {
      setErrorMsg('Debe agregar al menos un insumo.');
      return;
    }
    if (!beneficiario.trim()) {
      setErrorMsg('Debe especificar un nombre de beneficiario.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await registrarVentaAlCostoMulti(
      cartItems.map(i => ({ insumoId: i.insumoId, cantidad: i.cantidad })),
      beneficiario,
      notas,
      empresaId,
      activeSedeId
    );

    if (!res.success) {
      setErrorMsg(res.error || 'Error al procesar.');
      setIsSubmitting(false);
      return;
    }

    // Refresh history
    const updatedHistory = await getVentasCostoHistory(empresaId, activeSedeId);
    setHistory(updatedHistory);

    setSuccessMsg('Venta al costo registrada con éxito.');
    setCartItems([]);
    setBeneficiario('');
    setNotas('');
    setIsSubmitting(false);

    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* -------------------- IZQUIERDA: CREAR NUEVA VENTA -------------------- */}
      <div className="w-full xl:w-5/12 flex flex-col gap-4 shrink-0">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 md:p-6 shadow-xl sticky top-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <BadgePercent size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Nueva Venta al Costo</h2>
              <p className="text-xs text-neutral-400">Traspaso familiar o consumo</p>
            </div>
          </div>

          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl text-xs flex items-center gap-2 mb-4">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-xs flex items-center gap-2 mb-4">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* BENEFICIARIO & NOTAS */}
          <div className="flex flex-col gap-4 mb-6 pb-6 border-b border-neutral-800/50">
            <div>
              <label className="text-xs font-medium text-neutral-400 block mb-1.5 flex items-center gap-1.5">
                <UserCircle size={14} /> Beneficiario (Obligatorio)
              </label>
              <input
                type="text"
                value={beneficiario}
                onChange={e => setBeneficiario(e.target.value)}
                placeholder="Ej. Carlos Perez (Socio)"
                className="w-full bg-neutral-950/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-400 block mb-1.5">Notas (Opcional)</label>
              <input
                type="text"
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Ej. Descuento familiar"
                className="w-full bg-neutral-950/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* AGREGAR PRODUCTOS */}
          <div className="flex flex-col gap-3 mb-6">
            <h3 className="text-sm font-bold text-white">Agregar Insumos</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedInsumoId}
                onChange={(e) => setSelectedInsumoId(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="">Seleccionar insumo...</option>
                {insumos.map((i: any) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre} (Disp: {i.cantidad_actual} {i.unidad_medida})
                  </option>
                ))}
              </select>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={qtyToAdd}
                  onChange={(e) => setQtyToAdd(e.target.value)}
                  placeholder="Cant"
                  className="w-24 bg-neutral-950 border border-neutral-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleAddItem}
                  disabled={!selectedInsumoId || !qtyToAdd}
                  className="bg-neutral-800 text-white px-3 py-2.5 rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-50"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* CARRITO */}
          <div className="bg-neutral-950/40 rounded-2xl border border-neutral-800/60 p-4 mb-6">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Lista de Retiro</h3>
            
            {cartItems.length === 0 ? (
              <p className="text-xs text-neutral-600 text-center py-4">No hay insumos agregados.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">{item.nombre}</span>
                      <span className="text-[10px] text-neutral-500">{item.cantidad} {item.unidad} x ${(item.costo).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-indigo-400">${(item.cantidad * item.costo).toFixed(2)}</span>
                      <button onClick={() => handleRemoveItem(item.insumoId)} className="text-neutral-500 hover:text-rose-400 p-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-neutral-800/50">
                  <span className="text-sm text-neutral-400">Costo Total:</span>
                  <span className="text-lg font-bold text-white">${totalCostoCart.toFixed(2)} USD</span>
                </div>
              </div>
            )}
          </div>

          {/* BOTON GUARDAR */}
          <button
            onClick={handleSubmit}
            disabled={cartItems.length === 0 || isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <BadgePercent size={18} />}
            Procesar Venta al Costo
          </button>
        </div>
      </div>

      {/* -------------------- DERECHA: HISTORIAL -------------------- */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 md:p-6 shadow-xl flex-1 flex flex-col min-h-[500px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-indigo-400" />
                Historial de Ventas al Costo
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                {history.length} operaciones registradas
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-500 py-12">
                <ShoppingBag size={48} className="mb-4 text-neutral-800" strokeWidth={1} />
                <p>No hay ventas al costo registradas en esta sede.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {history.map((op) => (
                  <div key={op.operacionId} className="bg-neutral-950/40 border border-neutral-800/80 rounded-2xl p-4 hover:border-neutral-700/80 transition-colors">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-neutral-800/50">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-white">{op.beneficiario}</span>
                          <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {format(parseISO(op.fecha_operacion), 'dd MMM yyyy, HH:mm', { locale: es })}
                          </span>
                        </div>
                        {op.notas && (
                          <p className="text-xs text-neutral-500 italic flex items-center gap-1.5">
                            <Info size={12} /> {op.notas}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-neutral-500 mb-0.5">Costo Total Perdido</p>
                        <p className="text-base font-bold text-rose-400">${op.costo_total.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {op.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
                            <span className="text-neutral-300">{item.insumo_nombre}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs font-mono text-neutral-400">
                            <span>{item.cantidad} {item.unidad}</span>
                            <span className="w-16 text-right">${Number(item.costo || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-neutral-800/30 flex justify-between items-center">
                       <span className="text-[10px] text-neutral-500">Operador: {op.usuario_nombre}</span>
                       <span className="text-[10px] text-neutral-600 font-mono">ID: {op.operacionId.substring(0,8)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
