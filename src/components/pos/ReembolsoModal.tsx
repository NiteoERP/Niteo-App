import React, { useState, useMemo } from 'react';
import { X, Check, Undo2, CreditCard } from 'lucide-react';
const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' USD';

interface ItemReembolso {
  id_detalle: string;
  producto_id: string;
  nombre: string;
  cantidadOriginal: number;
  precio_unitario: number;
  cantidadDevolver: number;
}

export default function ReembolsoModal({ venta, metodosDisponibles, onClose, onConfirm }: {
  venta: any;
  metodosDisponibles: string[];
  onClose: () => void;
  onConfirm: (detalles: ItemReembolso[], metodoPago: string) => Promise<void>;
}) {
  const [items, setItems] = useState<ItemReembolso[]>(venta.detalles.map((d: any) => ({
    id_detalle: d.id_detalle,
    producto_id: d.producto_id,
    nombre: d.producto_nombre || d.productos?.nombre || 'Producto',
    cantidadOriginal: d.cantidad,
    precio_unitario: d.precio_unitario,
    cantidadDevolver: d.cantidad // por defecto, devolvemos todo
  })));
  
  const [metodoPago, setMetodoPago] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalReembolso = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.cantidadDevolver * it.precio_unitario), 0);
  }, [items]);

  const toggleItem = (id_detalle: string) => {
    setItems(prev => prev.map(it => {
      if (it.id_detalle === id_detalle) {
        return { ...it, cantidadDevolver: it.cantidadDevolver > 0 ? 0 : it.cantidadOriginal };
      }
      return it;
    }));
  };

  const handleConfirm = async () => {
    if (totalReembolso === 0) return alert('Seleccione al menos un artculo para reembolsar.');
    if (!metodoPago) return alert('Seleccione un mtodo de pago para el reembolso.');
    
    setIsSubmitting(true);
    try {
      await onConfirm(items.filter(i => i.cantidadDevolver > 0), metodoPago);
    } catch (e: any) {
      alert(e.message || 'Error al procesar reembolso');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-neutral-800 rounded-2xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Sidebar Izquierda - Artculos */}
        <div className="w-full md:w-1/3 bg-[#111] border-r border-neutral-800 flex flex-col h-[500px]">
          <div className="p-4 border-b border-neutral-800">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Artculos de Reembolso</h3>
            <button 
              className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5"
              onClick={() => setItems(prev => prev.map(i => ({ ...i, cantidadDevolver: prev.some(x => x.cantidadDevolver === 0) ? i.cantidadOriginal : 0 })))}
            >
              <Check size={14} /> Seleccionar / Deseleccionar todo
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {items.map(it => {
              const selected = it.cantidadDevolver > 0;
              return (
                <div 
                  key={it.id_detalle}
                  onClick={() => toggleItem(it.id_detalle)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${selected ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'}`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${selected ? 'bg-emerald-500 text-white' : 'bg-neutral-800 border border-neutral-700'}`}>
                    {selected && <Check size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${selected ? 'text-emerald-400' : 'text-neutral-400'}`}>{it.nombre}</p>
                    <p className="text-xs text-neutral-500">{it.cantidadOriginal} x {formatCurrency(it.precio_unitario)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono text-sm ${selected ? 'text-emerald-300' : 'text-neutral-500'}`}>{formatCurrency(it.cantidadOriginal * it.precio_unitario)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-black/40 border-t border-neutral-800">
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest text-center mb-1">CANTIDAD TOTAL DE REEMBOLSO</p>
            <p className="text-3xl font-black text-rose-500 text-center text-shadow-sm shadow-rose-500/20">
              -{formatCurrency(totalReembolso)}
            </p>
          </div>
        </div>

        {/* rea Principal Derecha */}
        <div className="w-full md:w-2/3 flex flex-col bg-[#1A1A1A] h-[500px]">
          <div className="flex justify-end p-2 border-b border-neutral-800/50">
            <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 p-6 md:p-10 flex flex-col">
            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-neutral-900 border border-neutral-800 rounded-2xl mx-auto flex items-center justify-center mb-4">
                <Undo2 size={32} className="text-neutral-400" />
              </div>
              <p className="text-neutral-300 font-medium">Confirme los detalles del reembolso para el recibo</p>
              <div className="mt-4 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-2xl font-mono font-bold py-3 px-8 rounded-xl inline-block">
                {venta.numero_documento || venta.id?.slice(0,8).toUpperCase()}
              </div>
            </div>

            <div className="flex-1">
              <p className="text-center text-sm font-bold text-neutral-500 uppercase tracking-wider mb-4">Tipo de pago de reembolso</p>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {metodosDisponibles.map(m => (
                  <button
                    key={m}
                    onClick={() => setMetodoPago(m)}
                    className={`h-12 rounded-xl text-xs font-bold transition-all border ${metodoPago === m ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button 
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl font-bold text-sm bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirm}
                disabled={isSubmitting || totalReembolso === 0 || !metodoPago}
                className="px-8 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
              >
                {isSubmitting ? 'Procesando...' : <><Check size={18} /> Procesar Reembolso</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
