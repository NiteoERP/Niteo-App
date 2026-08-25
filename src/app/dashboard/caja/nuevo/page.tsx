'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Wallet, CreditCard, Smartphone, DollarSign, CheckCircle2, Building2, Hash, ChevronDown, ChevronUp } from 'lucide-react';
import { getCierrePrevio, guardarCierre, getBancosUtilizados } from '@/actions/cierres-actions';

type MetodoPago = 'Pago Móvil' | 'Punto de Venta' | 'Zelle' | 'Efectivo';

interface Transaccion {
  id: string;
  metodo: MetodoPago;
  banco: string;
  referencia: string;
  monto: string;
  moneda: 'USD' | 'VES';
}

export default function NuevoCierreCaja() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Datos del sistema
  const [tasaCambio, setTasaCambio] = useState(1);
  const [ventasTotales, setVentasTotales] = useState(0);
  const [gastosTotales, setGastosTotales] = useState(0);
  const [totalEsperado, setTotalEsperado] = useState(0);
  
  // Listas sugeridas
  const [bancosSugeridos, setBancosSugeridos] = useState<string[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState<string | null>(null);
  
  // Transacciones
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [expandedMetodo, setExpandedMetodo] = useState<MetodoPago | null>('Pago Móvil');

  const metodos: { id: MetodoPago, icon: any, color: string }[] = [
    { id: 'Pago Móvil', icon: Smartphone, color: 'text-indigo-400' },
    { id: 'Punto de Venta', icon: CreditCard, color: 'text-emerald-400' },
    { id: 'Zelle', icon: DollarSign, color: 'text-purple-400' },
    { id: 'Efectivo', icon: Wallet, color: 'text-amber-400' },
  ];

  useEffect(() => {
    async function loadData() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [cierreRes, bancosRes] = await Promise.all([
          getCierrePrevio(today),
          getBancosUtilizados()
        ]);
        setTasaCambio(cierreRes.tasaCambio || 36.5);
        setVentasTotales(cierreRes.ventasTotales || 0);
        setGastosTotales(cierreRes.gastosTotales || 0);
        setTotalEsperado(cierreRes.totalEsperado || 0);
        setBancosSugeridos(bancosRes);
      } catch (err) {
        console.error('Error cargando datos de cierre', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleAddTransaccion = (metodo: MetodoPago) => {
    const newTx: Transaccion = {
      id: Math.random().toString(36).substr(2, 9),
      metodo,
      banco: '',
      referencia: '',
      monto: '',
      moneda: metodo === 'Zelle' ? 'USD' : 'VES'
    };
    setTransacciones([...transacciones, newTx]);
    setExpandedMetodo(metodo);
  };

  const updateTransaccion = (id: string, field: keyof Transaccion, value: string) => {
    setTransacciones(transacciones.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const removeTransaccion = (id: string) => {
    setTransacciones(transacciones.filter(t => t.id !== id));
  };

  const selectBanco = (id: string, banco: string) => {
    updateTransaccion(id, 'banco', banco);
    setMostrarSugerencias(null);
  };

  const calcularTotalesUSD = () => {
    let total = 0;
    transacciones.forEach(t => {
      const val = parseFloat(t.monto) || 0;
      if (t.moneda === 'USD') {
        total += val;
      } else {
        total += (val / tasaCambio);
      }
    });
    return total;
  };

  const getTotalByMetodo = (metodo: MetodoPago) => {
    let total = 0;
    transacciones.filter(t => t.metodo === metodo).forEach(t => {
      const val = parseFloat(t.monto) || 0;
      if (t.moneda === 'USD') {
        total += val;
      } else {
        total += (val / tasaCambio);
      }
    });
    return total;
  };

  const handleGuardarCierre = async () => {
    setSaving(true);
    try {
      const hoy = new Date().toISOString().split('T')[0];
      
      let real_efectivo_bs = 0;
      let real_efectivo_usd = 0;
      let real_bancos_bs = 0;
      let real_bancos_usd = 0;

      const transaccionesCleaned = transacciones.map(t => {
        const val = parseFloat(t.monto) || 0;
        
        if (t.metodo === 'Efectivo') {
          if (t.moneda === 'VES') real_efectivo_bs += val;
          else real_efectivo_usd += val;
        } else {
          if (t.moneda === 'VES') real_bancos_bs += val;
          else real_bancos_usd += val;
        }

        return {
          metodo: t.metodo,
          banco: t.banco || 'N/A',
          referencia: t.referencia || 'N/A',
          monto: val,
          moneda: t.moneda
        };
      });

      const totalRealUSD = calcularTotalesUSD();
      const diferencia_total = totalRealUSD - totalEsperado;

      const cierreData = {
        fecha_cierre: hoy,
        tasa_cambio: tasaCambio,
        sistema_ventas_brutas: ventasTotales,
        sistema_gastos_operativos: gastosTotales,
        sistema_total_esperado: totalEsperado,
        real_efectivo_bs,
        real_efectivo_usd,
        real_bancos_bs,
        real_bancos_usd,
        diferencia_total
      };

      const res = await guardarCierre(cierreData, transaccionesCleaned);
      if (res.error) {
        alert(res.error);
      } else {
        alert('Cierre guardado correctamente!');
        router.push('/dashboard');
      }
    } catch (err) {
      console.error(err);
      alert('Error inesperado guardando cierre');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-neutral-500">Cargando datos del cierre...</div>;
  }

  const granTotalUSD = calcularTotalesUSD();

  return (
    <div className="min-h-screen bg-black text-white pb-32 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="p-6 md:p-8 bg-neutral-950 border-b border-neutral-900 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cierre de Caja</h1>
            <p className="text-neutral-400 text-sm mt-1">Tasa BCV: <span className="text-emerald-400 font-medium">{tasaCambio.toFixed(2)} Bs/$</span></p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs text-neutral-500 uppercase tracking-widest">Esperado Sistema</p>
            <p className="text-xl font-bold text-neutral-300">${totalEsperado.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4">
        {metodos.map((metodo) => {
          const Icon = metodo.icon;
          const isExpanded = expandedMetodo === metodo.id;
          const txs = transacciones.filter(t => t.metodo === metodo.id);
          const totalMetodo = getTotalByMetodo(metodo.id);

          return (
            <div key={metodo.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden transition-all duration-300">
              {/* Accordion Header */}
              <button 
                onClick={() => setExpandedMetodo(isExpanded ? null : metodo.id)}
                className="w-full flex items-center justify-between p-4 bg-neutral-900 hover:bg-neutral-800/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-black/40 border border-neutral-800 ${metodo.color}`}>
                    <Icon size={24} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-lg">{metodo.id}</h3>
                    <p className="text-xs text-neutral-400">{txs.length} transacciones registradas</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {totalMetodo > 0 && (
                    <span className="font-bold text-emerald-400 text-lg hidden sm:block">+${totalMetodo.toFixed(2)}</span>
                  )}
                  <div className="text-neutral-500">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
              </button>

              {/* Accordion Body */}
              {isExpanded && (
                <div className="p-4 border-t border-neutral-800 bg-black/20 space-y-4">
                  {txs.map((tx, idx) => (
                    <div key={tx.id} className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl relative group animate-in slide-in-from-top-2 duration-300">
                      <div className="absolute -left-3 -top-3 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                        {idx + 1}
                      </div>
                      <button 
                        onClick={() => removeTransaccion(tx.id)}
                        className="absolute -right-3 -top-3 w-8 h-8 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* MONEDA Y MONTO */}
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider">Monto y Moneda</label>
                          <div className="flex rounded-xl overflow-hidden border border-neutral-800 focus-within:border-indigo-500 transition-colors bg-neutral-900">
                            <select 
                              value={tx.moneda}
                              onChange={(e) => updateTransaccion(tx.id, 'moneda', e.target.value as any)}
                              className="bg-neutral-800 text-white font-medium px-4 py-3 outline-none border-r border-neutral-800 cursor-pointer"
                            >
                              <option value="VES">BS</option>
                              <option value="USD">USD</option>
                            </select>
                            <input 
                              type="text" 
                              inputMode="decimal"
                              placeholder="0.00"
                              value={tx.monto}
                              onChange={(e) => updateTransaccion(tx.id, 'monto', e.target.value)}
                              className="flex-1 bg-transparent px-4 py-3 text-white font-bold text-lg outline-none placeholder:text-neutral-600 w-full min-w-0"
                            />
                          </div>
                          {tx.moneda === 'VES' && tx.monto && (
                            <p className="text-xs text-neutral-500 pl-1">≈ ${(parseFloat(tx.monto) / tasaCambio).toFixed(2)} USD</p>
                          )}
                        </div>

                        {/* BANCO (Solo si no es efectivo) */}
                        {metodo.id !== 'Efectivo' && (
                          <div className="space-y-2 relative">
                            <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider">Banco Emisor / Receptor</label>
                            <div className="relative">
                              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                              <input 
                                type="text" 
                                placeholder="Ej: Banesco"
                                value={tx.banco}
                                onChange={(e) => updateTransaccion(tx.id, 'banco', e.target.value)}
                                onFocus={() => setMostrarSugerencias(tx.id)}
                                onBlur={() => setTimeout(() => setMostrarSugerencias(null), 200)}
                                className="w-full bg-neutral-900 border border-neutral-800 focus:border-indigo-500 rounded-xl py-3 pl-10 pr-4 text-white outline-none transition-colors"
                              />
                            </div>
                            {/* Autocomplete Dropdown */}
                            {mostrarSugerencias === tx.id && (
                              <div className="absolute z-10 w-full mt-1 bg-neutral-800 border border-neutral-700 rounded-xl shadow-xl overflow-hidden max-h-40 overflow-y-auto custom-scrollbar">
                                {bancosSugeridos.filter(b => b.toLowerCase().includes(tx.banco.toLowerCase())).length > 0 ? (
                                  bancosSugeridos.filter(b => b.toLowerCase().includes(tx.banco.toLowerCase())).map(b => (
                                    <button 
                                      key={b}
                                      onMouseDown={(e) => e.preventDefault()} 
                                      onClick={() => selectBanco(tx.id, b)}
                                      className="w-full text-left px-4 py-2 hover:bg-indigo-600 text-white text-sm transition-colors"
                                    >
                                      {b}
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-4 py-2 text-sm text-neutral-400">Presiona enter para crear "{tx.banco}"</div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* REFERENCIA */}
                        <div className="space-y-2 sm:col-span-2">
                          <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider">N° Referencia o Concepto</label>
                          <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                            <input 
                              type="text" 
                              placeholder="Últimos 4 dígitos o concepto"
                              value={tx.referencia}
                              onChange={(e) => updateTransaccion(tx.id, 'referencia', e.target.value)}
                              className="w-full bg-neutral-900 border border-neutral-800 focus:border-indigo-500 rounded-xl py-3 pl-10 pr-4 text-white outline-none transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button 
                    onClick={() => handleAddTransaccion(metodo.id)}
                    className="w-full py-4 border-2 border-dashed border-neutral-800 rounded-xl text-neutral-400 hover:text-white hover:border-neutral-700 hover:bg-neutral-800/50 flex items-center justify-center gap-2 transition-all font-medium"
                  >
                    <Plus size={18} /> Agregar Transacción en {metodo.id}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FOOTER FIJO (BOTTOM BAR) */}
      <div className="fixed bottom-0 left-0 w-full bg-neutral-950 border-t border-neutral-900 p-4 md:p-6 z-30 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-400 uppercase tracking-widest">Total Declarado</p>
            <p className="text-3xl font-black text-emerald-400">${granTotalUSD.toFixed(2)}</p>
            {totalEsperado > 0 && (
              <p className={`text-xs mt-1 font-medium ${granTotalUSD >= totalEsperado ? 'text-emerald-500' : 'text-rose-500'}`}>
                {granTotalUSD >= totalEsperado ? '+' : ''}{(granTotalUSD - totalEsperado).toFixed(2)}$ de diferencia
              </p>
            )}
          </div>
          <button 
            disabled={saving || transacciones.length === 0}
            onClick={handleGuardarCierre}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/20"
          >
            {saving ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : <CheckCircle2 size={20} />}
            <span className="hidden sm:inline">Guardar Cierre</span>
            <span className="sm:hidden">Guardar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
