'use client';

import React, { useState, useTransition, useEffect, useMemo } from 'react';
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
  Sparkles,
  ShoppingBag,
  CheckCircle2,
  X,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface MetodosPagoManagerProps {
  empresaId: string;
  initialMetodosVenta: string[];
}

// Preset popular suggestions for sales with clear display names and currency indicators
const POPULAR_VENTAS_PRESETS = [
  { 
    name: 'Efectivo USD', 
    displayName: 'Efectivo en Dólares ($)', 
    category: 'Efectivo Divisa', 
    desc: 'Billetes físicos en dólares (USD $)',
    badge: 'USD $',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  },
  { 
    name: 'Efectivo Bs', 
    displayName: 'Efectivo en Bolívares (Bs)', 
    category: 'Efectivo Nacional', 
    desc: 'Billetes físicos en moneda nacional (Bs)',
    badge: 'Bs VES',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30'
  },
  { 
    name: 'Pago Móvil', 
    displayName: 'Pago Móvil Interbancario', 
    category: 'Móvil / P2P', 
    desc: 'Cobro interbancario inmediato (Bs)',
    badge: 'P2P / C2P',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
  },
  { 
    name: 'Punto de Venta', 
    displayName: 'Punto de Venta (POS)', 
    category: 'Tarjetas', 
    desc: 'Tarjetas de débito y crédito nacionales/int.',
    badge: 'Terminal POS',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30'
  },
  { 
    name: 'Zelle', 
    displayName: 'Zelle (Dólares USA)', 
    category: 'Transferencia USA', 
    desc: 'Transferencias directas en USA (USD)',
    badge: 'Zelle USD',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30'
  },
  { 
    name: 'Transferencia Bancaria', 
    displayName: 'Transferencia Bancaria', 
    category: 'Bancario', 
    desc: 'Transferencia directa entre cuentas',
    badge: 'Banco',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30'
  },
  { 
    name: 'Binance Pay (USDT)', 
    displayName: 'Binance Pay (USDT)', 
    category: 'Criptoactivos', 
    desc: 'Cobro con criptoactivos y stablecoins',
    badge: 'USDT Cripto',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  },
  { 
    name: 'Zinli', 
    displayName: 'Billetera Zinli', 
    category: 'Billetera Digital', 
    desc: 'Billetera prepagada internacional en USD',
    badge: 'Billetera USD',
    badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-500/30'
  },
  { 
    name: 'Crédito', 
    displayName: 'Crédito a Clientes', 
    category: 'Financiamiento', 
    desc: 'Cuentas por cobrar / fiado',
    badge: 'A Plazo',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30'
  },
  { 
    name: 'Efectivo COP', 
    displayName: 'Efectivo en Pesos (COP)', 
    category: 'Efectivo Divisa', 
    desc: 'Pesos colombianos en efectivo físico',
    badge: 'COP $',
    badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/30'
  },
  { 
    name: 'Efectivo EUR', 
    displayName: 'Efectivo en Euros (€)', 
    category: 'Efectivo Divisa', 
    desc: 'Billetes físicos en euros europeos (€)',
    badge: 'EUR €',
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
  },
  { 
    name: 'PayPal', 
    displayName: 'PayPal', 
    category: 'Pasarela Digital', 
    desc: 'Pagos y cobros internacionales en USD',
    badge: 'Digital USD',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30'
  },
  { 
    name: 'Cortesía', 
    displayName: 'Cortesía (Consumos / Regalías)', 
    category: 'Bonificado', 
    desc: 'Salidas bonificadas 100% y control de mermas',
    badge: 'Cortesía',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  },
];

