'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trash2, Plus, AlertTriangle, Loader2, CheckCircle2, X, Info,
  FileSpreadsheet, ShoppingBag, BadgePercent, UserCircle, ArrowRight, Package
} from 'lucide-react';
import { 
  registrarVentaAlCostoMulti,
  getVentasCostoHistory,
  VentaCostoOperacion,
  VentaCostoItem
} from '@/actions/ventas-costo-actions';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface VentaAlCostoSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  insumos: any[];
  empresaId: string;
  activeSedeId: string;
  onSuccess?: () => void;
}

export default function VentaAlCostoSlideOver({
  isOpen,
  onClose,
  insumos,
  empresaId,
  activeSedeId,
  onSuccess
}: VentaAlCostoSlideOverProps) {
  const [view, setView] = useState<'form' | 'history'>('form');
  const [history, setHistory] = useState<VentaCostoOperacion[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // -- Venta al Costo CART --
  const [cartItems, setCartItems] = useState<(VentaCostoItem & { nombre: string; unidad: string; costo: number; stock: number; })[]>([]);
  const [beneficiario, setBeneficiario] = useState('');
  const [notas, setNotas] = useState('');
  
  // -- Add item --
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [qtyToAdd, setQtyToAdd] = useState('');
  
  // -- Loading / Errors --
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen && view === 'history') {
      loadHistory();
    }
  }, [isOpen, view]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const hist = await getVentasCostoHistory(empresaId, activeSedeId);
      setHistory(hist);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

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
        setErrorMsg(`La cantidad total excede el stock`);
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
      setErrorMsg('Agregue al menos un insumo.'); return;
    }
    if (!beneficiario.trim()) {
      setErrorMsg('Especifique el beneficiario.'); return;
    }

    setIsSubmitting(true); setErrorMsg(''); setSuccessMsg('');

    const res = await registrarVentaAlCostoMulti(
      cartItems.map(i => ({ insumoId: i.insumoId, cantidad: i.cantidad })),
      beneficiario, notas, empresaId, activeSedeId
    );

    if (!res.success) {
      setErrorMsg(res.error || 'Error al procesar.');
      setIsSubmitting(false); return;
    }

    setSuccessMsg('Venta al costo procesada exitosamente.');
    setCartItems([]); setBeneficiario(''); setNotas('');
    setIsSubmitting(false);
    
    if (onSuccess) onSuccess();

    setTimeout(() => { setSuccessMsg(''); setView('history'); }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[120] flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-neutral-900 h-full shadow-2xl flex flex-col border-l border-neutral-800 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-inner">
              <BadgePercent size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Venta al Costo</h3>
              <p className="text-xs text-neutral-400">Traspaso familiar o consumo</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-2 rounded-xl hover:bg-neutral-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs inside SlideOver */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/30">
          <button 
            onClick={() => setView('form')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${view === 'form' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
          >
            Nueva Venta
          </button>
          <button 
            onClick={() => setView('history')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-2 ${view === 'history' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
          >
            Historial
          </button>
        </div>

        {view === 'form' ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
              
              {errorMsg && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Info */}
              <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-3.5 text-xs text-indigo-300/90 leading-relaxed">
                Esta operación deduce el insumo al <strong>costo promedio registrado</strong>, sincerando el inventario sin registrar ganancia.
              </div>

              {/* Datos Persona */}
              <div className="space-y-3 bg-neutral-950/50 p-4 rounded-2xl border border-neutral-800/60">
                <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <UserCircle size={14} className="text-indigo-400" /> 1. Datos de la persona
                </label>
                <div className="space-y-3">
                  <input
                    type="text" value={beneficiario} onChange={e => setBeneficiario(e.target.value)}
                    placeholder="Nombre del beneficiario (Ej. Socio, Carlos)"
                    className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text" value={notas} onChange={e => setNotas(e.target.value)}
                    placeholder="Notas o justificación (Opcional)"
                    className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Agregar Insumos */}
              <div className="space-y-3 bg-neutral-950/50 p-4 rounded-2xl border border-neutral-800/60">
                <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Package size={14} className="text-indigo-400" /> 2. Productos
                </label>
                <div className="flex flex-col gap-2">
                  <select
                    value={selectedInsumoId} onChange={e => setSelectedInsumoId(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Seleccionar producto...</option>
                    {insumos.map((i: any) => (
                      <option key={i.id} value={i.id}>
                        {i.nombre} ({i.cantidad_actual} {i.unidad_medida})
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="number" min="0" step="0.01" value={qtyToAdd} onChange={e => setQtyToAdd(e.target.value)}
                      placeholder="Cantidad"
                      className="w-28 bg-neutral-900 border border-neutral-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddItem} disabled={!selectedInsumoId || !qtyToAdd}
                      className="flex-1 bg-neutral-800 text-white px-3 py-2.5 rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <Plus size={16} /> Agregar al listado
                    </button>
                  </div>
                </div>
                
                {/* Cart list */}
                {cartItems.length > 0 && (
                  <div className="mt-4 border-t border-neutral-800/50 pt-4 space-y-2">
                    {cartItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-neutral-900 p-2.5 rounded-xl border border-neutral-800">
                        <div>
                          <p className="text-sm font-medium text-white">{item.nombre}</p>
                          <p className="text-[10px] text-neutral-500">{item.cantidad} {item.unidad} @ ${item.costo.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-indigo-400">${(item.cantidad * item.costo).toFixed(2)}</span>
                          <button type="button" onClick={() => handleRemoveItem(item.insumoId)} className="text-neutral-500 hover:text-rose-400"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center mt-2 px-1">
                      <span className="text-xs text-neutral-400">Total Costo:</span>
                      <span className="text-lg font-bold text-white">${totalCostoCart.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-neutral-800 bg-neutral-950/80 shrink-0">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={cartItems.length === 0 || isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-5 py-3.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <BadgePercent size={18} />}
                Procesar Venta al Costo
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden bg-neutral-950/20">
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {loadingHistory ? (
                <div className="flex justify-center items-center py-12"><Loader2 size={24} className="animate-spin text-neutral-600" /></div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center text-neutral-500 py-12">
                  <ShoppingBag size={32} className="mb-3 opacity-50" />
                  <p className="text-sm">No hay ventas al costo registradas.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map(op => (
                    <div key={op.operacionId} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-3 pb-3 border-b border-neutral-800/50">
                        <div>
                          <p className="text-sm font-bold text-white">{op.beneficiario}</p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">{format(parseISO(op.fecha_operacion), 'dd MMM yyyy, HH:mm', { locale: es })}</p>
                          {op.notas && <p className="text-xs text-neutral-500 mt-1 italic flex items-center gap-1"><Info size={12}/> {op.notas}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-rose-400">${op.costo_total.toFixed(2)}</p>
                          <p className="text-[10px] text-neutral-500">Operador: {op.usuario_nombre}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {op.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-neutral-400">
                            <span>- {item.insumo_nombre}</span>
                            <span className="font-mono">{item.cantidad} {item.unidad}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

