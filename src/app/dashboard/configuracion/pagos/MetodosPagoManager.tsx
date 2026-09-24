'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { updateEmpresaSaaS } from '../actions';
import { 
  getComprasMetodosPago, 
  addCompraMetodoPago, 
  deleteCompraMetodoPago 
} from '@/actions/compras-actions';
import { 
  Banknote, 
  Smartphone, 
  Zap, 
  CreditCard, 
  Coins, 
  Building2, 
  Handshake, 
  Gift, 
  Wallet, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Check, 
  Loader2, 
  AlertCircle, 
  Info, 
  Sparkles,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface MetodosPagoManagerProps {
  empresaId: string;
  initialMetodosVenta: string[];
}

// Preset popular suggestions for sales
const POPULAR_VENTAS_PRESETS = [
  { name: 'Efectivo USD', category: 'Efectivo', desc: 'Dólares en efectivo' },
  { name: 'Efectivo Bs', category: 'Efectivo', desc: 'Bolívares en efectivo' },
  { name: 'Pago Móvil', category: 'Móvil / P2P', desc: 'Cobro interbancario móvil' },
  { name: 'Punto de Venta', category: 'Tarjeta', desc: 'Tarjetas de débito y crédito' },
  { name: 'Zelle', category: 'Móvil / P2P', desc: 'Transferencias en dólares USA' },
  { name: 'Transferencia Bancaria', category: 'Bancario', desc: 'Transferencia cuenta a cuenta' },
  { name: 'Binance Pay (USDT)', category: 'Cripto', desc: 'Criptoactivos y USDT' },
  { name: 'Zinli', category: 'Billetera', desc: 'Billetera digital prepagada' },
  { name: 'Crédito', category: 'Crédito', desc: 'Cuentas por cobrar a clientes' },
  { name: 'Efectivo COP', category: 'Efectivo', desc: 'Pesos colombianos en efectivo' },
  { name: 'Efectivo EUR', category: 'Efectivo', desc: 'Euros en efectivo' },
  { name: 'PayPal', category: 'Billetera', desc: 'Pasarela internacional' },
];

// Preset popular suggestions for supplier purchases
const POPULAR_COMPRAS_PRESETS = [
  { name: 'Transferencia Bancaria', category: 'Bancario', desc: 'Transferencia directa al proveedor' },
  { name: 'Pago Móvil', category: 'Móvil / P2P', desc: 'Pago rápido interbancario' },
  { name: 'Efectivo USD', category: 'Efectivo', desc: 'Divisa en efectivo contra entrega' },
  { name: 'Efectivo Bs', category: 'Efectivo', desc: 'Moneda nacional en efectivo' },
  { name: 'Zelle', category: 'Móvil / P2P', desc: 'Transferencia en dólares a proveedor' },
  { name: 'Crédito Proveedor', category: 'Crédito', desc: 'Factura pagadera a plazo' },
  { name: 'Binance Pay', category: 'Cripto', desc: 'Pago en stablecoin USDT' },
  { name: 'Cheque', category: 'Bancario', desc: 'Cheque corporativo' },
];

function getMethodMeta(name: string) {
  const norm = name.toLowerCase().trim();

  if (norm.includes('cortes') || norm.includes('regal')) {
    return {
      icon: Gift,
      category: 'Bonificado',
      badge: 'Cortesía 100%',
      borderClass: 'border-amber-500/30 bg-amber-500/[0.04]',
      iconClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      tagClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    };
  }
  if (norm.includes('efectivo') || norm.includes('cash') || norm.includes('billete')) {
    return {
      icon: Banknote,
      category: 'Efectivo',
      badge: norm.includes('bs') ? 'Bolívares' : norm.includes('usd') || norm.includes('$') ? 'Dólares' : 'Efectivo',
      borderClass: 'border-emerald-500/25 bg-emerald-500/[0.03]',
      iconClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      tagClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    };
  }
  if (norm.includes('pago movil') || norm.includes('pago móvil') || norm.includes('nequi') || norm.includes('bizum') || norm.includes('pix')) {
    return {
      icon: Smartphone,
      category: 'Móvil / P2P',
      badge: 'Inmediato',
      borderClass: 'border-cyan-500/25 bg-cyan-500/[0.03]',
      iconClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
      tagClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    };
  }
  if (norm.includes('zelle')) {
    return {
      icon: Zap,
      category: 'Transferencia USA',
      badge: 'USD',
      borderClass: 'border-purple-500/25 bg-purple-500/[0.03]',
      iconClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      tagClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    };
  }
  if (norm.includes('punto') || norm.includes('pos') || norm.includes('debito') || norm.includes('débito') || norm.includes('tarjeta')) {
    return {
      icon: CreditCard,
      category: 'Tarjeta / POS',
      badge: 'Terminal',
      borderClass: 'border-blue-500/25 bg-blue-500/[0.03]',
      iconClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      tagClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    };
  }
  if (norm.includes('binance') || norm.includes('usdt') || norm.includes('cripto') || norm.includes('crypto') || norm.includes('zinli') || norm.includes('paypal')) {
    return {
      icon: Coins,
      category: 'Billetera Digital',
      badge: 'Digital',
      borderClass: 'border-yellow-500/25 bg-yellow-500/[0.03]',
      iconClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
      tagClass: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
    };
  }
  if (norm.includes('transferencia') || norm.includes('banco') || norm.includes('cheque')) {
    return {
      icon: Building2,
      category: 'Bancario',
      badge: 'Transferencia',
      borderClass: 'border-sky-500/25 bg-sky-500/[0.03]',
      iconClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      tagClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    };
  }
  if (norm.includes('crédito') || norm.includes('credito') || norm.includes('fiado')) {
    return {
      icon: Handshake,
      category: 'Financiamiento',
      badge: 'A Plazo',
      borderClass: 'border-rose-500/25 bg-rose-500/[0.03]',
      iconClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      tagClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    };
  }

  return {
    icon: Wallet,
    category: 'Otro Método',
    badge: 'Cobro',
    borderClass: 'border-neutral-800 bg-neutral-900/50',
    iconClass: 'bg-neutral-800 text-neutral-300 border-neutral-700',
    tagClass: 'bg-neutral-800 text-neutral-300 border-neutral-700',
  };
}

export default function MetodosPagoManager({ empresaId, initialMetodosVenta }: MetodosPagoManagerProps) {
  const [activeTab, setActiveTab] = useState<'ventas' | 'compras'>('ventas');

  // Estado Métodos de Venta
  const hasCortesia = initialMetodosVenta.some(m => m.toLowerCase().includes('cortes'));
  const standardizedVentas = hasCortesia ? initialMetodosVenta : [...initialMetodosVenta, 'Cortesía'];
  const [metodosVentas, setMetodosVentas] = useState<string[]>(standardizedVentas);
  const [customVenta, setCustomVenta] = useState('');
  const [isPendingVentas, startTransitionVentas] = useTransition();
  const [feedbackVentas, setFeedbackVentas] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Estado Métodos de Compras
  const [metodosCompras, setMetodosCompras] = useState<any[]>([]);
  const [loadingCompras, setLoadingCompras] = useState(true);
  const [customCompra, setCustomCompra] = useState('');
  const [isAddingCompra, setIsAddingCompra] = useState(false);
  const [feedbackCompras, setFeedbackCompras] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    cargarCompras();
  }, []);

  const cargarCompras = async () => {
    setLoadingCompras(true);
    const res = await getComprasMetodosPago();
    if (res.success && res.data) {
      setMetodosCompras(res.data);
    }
    setLoadingCompras(false);
  };

  // --- Handlers Ventas ---
  const agregarMetodoVenta = (nombre: string) => {
    const val = nombre.trim();
    if (!val) return;
    if (metodosVentas.some(m => m.toLowerCase() === val.toLowerCase())) {
      setFeedbackVentas({ type: 'error', message: `"${val}" ya está en la lista de cobros.` });
      setTimeout(() => setFeedbackVentas(null), 3000);
      return;
    }
    setMetodosVentas([...metodosVentas, val]);
    setCustomVenta('');
  };

  const eliminarMetodoVenta = (index: number) => {
    setMetodosVentas(metodosVentas.filter((_, i) => i !== index));
  };

  const moverMetodoVenta = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= metodosVentas.length) return;
    const nuevoOrden = [...metodosVentas];
    const [movido] = nuevoOrden.splice(index, 1);
    nuevoOrden.splice(targetIndex, 0, movido);
    setMetodosVentas(nuevoOrden);
  };

  const guardarMetodosVentas = () => {
    setFeedbackVentas(null);
    startTransitionVentas(async () => {
      const res = await updateEmpresaSaaS(empresaId, {
        metodos_pago: metodosVentas,
      });
      if (res.success) {
        setFeedbackVentas({ type: 'success', message: 'Métodos de cobro actualizados correctamente.' });
        setTimeout(() => setFeedbackVentas(null), 3500);
      } else {
        setFeedbackVentas({ type: 'error', message: res.error || 'Error al guardar.' });
      }
    });
  };

  // --- Handlers Compras ---
  const agregarMetodoCompra = async (nombre: string) => {
    const val = nombre.trim();
    if (!val) return;
    if (metodosCompras.some(m => m.nombre.toLowerCase() === val.toLowerCase())) {
      setFeedbackCompras({ type: 'error', message: `"${val}" ya está registrado en compras.` });
      setTimeout(() => setFeedbackCompras(null), 3000);
      return;
    }

    setIsAddingCompra(true);
    setFeedbackCompras(null);
    const res = await addCompraMetodoPago(val);
    setIsAddingCompra(false);

    if (res.success) {
      setCustomCompra('');
      await cargarCompras();
      setFeedbackCompras({ type: 'success', message: `"${val}" añadido para pagos a proveedores.` });
      setTimeout(() => setFeedbackCompras(null), 3500);
    } else {
      setFeedbackCompras({ type: 'error', message: res.error || 'Error al añadir.' });
    }
  };

  const eliminarMetodoCompra = async (id: string, nombre: string) => {
    const res = await deleteCompraMetodoPago(id);
    if (res.success) {
      await cargarCompras();
      setFeedbackCompras({ type: 'success', message: `Método "${nombre}" desactivado.` });
      setTimeout(() => setFeedbackCompras(null), 3000);
    } else {
      setFeedbackCompras({ type: 'error', message: res.error || 'Error al eliminar.' });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Pestañas Segmentadas Superiores */}
      <div className="flex bg-neutral-950/80 p-1.5 rounded-2xl border border-neutral-800/80 max-w-xl">
        <button
          type="button"
          onClick={() => setActiveTab('ventas')}
          className={`flex-1 flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'ventas'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
          }`}
        >
          <CreditCard size={15} />
          <span>Cobros en Ventas & POS</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
            activeTab === 'ventas' ? 'bg-white/20 text-white' : 'bg-neutral-800 text-neutral-400'
          }`}>
            {metodosVentas.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('compras')}
          className={`flex-1 flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'compras'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
          }`}
        >
          <ShoppingBag size={15} />
          <span>Pagos a Proveedores (Compras)</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
            activeTab === 'compras' ? 'bg-white/20 text-white' : 'bg-neutral-800 text-neutral-400'
          }`}>
            {metodosCompras.length}
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* PESTAÑA 1: COBROS EN VENTAS & POS */}
      {/* ============================================================== */}
      {activeTab === 'ventas' && (
        <div className="space-y-6">
          {/* Feedback */}
          {feedbackVentas && (
            <div className={`p-4 rounded-xl text-xs flex items-center gap-3 animate-in fade-in border ${
              feedbackVentas.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {feedbackVentas.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{feedbackVentas.message}</span>
            </div>
          )}

          {/* Bloque 1: Tarjetas de Métodos Activos con Reordenamiento */}
          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/60 pb-4">
              <div>
                <h3 className="text-base font-semibold text-white">Métodos de Cobro Habilitados</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Aparecen en el terminal POS y facturación. Usa las flechas para ordenar su prioridad de aparición.
                </p>
              </div>
              <div className="text-xs text-neutral-500 font-medium shrink-0">
                {metodosVentas.length} vías activas
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {metodosVentas.map((metodo, idx) => {
                const meta = getMethodMeta(metodo);
                const Icon = meta.icon;
                const isCortesia = metodo.toLowerCase().includes('cortes') || metodo.toLowerCase().includes('regal');

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${meta.borderClass}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${meta.iconClass}`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-white text-sm truncate">{metodo}</span>
                        </div>
                        <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider mt-0.5 ${meta.tagClass}`}>
                          {meta.badge}
                        </span>
                      </div>
                    </div>

                    {/* Acciones de Orden y Eliminación */}
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => moverMetodoVenta(idx, 'up')}
                        disabled={idx === 0}
                        title="Subir posición"
                        className="p-1 text-neutral-400 hover:text-white disabled:opacity-20 hover:bg-neutral-800 rounded transition-colors"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moverMetodoVenta(idx, 'down')}
                        disabled={idx === metodosVentas.length - 1}
                        title="Bajar posición"
                        className="p-1 text-neutral-400 hover:text-white disabled:opacity-20 hover:bg-neutral-800 rounded transition-colors"
                      >
                        <ChevronDown size={16} />
                      </button>

                      {isCortesia ? (
                        <div className="p-1 text-amber-400" title="Método fijo para auditar mermas y regalías">
                          <ShieldCheck size={16} />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => eliminarMetodoVenta(idx)}
                          title="Eliminar de ventas"
                          className="p-1 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Aviso informativo de Cortesía */}
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
              <Gift className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-neutral-400 leading-relaxed">
                <span className="font-semibold text-amber-300">Auditoría fija: </span>
                El método <strong>Cortesía</strong> está activo por diseño. No genera dinero en efectivo en cierres de caja, sino que registra las salidas bonificadas para control de mermas y consumo de cortesía.
              </div>
            </div>
          </div>

          {/* Bloque 2: Catálogo de Métodos Frecuentes (1-Clic) */}
          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-800/60 pb-3">
              <Sparkles size={16} className="text-indigo-400" />
              <div>
                <h4 className="text-sm font-semibold text-white">Catálogo de Métodos Populares</h4>
                <p className="text-[11px] text-neutral-400">Pulsa para añadir cualquiera de estos métodos frecuentes al instante.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {POPULAR_VENTAS_PRESETS.map((preset) => {
                const isActive = metodosVentas.some(m => m.toLowerCase() === preset.name.toLowerCase());
                const meta = getMethodMeta(preset.name);
                const Icon = meta.icon;

                return (
                  <div
                    key={preset.name}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                      isActive 
                        ? 'bg-neutral-900/40 border-neutral-800/60 opacity-60' 
                        : 'bg-neutral-900/90 hover:bg-neutral-800/80 border-neutral-800 hover:border-indigo-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${meta.iconClass}`}>
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{preset.name}</p>
                        <p className="text-[10px] text-neutral-500 truncate">{preset.category}</p>
                      </div>
                    </div>

                    {isActive ? (
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 shrink-0 ml-1">
                        <Check size={12} /> Activo
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => agregarMetodoVenta(preset.name)}
                        className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-500/20 transition-all shrink-0 ml-1"
                      >
                        + Agregar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bloque 3: Formulario para Método Personalizado */}
          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-white">¿Tienes otro método personalizado?</h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Crea cualquier método propio de tu negocio (ej. Vales de Alimentación, Cashea, Gift Card, Cheques...).
              </p>
            </div>

            <div className="flex items-center gap-2 max-w-lg">
              <input
                type="text"
                placeholder="Nombre del nuevo método..."
                value={customVenta}
                onChange={(e) => setCustomVenta(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    agregarMetodoVenta(customVenta);
                  }
                }}
                className="flex-1 bg-neutral-900 border border-neutral-800 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => agregarMetodoVenta(customVenta)}
                disabled={!customVenta.trim()}
                className="flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-neutral-700 transition-all"
              >
                <Plus size={14} />
                <span>Añadir</span>
              </button>
            </div>
          </div>

          {/* Botón Guardar Cambios */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-neutral-500">
              Recuerda guardar para aplicar el nuevo orden o métodos en tu terminal POS.
            </p>
            <button
              type="button"
              disabled={isPendingVentas}
              onClick={guardarMetodosVentas}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20"
            >
              {isPendingVentas ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Guardar Métodos de Venta</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA 2: PAGOS A PROVEEDORES (COMPRAS) */}
      {/* ============================================================== */}
      {activeTab === 'compras' && (
        <div className="space-y-6">
          {/* Feedback */}
          {feedbackCompras && (
            <div className={`p-4 rounded-xl text-xs flex items-center gap-3 animate-in fade-in border ${
              feedbackCompras.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {feedbackCompras.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{feedbackCompras.message}</span>
            </div>
          )}

          {/* Bloque 1: Tarjetas de Métodos Activos de Compra */}
          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/60 pb-4">
              <div>
                <h3 className="text-base font-semibold text-white">Métodos de Pago a Proveedores</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Vías de pago disponibles al asentar facturas y gastos de compra de mercancía.
                </p>
              </div>
              <div className="text-xs text-neutral-500 font-medium shrink-0">
                {metodosCompras.length} métodos registrados
              </div>
            </div>

            {loadingCompras ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            ) : metodosCompras.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-neutral-800 rounded-xl">
                <p className="text-neutral-400 text-sm">No tienes métodos de compra registrados.</p>
                <p className="text-neutral-600 text-xs mt-1">
                  Usa las sugerencias de abajo para añadir los medios con los que pagas a tus proveedores.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {metodosCompras.map((m) => {
                  const meta = getMethodMeta(m.nombre);
                  const Icon = meta.icon;

                  return (
                    <div
                      key={m.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${meta.borderClass}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${meta.iconClass}`}>
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white text-sm truncate">{m.nombre}</p>
                          <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider mt-0.5 ${meta.tagClass}`}>
                            {meta.badge}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => eliminarMetodoCompra(m.id, m.nombre)}
                        title="Desactivar método"
                        className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors ml-2 shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bloque 2: Catálogo de Métodos Populares para Compras */}
          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-800/60 pb-3">
              <Sparkles size={16} className="text-indigo-400" />
              <div>
                <h4 className="text-sm font-semibold text-white">Métodos de Pago Frecuentes a Proveedores</h4>
                <p className="text-[11px] text-neutral-400">Añade con un clic las formas comunes de pago a distribuidores.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {POPULAR_COMPRAS_PRESETS.map((preset) => {
                const isActive = metodosCompras.some(m => m.nombre.toLowerCase() === preset.name.toLowerCase());
                const meta = getMethodMeta(preset.name);
                const Icon = meta.icon;

                return (
                  <div
                    key={preset.name}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                      isActive 
                        ? 'bg-neutral-900/40 border-neutral-800/60 opacity-60' 
                        : 'bg-neutral-900/90 hover:bg-neutral-800/80 border-neutral-800 hover:border-indigo-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${meta.iconClass}`}>
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{preset.name}</p>
                        <p className="text-[10px] text-neutral-500 truncate">{preset.category}</p>
                      </div>
                    </div>

                    {isActive ? (
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 shrink-0 ml-1">
                        <Check size={12} /> Activo
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isAddingCompra}
                        onClick={() => agregarMetodoCompra(preset.name)}
                        className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-500/20 transition-all shrink-0 ml-1"
                      >
                        + Agregar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bloque 3: Formulario para Método de Compra Personalizado */}
          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-white">Añadir otro método de compra</h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Ingresa cualquier modalidad o cuenta específica acordada con tus proveedores.
              </p>
            </div>

            <div className="flex items-center gap-2 max-w-lg">
              <input
                type="text"
                placeholder="Ej. Cheque a 30 días, Cuenta Banesco Panamá..."
                value={customCompra}
                onChange={(e) => setCustomCompra(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    agregarMetodoCompra(customCompra);
                  }
                }}
                className="flex-1 bg-neutral-900 border border-neutral-800 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => agregarMetodoCompra(customCompra)}
                disabled={isAddingCompra || !customCompra.trim()}
                className="flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-neutral-700 transition-all"
              >
                {isAddingCompra ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                <span>Añadir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