// Preset popular suggestions for supplier purchases
const POPULAR_COMPRAS_PRESETS = [
  { 
    name: 'Transferencia Bancaria', 
    displayName: 'Transferencia Bancaria', 
    category: 'Bancario', 
    desc: 'Transferencia directa al proveedor',
    badge: 'Banco' 
  },
  { 
    name: 'Pago Móvil', 
    displayName: 'Pago Móvil Interbancario', 
    category: 'Móvil / P2P', 
    desc: 'Pago rápido interbancario en Bs',
    badge: 'P2P / Bs' 
  },
  { 
    name: 'Efectivo USD', 
    displayName: 'Efectivo en Dólares (USD)', 
    category: 'Efectivo Divisa', 
    desc: 'Divisa en efectivo contra entrega',
    badge: 'USD $' 
  },
  { 
    name: 'Efectivo Bs', 
    displayName: 'Efectivo en Bolívares (Bs)', 
    category: 'Efectivo Nacional', 
    desc: 'Moneda nacional en efectivo',
    badge: 'Bs VES' 
  },
  { 
    name: 'Zelle', 
    displayName: 'Zelle (Dólares USA)', 
    category: 'Transferencia USA', 
    desc: 'Transferencia en dólares a proveedor',
    badge: 'Zelle USD' 
  },
  { 
    name: 'Crédito Proveedor', 
    displayName: 'Crédito Proveedor', 
    category: 'Financiamiento', 
    desc: 'Factura pagadera a plazo / cuenta por pagar',
    badge: 'A Plazo' 
  },
  { 
    name: 'Binance Pay', 
    displayName: 'Binance Pay (USDT)', 
    category: 'Criptoactivos', 
    desc: 'Pago a proveedor en stablecoin USDT',
    badge: 'USDT' 
  },
  { 
    name: 'Cheque', 
    displayName: 'Cheque Bancario', 
    category: 'Bancario', 
    desc: 'Cheque corporativo emitido al proveedor',
    badge: 'Cheque' 
  },
];

// Helper to determine meta styling, currency and visual badges
function getMethodMeta(name: string) {
  const norm = name.toLowerCase().trim();

  // Cortesía
  if (norm.includes('cortes') || norm.includes('regal')) {
    return {
      icon: Gift,
      category: 'Bonificado',
      desc: 'Salidas bonificadas y control de mermas',
      badge: 'Cortesía 100%',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      borderClass: 'border-amber-500/30 bg-amber-500/[0.04]',
      iconClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    };
  }

  // Efectivo Bolívares
  if ((norm.includes('efectivo') || norm.includes('cash')) && (norm.includes('bs') || norm.includes('boliv') || norm.includes('ves'))) {
    return {
      icon: Banknote,
      category: 'Efectivo Nacional',
      desc: 'Billetes físicos en moneda nacional (Bs)',
      badge: 'Bolívares (Bs)',
      badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
      borderClass: 'border-sky-500/25 bg-sky-500/[0.03]',
      iconClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    };
  }

  // Efectivo Pesos COP
  if ((norm.includes('efectivo') || norm.includes('cash')) && (norm.includes('cop') || norm.includes('peso'))) {
    return {
      icon: Banknote,
      category: 'Efectivo Divisa',
      desc: 'Pesos colombianos en efectivo físico',
      badge: 'Pesos (COP)',
      badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
      borderClass: 'border-orange-500/25 bg-orange-500/[0.03]',
      iconClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    };
  }

  // Efectivo Euros EUR
  if ((norm.includes('efectivo') || norm.includes('cash')) && (norm.includes('eur') || norm.includes('euro') || norm.includes('€'))) {
    return {
      icon: Banknote,
      category: 'Efectivo Divisa',
      desc: 'Billetes físicos en euros europeos (€)',
      badge: 'Euros (€)',
      badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
      borderClass: 'border-indigo-500/25 bg-indigo-500/[0.03]',
      iconClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    };
  }

  // Efectivo Dólares USD
  if (norm.includes('efectivo') || norm.includes('cash')) {
    return {
      icon: Banknote,
      category: 'Efectivo Divisa',
      desc: 'Billetes físicos en dólares (USD $)',
      badge: 'Dólares ($)',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      borderClass: 'border-emerald-500/25 bg-emerald-500/[0.03]',
      iconClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    };
  }

  // Pago Móvil
  if (norm.includes('pago movil') || norm.includes('pago móvil') || norm.includes('nequi') || norm.includes('bizum') || norm.includes('pix')) {
    return {
      icon: Smartphone,
      category: 'Móvil / P2P',
      desc: 'Cobro interbancario inmediato (Bs)',
      badge: 'Pago Móvil (Bs)',
      badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
      borderClass: 'border-cyan-500/25 bg-cyan-500/[0.03]',
      iconClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    };
  }

  // Zelle
  if (norm.includes('zelle')) {
    return {
      icon: Zap,
      category: 'Transferencia USA',
      desc: 'Transferencias directas en USA (USD)',
      badge: 'Zelle (USD)',
      badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      borderClass: 'border-purple-500/25 bg-purple-500/[0.03]',
      iconClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    };
  }

  // Punto de Venta / POS
  if (norm.includes('punto') || norm.includes('pos') || norm.includes('debito') || norm.includes('débito') || norm.includes('tarjeta')) {
    return {
      icon: CreditCard,
      category: 'Tarjeta / POS',
      desc: 'Tarjetas de débito y crédito',
      badge: 'Terminal POS',
      badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      borderClass: 'border-blue-500/25 bg-blue-500/[0.03]',
      iconClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    };
  }

  // Binance / Cripto
  if (norm.includes('binance') || norm.includes('usdt') || norm.includes('cripto') || norm.includes('crypto')) {
    return {
      icon: Coins,
      category: 'Criptoactivos',
      desc: 'Cobro con criptoactivos y stablecoins',
      badge: 'Binance (USDT)',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      borderClass: 'border-amber-500/25 bg-amber-500/[0.03]',
      iconClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    };
  }

  // Billeteras digitales
  if (norm.includes('zinli') || norm.includes('paypal') || norm.includes('wally')) {
    return {
      icon: Wallet,
      category: 'Billetera Digital',
      desc: 'Billetera prepagada internacional',
      badge: 'Billetera Digital',
      badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
      borderClass: 'border-teal-500/25 bg-teal-500/[0.03]',
      iconClass: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    };
  }

  // Transferencia bancaria
  if (norm.includes('transferencia') || norm.includes('banco') || norm.includes('cheque')) {
    const isBs = norm.includes('bs') || norm.includes('ves') || norm.includes('nacional');
    return {
      icon: Building2,
      category: 'Bancario',
      desc: isBs ? 'Transferencia nacional en Bolívares' : 'Transferencia entre cuentas bancarias',
      badge: isBs ? 'Transferencia (Bs)' : 'Transferencia Bancaria',
      badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
      borderClass: 'border-sky-500/25 bg-sky-500/[0.03]',
      iconClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    };
  }

  // Crédito / Fiado
  if (norm.includes('crédito') || norm.includes('credito') || norm.includes('fiado')) {
    return {
      icon: Handshake,
      category: 'Financiamiento',
      desc: 'Cuentas por cobrar a clientes (fiado)',
      badge: 'Crédito a Clientes',
      badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      borderClass: 'border-rose-500/25 bg-rose-500/[0.03]',
      iconClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    };
  }

  return {
    icon: Wallet,
    category: 'Personalizado',
    desc: 'Método de cobro personalizado',
    badge: 'Cobro General',
    badgeClass: 'bg-neutral-800 text-neutral-300 border-neutral-700',
    borderClass: 'border-neutral-800 bg-neutral-900/50',
    iconClass: 'bg-neutral-800 text-neutral-300 border-neutral-700',
  };
}

// Smart matching between catalog presets and registered active methods
function findMatchingActiveMethod(presetName: string, activeMethods: string[]): string | null {
  const pNorm = presetName.toLowerCase().trim();
  
  // 1. Exact match
  const exact = activeMethods.find(m => m.toLowerCase().trim() === pNorm);
  if (exact) return exact;

  // 2. Specific matching for currencies and common names
  if (pNorm.includes('binance')) {
    return activeMethods.find(m => m.toLowerCase().includes('binance')) || null;
  }
  if (pNorm.includes('punto') || pNorm.includes('pos')) {
    return activeMethods.find(m => {
      const mn = m.toLowerCase();
      return mn.includes('punto') || mn.includes('pos') || mn.includes('tarjeta');
    }) || null;
  }
  if (pNorm.includes('transferencia')) {
    return activeMethods.find(m => m.toLowerCase().includes('transferencia')) || null;
  }
  if (pNorm.includes('pago movil') || pNorm.includes('pago móvil')) {
    return activeMethods.find(m => m.toLowerCase().includes('pago movil') || m.toLowerCase().includes('pago móvil')) || null;
  }
  if (pNorm.includes('usd') || pNorm.includes('dolar')) {
    return activeMethods.find(m => {
      const mn = m.toLowerCase();
      return (mn.includes('efectivo') || mn.includes('cash')) && (mn.includes('usd') || mn.includes('dolar') || mn.includes('$'));
    }) || null;
  }
  if (pNorm.includes('bs') || pNorm.includes('boliv')) {
    return activeMethods.find(m => {
      const mn = m.toLowerCase();
      return (mn.includes('efectivo') || mn.includes('cash')) && (mn.includes('bs') || mn.includes('boliv') || mn.includes('ves'));
    }) || null;
  }
  if (pNorm.includes('cop') || pNorm.includes('peso')) {
    return activeMethods.find(m => {
      const mn = m.toLowerCase();
      return (mn.includes('efectivo') || mn.includes('cash')) && (mn.includes('cop') || mn.includes('peso'));
    }) || null;
  }
  if (pNorm.includes('cortes') || pNorm.includes('regal')) {
    return activeMethods.find(m => m.toLowerCase().includes('cortes') || m.toLowerCase().includes('regal')) || null;
  }
  if (pNorm.includes('eur') || pNorm.includes('euro') || pNorm.includes('€')) {
    return activeMethods.find(m => {
      const mn = m.toLowerCase();
      return (mn.includes('efectivo') || mn.includes('cash')) && (mn.includes('eur') || mn.includes('euro') || mn.includes('€'));
    }) || null;
  }

  return null;
}

export default function MetodosPagoManager({ empresaId, initialMetodosVenta }: MetodosPagoManagerProps) {
  const [activeTab, setActiveTab] = useState<'ventas' | 'compras'>('ventas');

  // Estado Métodos de Venta (directo de BD sin imponer Cortesía obligatoria)
  const [metodosVentas, setMetodosVentas] = useState<string[]>(initialMetodosVenta);
  const [customVenta, setCustomVenta] = useState('');
  const [showCatalogVentas, setShowCatalogVentas] = useState(false);
  const [isPendingVentas, startTransitionVentas] = useTransition();
  const [feedbackVentas, setFeedbackVentas] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Estado Métodos de Compras
  const [metodosCompras, setMetodosCompras] = useState<{ id: string; nombre: string }[]>([]);
  const [loadingCompras, setLoadingCompras] = useState(true);
  const [customCompra, setCustomCompra] = useState('');
  const [showCatalogCompras, setShowCatalogCompras] = useState(false);
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

  // Detectar métodos duplicados en ventas
  const duplicateVentas = useMemo(() => {
    const counts = new Map<string, number>();
    metodosVentas.forEach(m => {
      const key = m.trim().toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return metodosVentas.filter(m => (counts.get(m.trim().toLowerCase()) || 0) > 1);
  }, [metodosVentas]);

  // Persistir cambios en Ventas inmediatamente a base de datos
  const persistirMetodosVentas = (nuevosMetodos: string[], successMsg = 'Métodos de cobro actualizados correctamente.') => {
    setMetodosVentas(nuevosMetodos);
    setFeedbackVentas(null);
    startTransitionVentas(async () => {
      const res = await updateEmpresaSaaS(empresaId, {
        metodos_pago: nuevosMetodos,
      });
      if (res.success) {
        setFeedbackVentas({ type: 'success', message: successMsg });
        setTimeout(() => setFeedbackVentas(null), 3500);
      } else {
        setFeedbackVentas({ type: 'error', message: res.error || 'Error al guardar los cambios en la base de datos.' });
      }
    });
  };

  // Limpiar duplicados con 1 clic
  const limpiarDuplicadosVentas = () => {
    const seen = new Set<string>();
    const deduplicados: string[] = [];
    
    metodosVentas.forEach(m => {
      const norm = m.trim().toLowerCase();
      if (!norm) return;
      if (!seen.has(norm)) {
        seen.add(norm);
        deduplicados.push(m.trim());
      }
    });

    persistirMetodosVentas(deduplicados, 'Duplicados eliminados. Lista consolidada con éxito.');
  };

  // Handlers Ventas
  const agregarMetodoVenta = (nombre: string) => {
    const val = nombre.trim();
    if (!val) return;

    const existing = metodosVentas.find(m => m.toLowerCase().trim() === val.toLowerCase().trim());
    if (existing) {
      setFeedbackVentas({ type: 'error', message: `"${existing}" ya está activo en tus métodos de cobro.` });
      setTimeout(() => setFeedbackVentas(null), 3000);
      return;
    }

    const actualizados = [...metodosVentas, val];
    setCustomVenta('');
    persistirMetodosVentas(actualizados, `"${val}" añadido y activado en cobros.`);
  };

  const eliminarMetodoVenta = (item: number | string) => {
    let actualizados: string[];
    let eliminadoNombre = '';

    if (typeof item === 'number') {
      eliminadoNombre = metodosVentas[item];
      actualizados = metodosVentas.filter((_, i) => i !== item);
    } else {
      eliminadoNombre = item;
      actualizados = metodosVentas.filter(m => m.toLowerCase().trim() !== item.toLowerCase().trim());
    }

    persistirMetodosVentas(actualizados, `"${eliminadoNombre}" eliminado definitivamente.`);
  };

  const moverMetodoVenta = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= metodosVentas.length) return;
    const nuevoOrden = [...metodosVentas];
    const [movido] = nuevoOrden.splice(index, 1);
    nuevoOrden.splice(targetIndex, 0, movido);
    persistirMetodosVentas(nuevoOrden, `Prioridad de cobro actualizada.`);
  };

  // Handlers Compras
  const agregarMetodoCompra = async (nombre: string) => {
    const val = nombre.trim();
    if (!val) return;
    if (metodosCompras.some(m => m.nombre.toLowerCase().trim() === val.toLowerCase().trim())) {
      setFeedbackCompras({ type: 'error', message: `"${val}" ya está registrado en pagos de compras.` });
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
      setFeedbackCompras({ type: 'success', message: `"${val}" añadido para compras a proveedores.` });
      setTimeout(() => setFeedbackCompras(null), 3500);
    } else {
      setFeedbackCompras({ type: 'error', message: res.error || 'Error al registrar método.' });
    }
  };

  const eliminarMetodoCompra = async (id: string, nombre: string) => {
    const res = await deleteCompraMetodoPago(id);
    if (res.success) {
      await cargarCompras();
      setFeedbackCompras({ type: 'success', message: `Método "${nombre}" eliminado definitivamente de compras.` });
      setTimeout(() => setFeedbackCompras(null), 3000);
    } else {
      setFeedbackCompras({ type: 'error', message: res.error || 'Error al eliminar método.' });
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
          {/* Banner de Feedback */}
          {feedbackVentas && (
            <div className={`p-4 rounded-xl text-xs flex items-center gap-3 animate-in fade-in border ${
              feedbackVentas.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {feedbackVentas.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span className="font-medium">{feedbackVentas.message}</span>
            </div>
          )}

          {/* Banner si se detectan métodos repetidos o duplicados */}
          {duplicateVentas.length > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-amber-300">
                    Se detectaron métodos repetidos en tu lista de cobro
                  </h4>
                  <p className="text-[11px] text-amber-200/80 mt-0.5">
                    Hay {duplicateVentas.length} entradas repetidas. Puedes unificarlas automáticamente con un solo clic.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={limpiarDuplicadosVentas}
                disabled={isPendingVentas}
                className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-md shrink-0"
              >
                <RotateCcw size={14} />
                <span>Limpiar Duplicados</span>
              </button>
            </div>
          )}

          {/* Bloque 1: Métodos Habilitados (Solo los que tú usas) */}
          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/60 pb-4">
              <div>
                <h3 className="text-base font-semibold text-white">Métodos de Cobro Habilitados</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Vías de cobro activas en tu punto de venta (POS) y caja. Puedes eliminar definitivamente las que no utilices.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-neutral-300 bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-lg">
                  {metodosVentas.length} habilitados
                </span>
              </div>
            </div>

            {metodosVentas.length === 0 ? (
              <div className="text-center py-10 px-4 border border-dashed border-neutral-800 rounded-2xl">
                <p className="text-neutral-400 text-sm font-medium">No tienes ningún método de cobro configurado.</p>
                <p className="text-neutral-600 text-xs mt-1">
                  Crea tu método abajo o abre las sugerencias populares para activar los que necesites.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                {metodosVentas.map((metodo, idx) => {
                  const meta = getMethodMeta(metodo);
                  const Icon = meta.icon;

                  return (
                    <div
                      key={`${metodo}-${idx}`}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${meta.borderClass}`}
                    >
                      {/* Lado Izquierdo: Icono, Nombre Completo y Badge */}
                      <div className="flex items-center gap-3.5 min-w-0 mr-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${meta.iconClass}`}>
                          <Icon size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm whitespace-nowrap tracking-wide" title={metodo}>
                              {metodo}
                            </span>
                            <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider whitespace-nowrap ${meta.badgeClass}`}>
                              {meta.badge}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-400 mt-1 truncate">
                            {meta.desc}
                          </p>
                        </div>
                      </div>

                      {/* Lado Derecho: Barra de Acciones de Prioridad y Eliminación Definitiva */}
                      <div className="flex items-center gap-1 shrink-0 bg-neutral-900/90 p-1 rounded-xl border border-neutral-800/80">
                        <button
                          type="button"
                          onClick={() => moverMetodoVenta(idx, 'up')}
                          disabled={idx === 0 || isPendingVentas}
                          title="Subir prioridad"
                          className="p-1.5 text-neutral-400 hover:text-white disabled:opacity-20 hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moverMetodoVenta(idx, 'down')}
                          disabled={idx === metodosVentas.length - 1 || isPendingVentas}
                          title="Bajar prioridad"
                          className="p-1.5 text-neutral-400 hover:text-white disabled:opacity-20 hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                          <ChevronDown size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => eliminarMetodoVenta(idx)}
                          disabled={isPendingVentas}
                          title={`Eliminar definitivamente "${metodo}"`}
                          className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bloque 2: Formulario para Crear / Añadir Métodos */}
          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-white">Crear nuevo método de cobro</h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Escribe el nombre del método que quieres utilizar en tu caja y pulsa Añadir.
              </p>
            </div>

            <div className="flex items-center gap-2 max-w-lg">
              <input
                type="text"
                placeholder="Ej. Efectivo USD, Pago Móvil, Cashea, Zelle..."
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
                disabled={!customVenta.trim() || isPendingVentas}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-indigo-500 transition-all shrink-0"
              >
                <Plus size={14} />
                <span>Añadir</span>
              </button>
            </div>
          </div>

          {/* Bloque 3: Sugerencias Opcionales Desplegables (No invasivo) */}
          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles size={18} className="text-indigo-400" />
                <div>
                  <h4 className="text-sm font-semibold text-white">Plantillas y Sugerencias Frecuentes</h4>
                  <p className="text-xs text-neutral-400">
                    Sugerencias rápidas para añadir con un clic si las llegas a necesitar.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCatalogVentas(!showCatalogVentas)}
                className="flex items-center justify-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3.5 py-1.5 rounded-xl border border-indigo-500/20 transition-all shrink-0"
              >
                <span>{showCatalogVentas ? 'Ocultar sugerencias' : 'Ver sugerencias populares'}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${showCatalogVentas ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {showCatalogVentas && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-3 border-t border-neutral-800/60 animate-in fade-in duration-150">
                {POPULAR_VENTAS_PRESETS.map((preset) => {
                  const matchedActive = findMatchingActiveMethod(preset.name, metodosVentas);
                  const isActive = !!matchedActive;
                  const meta = getMethodMeta(preset.name);
                  const Icon = meta.icon;

                  return (
                    <div
                      key={preset.name}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                        isActive 
                          ? 'bg-neutral-900/60 border-neutral-800/90' 
                          : 'bg-neutral-900/30 hover:bg-neutral-900/70 border-neutral-800/60 hover:border-indigo-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${meta.iconClass}`}>
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate" title={preset.displayName}>
                            {preset.displayName}
                          </p>
                          <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                            {preset.desc}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        {isActive ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1 whitespace-nowrap">
                              <Check size={12} /> Activo
                            </span>
                            <button
                              type="button"
                              onClick={() => eliminarMetodoVenta(matchedActive)}
                              disabled={isPendingVentas}
                              title={`Eliminar definitivamente ${matchedActive}`}
                              className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-neutral-800 hover:border-rose-500/20 transition-colors"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => agregarMetodoVenta(preset.name)}
                            disabled={isPendingVentas}
                            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3.5 py-1.5 rounded-lg border border-indigo-500/20 transition-all flex items-center gap-1 whitespace-nowrap"
                          >
                            <Plus size={13} />
                            <span>Añadir</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pie de guardado */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <CheckCircle2 size={15} className="text-emerald-400" />
              <span>Cualquier cambio se guarda y sincroniza automáticamente con Niteo POS.</span>
            </div>
            <button
              type="button"
              disabled={isPendingVentas}
              onClick={() => persistirMetodosVentas(metodosVentas, 'Métodos de cobro sincronizados y guardados correctamente.')}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 shrink-0"
            >
              {isPendingVentas ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sincronizando...</span>
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
              <span className="font-medium">{feedbackCompras.message}</span>
            </div>
          )}

          {/* Bloque 1: Tarjetas de Métodos Activos de Compra */}
          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/60 pb-4">
              <div>
                <h3 className="text-base font-semibold text-white">Métodos de Pago a Proveedores</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Vías de desembolso disponibles al registrar compras y gastos a proveedores.
                </p>
              </div>
              <div className="text-xs font-semibold text-neutral-300 bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-lg shrink-0">
                {metodosCompras.length} registrados
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
                  Crea uno abajo o usa las sugerencias populares para añadirlo.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                {metodosCompras.map((m) => {
                  const meta = getMethodMeta(m.nombre);
                  const Icon = meta.icon;

                  return (
                    <div
                      key={m.id}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${meta.borderClass}`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 mr-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${meta.iconClass}`}>
                          <Icon size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm whitespace-nowrap tracking-wide" title={m.nombre}>
                              {m.nombre}
                            </span>
                            <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider whitespace-nowrap ${meta.badgeClass}`}>
                              {meta.badge}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-400 mt-1 truncate">
                            {meta.desc}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => eliminarMetodoCompra(m.id, m.nombre)}
                        title="Eliminar definitivamente"
                        className="p-2 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl border border-neutral-800 hover:border-rose-500/30 transition-all shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bloque 2: Formulario para Crear Método de Compra */}
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

          {/* Bloque 3: Sugerencias Opcionales para Compras */}
          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles size={18} className="text-indigo-400" />
                <div>
                  <h4 className="text-sm font-semibold text-white">Métodos de Pago Frecuentes a Proveedores</h4>
                  <p className="text-xs text-neutral-400">Plantillas rápidas sugeridas para pagos a proveedores.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCatalogCompras(!showCatalogCompras)}
                className="flex items-center justify-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3.5 py-1.5 rounded-xl border border-indigo-500/20 transition-all shrink-0"
              >
                <span>{showCatalogCompras ? 'Ocultar sugerencias' : 'Ver sugerencias populares'}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${showCatalogCompras ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {showCatalogCompras && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-3 border-t border-neutral-800/60 animate-in fade-in duration-150">
                {POPULAR_COMPRAS_PRESETS.map((preset) => {
                  const matchedCompra = metodosCompras.find(m => 
                    m.nombre.toLowerCase().trim() === preset.name.toLowerCase().trim() ||
                    (preset.name.toLowerCase().includes('binance') && m.nombre.toLowerCase().includes('binance')) ||
                    (preset.name.toLowerCase().includes('transferencia') && m.nombre.toLowerCase().includes('transferencia')) ||
                    (preset.name.toLowerCase().includes('pago movil') && (m.nombre.toLowerCase().includes('pago movil') || m.nombre.toLowerCase().includes('pago móvil')))
                  );
                  const isActive = !!matchedCompra;
                  const meta = getMethodMeta(preset.name);
                  const Icon = meta.icon;

                  return (
                    <div
                      key={preset.name}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                        isActive 
                          ? 'bg-neutral-900/60 border-neutral-800/90' 
                          : 'bg-neutral-900/30 hover:bg-neutral-900/70 border-neutral-800/60 hover:border-indigo-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${meta.iconClass}`}>
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate" title={preset.displayName}>
                            {preset.displayName}
                          </p>
                          <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                            {preset.desc}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        {isActive && matchedCompra ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1 whitespace-nowrap">
                              <Check size={12} /> Activo
                            </span>
                            <button
                              type="button"
                              onClick={() => eliminarMetodoCompra(matchedCompra.id, matchedCompra.nombre)}
                              title={`Eliminar definitivamente ${matchedCompra.nombre}`}
                              className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-neutral-800 hover:border-rose-500/20 transition-colors"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isAddingCompra}
                            onClick={() => agregarMetodoCompra(preset.name)}
                            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3.5 py-1.5 rounded-lg border border-indigo-500/20 transition-all flex items-center gap-1 whitespace-nowrap"
                          >
                            <Plus size={13} />
                            <span>Añadir</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
