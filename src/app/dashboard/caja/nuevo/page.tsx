'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Wallet, CreditCard, Smartphone, DollarSign, CheckCircle2, Building2, Hash, ChevronDown, ChevronUp, GripHorizontal, X, RotateCcw } from 'lucide-react';
import { getCierrePrevio, guardarCierre, getBancosUtilizados } from '@/actions/cierres-actions';
import { getSedes } from '@/actions/sedes-actions';
import { useCajaSync } from '@/hooks/useCajaSync';

type Moneda = 'USD' | 'VES';

interface MetodoConfig {
  id: string;
  icon: any;
  color: string;
  defaultMoneda: Moneda;
  isCustom?: boolean;
}

interface Transaccion {
  id: string;
  metodo: string;
  banco: string;
  referencia: string;
  monto: string;
  moneda: Moneda;
}

// Clave de borrador en localStorage
const DRAFT_KEY = 'niteo_draft_cierre';

const METODOS_DEFAULT: MetodoConfig[] = [
  { id: 'Pago Móvil', icon: Smartphone, color: 'text-indigo-400', defaultMoneda: 'VES' },
  { id: 'Punto de Venta', icon: CreditCard, color: 'text-emerald-400', defaultMoneda: 'VES' },
  { id: 'Zelle', icon: DollarSign, color: 'text-purple-400', defaultMoneda: 'USD' },
  { id: 'Efectivo', icon: Wallet, color: 'text-amber-400', defaultMoneda: 'USD' },
];

// Mapa de icon components para rehidratar desde localStorage (solo strings serializables)
const ICON_MAP: Record<string, any> = {
  Smartphone, CreditCard, DollarSign, Wallet, GripHorizontal,
};

export default function NuevoCierreCaja() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  
  // Datos del sistema
  const [tasaCambio, setTasaCambio] = useState(1);
  const [sedes, setSedes] = useState<any[]>([]);
  const [selectedSedeId, setSelectedSedeId] = useState<string>('');
  const [ventasTotales, setVentasTotales] = useState(0);
  const [gastosTotales, setGastosTotales] = useState(0);
  const [totalEsperado, setTotalEsperado] = useState(0);
  
  // Listas sugeridas
  const [bancosSugeridos, setBancosSugeridos] = useState<string[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState<string | null>(null);
  
  // Transacciones
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [expandedMetodo, setExpandedMetodo] = useState<string | null>('Pago Móvil');

  // Metodos dinámicos
  const [metodos, setMetodos] = useState<MetodoConfig[]>(METODOS_DEFAULT);

  // Hook de sincronización en tiempo real con Supabase Broadcast
  useCajaSync(selectedSedeId, transacciones, setTransacciones, metodos, setMetodos);

  // Modal para nuevo método
  const [showNewMetodo, setShowNewMetodo] = useState(false);
  const [newMetodoName, setNewMetodoName] = useState('');
  const [newMetodoMoneda, setNewMetodoMoneda] = useState<Moneda>('VES');

  // ─── FIX 1: RESTAURAR BORRADOR DESDE localStorage AL MONTAR ──────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.transacciones?.length > 0) {
          setTransacciones(draft.transacciones);
          setHasDraft(true);
        }
        if (draft.metodos_custom?.length > 0) {
          // Rehidratar icon component desde el mapa de iconos
          const customRestored: MetodoConfig[] = draft.metodos_custom.map((m: any) => ({
            ...m,
            icon: ICON_MAP[m.iconKey] || GripHorizontal,
          }));
          setMetodos([...METODOS_DEFAULT, ...customRestored]);
        }
      }
    } catch (_) {
      // Si el JSON está corrupto lo ignoramos
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  // ─── FIX 1: GUARDAR BORRADOR EN localStorage EN CADA CAMBIO ─────────────
  useEffect(() => {
    if (loading) return; // No guardar antes de que carguen los datos iniciales
    try {
      const metodos_custom = metodos
        .filter(m => m.isCustom)
        .map(m => ({
          id: m.id,
          color: m.color,
          defaultMoneda: m.defaultMoneda,
          isCustom: true,
          iconKey: 'GripHorizontal', // único tipo custom por ahora
        }));
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ transacciones, metodos_custom }));
      setHasDraft(transacciones.length > 0);
    } catch (_) { /* no lanzar en SSR o modo privado */ }
  }, [transacciones, metodos, loading]);

  const limpiarBorrador = () => {
    localStorage.removeItem(DRAFT_KEY);
    setTransacciones([]);
    setMetodos(METODOS_DEFAULT);
    setHasDraft(false);
  };
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadInitial() {
      try {
        const sedesData = await getSedes();
        setSedes(sedesData);
        
        const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
        const initialSedeId = sedesData.length > 0 ? sedesData[0].id : undefined;
        
        const [cierreRes, bancosRes] = await Promise.all([
          getCierrePrevio(today, initialSedeId),
          getBancosUtilizados()
        ]);
        
        if (cierreRes.targetSedeId) setSelectedSedeId(cierreRes.targetSedeId);
        else if (initialSedeId) setSelectedSedeId(initialSedeId);

        setTasaCambio(cierreRes.tasaCambio || 36.5);
        setVentasTotales(cierreRes.ventasTotales || 0);
        setGastosTotales(cierreRes.gastosTotales || 0);
        setTotalEsperado(cierreRes.totalEsperado || 0);
        setBancosSugeridos(bancosRes);
      } catch (err: any) {
        console.error('Error cargando datos de cierre', err);
        alert(err.message || 'Error cargando datos de cierre');
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);


  const handleSedeChange = async (newSedeId: string) => {
    setSelectedSedeId(newSedeId);
    setLoading(true);
    try {
      const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
      const cierreRes = await getCierrePrevio(today, newSedeId);
      setTasaCambio(cierreRes.tasaCambio || 36.5);
      setVentasTotales(cierreRes.ventasTotales || 0);
      setGastosTotales(cierreRes.gastosTotales || 0);
      setTotalEsperado(cierreRes.totalEsperado || 0);
    } catch (err: any) {
      alert(err.message || 'Error cambiando de sede');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMetodo = () => {
    if (!newMetodoName.trim()) return;
    const newConfig: MetodoConfig = {
      id: newMetodoName.trim(),
      icon: GripHorizontal,
      color: 'text-sky-400',
      defaultMoneda: newMetodoMoneda,
      isCustom: true
    };
    setMetodos([...metodos, newConfig]);
    setExpandedMetodo(newConfig.id);
    setNewMetodoName('');
    setShowNewMetodo(false);
  };

  const handleAddTransaccion = (metodoId: string, defaultMoneda: Moneda) => {
    const newTx: Transaccion = {
      id: Math.random().toString(36).substr(2, 9),
      metodo: metodoId,
      banco: '',
      referencia: '',
      monto: '',
      moneda: defaultMoneda
    };
    setTransacciones([...transacciones, newTx]);
    setExpandedMetodo(metodoId);
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

  const getTotalByMetodo = (metodo: string) => {
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

  const getBanksSummary = (metodo: string) => {
    const txs = transacciones.filter(t => t.metodo === metodo && t.banco.trim() !== '');
    const summary: Record<string, { count: number, totalBs: number, totalUsd: number }> = {};
    
    txs.forEach(tx => {
      const b = tx.banco.trim();
      if (!summary[b]) summary[b] = { count: 0, totalBs: 0, totalUsd: 0 };
      summary[b].count++;
      if (tx.moneda === 'VES') summary[b].totalBs += (parseFloat(tx.monto) || 0);
      else summary[b].totalUsd += (parseFloat(tx.monto) || 0);
    });
    return summary;
  };

  const handleGuardarCierre = async () => {
    setSaving(true);
    try {
      const hoy = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
      
      let real_efectivo_bs = 0;
      let real_efectivo_usd = 0;
      let real_bancos_bs = 0;
      let real_bancos_usd = 0;

      const transaccionesCleaned = transacciones.map(t => {
        const val = parseFloat(t.monto) || 0;
        
        if (t.metodo === 'Efectivo' || t.metodo.toLowerCase().includes('efectivo')) {
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
        sede_id: selectedSedeId,
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
        // FIX 1: limpiar el borrador al guardar con éxito
        localStorage.removeItem(DRAFT_KEY);
        setHasDraft(false);
        alert('Cierre guardado correctamente!');
        router.push('/dashboard/caja');
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
    <div className="animate-in fade-in duration-500 space-y-6 pb-24 max-w-4xl mx-auto">

      {/* FIX 1: BANNER DE BORRADOR ACTIVO */}
      {hasDraft && (
        <div className="flex items-center justify-between gap-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-3">
          <div className="flex items-center gap-3">
            <RotateCcw size={18} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-amber-300 text-sm font-semibold">Borrador restaurado</p>
              <p className="text-amber-500/80 text-xs">
                Tienes {transacciones.length} transacción(es) guardada(s) de una sesión anterior.
              </p>
            </div>
          </div>
          <button
            onClick={limpiarBorrador}
            className="text-xs text-amber-400 hover:text-white border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            <X size={13} /> Limpiar borrador
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 flex justify-between items-center shadow-sm">
        <div>
          <div className="flex items-center gap-3">
              <button onClick={() => router.push('/dashboard/caja')} className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors" title="Volver al Historial (Se guardará el borrador)">
                <ArrowLeft size={18} />
              </button>
              <h1 className="text-2xl font-bold text-white tracking-tight">Cierre de Caja</h1>
            </div>
          <p className="text-neutral-400 text-sm mt-1 mb-4">Tasa BCV: <span className="text-emerald-400 font-medium">{tasaCambio.toFixed(2)} Bs/$</span></p>
          
          {sedes.length > 1 && (
            <div className="flex items-center gap-3 bg-black/30 border border-neutral-800 p-2 rounded-xl">
              <label className="text-xs uppercase font-bold text-neutral-500 ml-2">Sede:</label>
              <select 
                value={selectedSedeId} 
                onChange={(e) => handleSedeChange(e.target.value)}
                className="bg-neutral-800 text-white text-sm font-medium rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500 cursor-pointer"
              >
                {sedes.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre_sede}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="text-right hidden sm:block bg-black/40 px-6 py-3 rounded-xl border border-neutral-800">
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Venta del Sistema</p>
          <p className="text-xl font-black text-white">${totalEsperado.toFixed(2)}</p>
        </div>
      </div>

      {/* BODY */}
      <div className="space-y-4">
        {metodos.map((metodo) => {
          const Icon = metodo.icon;
          const isExpanded = expandedMetodo === metodo.id;
          const txs = transacciones.filter(t => t.metodo === metodo.id);
          const totalMetodo = getTotalByMetodo(metodo.id);
          const banksSummary = getBanksSummary(metodo.id);
          const hasBanks = Object.keys(banksSummary).length > 0;

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
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      {metodo.id}
                      {metodo.isCustom && <span className="text-[10px] bg-neutral-800 px-2 py-0.5 rounded-full text-neutral-400">Custom</span>}
                    </h3>
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
                  
                  {/* SUMMARY POR BANCO */}
                  {hasBanks && (
                    <div className="mb-4 bg-neutral-950/50 border border-neutral-800 rounded-xl p-4">
                      <p className="text-xs text-neutral-500 uppercase tracking-widest mb-3 font-semibold">Resumen por Banco</p>
                      <div className="flex flex-wrap gap-3">
                        {Object.entries(banksSummary).map(([bank, data]) => (
                          <div key={bank} className="bg-neutral-900 border border-neutral-800 px-3 py-2 rounded-lg flex items-center gap-3">
                            <div>
                              <p className="text-sm font-medium text-white">{bank}</p>
                              <p className="text-[10px] text-neutral-500">{data.count} txs</p>
                            </div>
                            <div className="text-right">
                              {data.totalBs > 0 && <p className="text-xs text-indigo-300 font-bold">{data.totalBs.toFixed(2)} Bs</p>}
                              {data.totalUsd > 0 && <p className="text-xs text-emerald-400 font-bold">${data.totalUsd.toFixed(2)}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                                    )}

                  {/* TRANSACTIONS TABLE FORMAT (DESKTOP) */}
                  <div className="mt-2 hidden sm:block overflow-x-auto overflow-y-visible">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-neutral-500 text-xs font-bold uppercase tracking-wider border-b border-neutral-800">
                          <th className="pb-3 w-8 text-center">#</th>
                          <th className="pb-3 px-2 min-w-[120px]">Monto</th>
                          <th className="pb-3 px-2 min-w-[140px]">Referencia</th>
                          <th className="pb-3 px-2 min-w-[140px]">Banco</th>
                          <th className="pb-3 px-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/50">
                        {txs.map((tx, idx) => (
                          <tr key={tx.id} className="group hover:bg-neutral-900/30 transition-colors animate-in slide-in-from-top-1 duration-200">
                            <td className="py-2 text-center text-xs text-neutral-500 font-medium">{idx + 1}</td>
                            
                            <td className="py-2 px-2 align-top pt-3">
                              <div className="flex bg-neutral-900 border border-neutral-800 rounded-lg focus-within:border-indigo-500 overflow-hidden h-9">
                                <select 
                                  value={tx.moneda}
                                  onChange={(e) => updateTransaccion(tx.id, 'moneda', e.target.value as any)}
                                  className="bg-neutral-800 text-white text-xs font-bold px-2 outline-none border-r border-neutral-800 cursor-pointer"
                                >
                                  <option value="VES">BS</option>
                                  <option value="USD">$</option>
                                </select>
                                <input 
                                  type="text" 
                                  inputMode="decimal"
                                  placeholder="0.00"
                                  value={tx.monto}
                                  onChange={(e) => updateTransaccion(tx.id, 'monto', e.target.value)}
                                  className="flex-1 bg-transparent px-2 text-white text-sm font-medium outline-none placeholder:text-neutral-600 w-full min-w-0"
                                />
                              </div>
                              {tx.moneda === 'VES' && tx.monto && (
                                <p className="text-[10px] text-neutral-500 mt-1 pl-1">≈ ${(parseFloat(tx.monto) / tasaCambio).toFixed(2)} USD</p>
                              )}
                            </td>

                            <td className="py-2 px-2 align-top pt-3">
                              <input 
                                type="text" 
                                placeholder="Ej: 1234"
                                value={tx.referencia}
                                onChange={(e) => updateTransaccion(tx.id, 'referencia', e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-800 focus:border-indigo-500 rounded-lg h-9 px-3 text-white text-sm outline-none transition-colors"
                              />
                            </td>

                            <td className="py-2 px-2 relative align-top pt-3">
                              <input 
                                type="text" 
                                placeholder={metodo.id === 'Efectivo' ? 'N/A' : 'Ej: VZLA'}
                                value={tx.banco}
                                onChange={(e) => updateTransaccion(tx.id, 'banco', e.target.value)}
                                onFocus={() => setMostrarSugerencias(tx.id)}
                                onBlur={() => setTimeout(() => setMostrarSugerencias(null), 200)}
                                className="w-full bg-neutral-900 border border-neutral-800 focus:border-indigo-500 rounded-lg h-9 px-3 text-white text-sm outline-none transition-colors"
                              />
                              {mostrarSugerencias === tx.id && (
                                <div className="absolute z-[100] w-[calc(100%-1rem)] top-[46px] mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-2xl overflow-hidden max-h-40 overflow-y-auto custom-scrollbar">
                                  {bancosSugeridos.filter(b => b.toLowerCase().includes(tx.banco.toLowerCase())).length > 0 ? (
                                    bancosSugeridos.filter(b => b.toLowerCase().includes(tx.banco.toLowerCase())).map(b => (
                                      <button 
                                        key={b}
                                        onMouseDown={(e) => e.preventDefault()} 
                                        onClick={() => selectBanco(tx.id, b)}
                                        className="w-full text-left px-3 py-2 hover:bg-indigo-600 text-white text-xs transition-colors"
                                      >
                                        {b}
                                      </button>
                                    ))
                                  ) : (
                                    <div className="px-3 py-2 text-xs text-neutral-400">Presiona enter para crear</div>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="py-2 px-2 text-center align-top pt-3">
                              <button 
                                onClick={() => removeTransaccion(tx.id)}
                                className="w-8 h-8 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg flex items-center justify-center border border-rose-500/20 transition-colors mx-auto opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* TRANSACTIONS MOBILE FORMAT (CARDS) */}
                  <div className="sm:hidden mt-3 space-y-3">
                    {txs.map((tx, idx) => (
                      <div key={tx.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-col gap-3 relative group animate-in slide-in-from-top-1 shadow-sm">
                        <div className="flex justify-between items-center border-b border-neutral-800/50 pb-2">
                           <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Pago #{idx + 1}</span>
                           <button onClick={() => removeTransaccion(tx.id)} className="text-rose-500/70 hover:text-rose-400 p-1">
                             <Trash2 size={16} />
                           </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-2 flex bg-black/40 border border-neutral-800 rounded-lg focus-within:border-indigo-500 overflow-hidden h-10">
                              <select 
                                value={tx.moneda}
                                onChange={(e) => updateTransaccion(tx.id, 'moneda', e.target.value as any)}
                                className="bg-neutral-800 text-white text-xs font-bold px-3 outline-none border-r border-neutral-800 cursor-pointer"
                              >
                                <option value="VES">BS</option>
                                <option value="USD">$</option>
                              </select>
                              <input 
                                type="text" 
                                inputMode="decimal"
                                placeholder="0.00"
                                value={tx.monto}
                                onChange={(e) => updateTransaccion(tx.id, 'monto', e.target.value)}
                                className="flex-1 bg-transparent px-3 text-white text-sm font-bold outline-none placeholder:text-neutral-600 min-w-0"
                              />
                          </div>
                          <input 
                            type="text" 
                            placeholder="Ref: 1234"
                            value={tx.referencia}
                            onChange={(e) => updateTransaccion(tx.id, 'referencia', e.target.value)}
                            className="bg-black/40 border border-neutral-800 focus:border-indigo-500 rounded-lg h-10 px-3 text-white text-sm outline-none transition-colors"
                          />
                          <div className="relative">
                            <input 
                              type="text" 
                              placeholder={metodo.id === 'Efectivo' ? 'N/A' : 'Banco'}
                              value={tx.banco}
                              onChange={(e) => updateTransaccion(tx.id, 'banco', e.target.value)}
                              onFocus={() => setMostrarSugerencias('mob-' + tx.id)}
                              onBlur={() => setTimeout(() => setMostrarSugerencias(null), 200)}
                              className="w-full bg-black/40 border border-neutral-800 focus:border-indigo-500 rounded-lg h-10 px-3 text-white text-sm outline-none transition-colors"
                            />
                            {mostrarSugerencias === 'mob-' + tx.id && (
                              <div className="absolute z-[100] w-full top-[100%] mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-2xl overflow-hidden max-h-40 overflow-y-auto custom-scrollbar">
                                {bancosSugeridos.filter(b => b.toLowerCase().includes(tx.banco.toLowerCase())).map(b => (
                                  <button 
                                    key={b}
                                    onMouseDown={(e) => e.preventDefault()} 
                                    onClick={() => selectBanco(tx.id, b)}
                                    className="w-full text-left px-3 py-2 hover:bg-indigo-600 text-white text-xs transition-colors"
                                  >
                                    {b}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {tx.moneda === 'VES' && tx.monto && (
                          <p className="text-[11px] text-neutral-400 text-center font-medium">≈ ${(parseFloat(tx.monto) / tasaCambio).toFixed(2)} USD</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => handleAddTransaccion(metodo.id, metodo.defaultMoneda)}
                    className="w-full py-4 border-2 border-dashed border-neutral-800 rounded-xl text-neutral-400 hover:text-white hover:border-neutral-700 hover:bg-neutral-800/50 flex items-center justify-center gap-2 transition-all font-medium"
                  >
                    <Plus size={18} /> Agregar Transacción en {metodo.id}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* CREAR NUEVO MÉTODO */}
        {showNewMetodo ? (
          <div className="bg-neutral-900 border border-indigo-500/50 rounded-2xl p-4 animate-in fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Nuevo Método Dinámico</h3>
              <button onClick={() => setShowNewMetodo(false)} className="text-neutral-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-neutral-400 uppercase">Nombre</label>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Ej: Biopago, Binance, etc."
                  value={newMetodoName}
                  onChange={(e) => setNewMetodoName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-neutral-400 uppercase">Moneda Predeterminada</label>
                <select 
                  value={newMetodoMoneda}
                  onChange={(e) => setNewMetodoMoneda(e.target.value as Moneda)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="VES">Bolívares (VES)</option>
                  <option value="USD">Dólares (USD)</option>
                </select>
              </div>
            </div>
            <button 
              onClick={handleCreateMetodo}
              disabled={!newMetodoName.trim()}
              className="mt-4 w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-xl py-3 font-bold transition-colors"
            >
              Confirmar Nuevo Método
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setShowNewMetodo(true)}
            className="w-full py-4 border-2 border-dashed border-indigo-500/30 rounded-xl text-indigo-400 hover:text-white hover:border-indigo-500 hover:bg-indigo-500/10 flex items-center justify-center gap-2 transition-all font-medium"
          >
            <Plus size={18} /> Crear Nuevo Método de Pago
          </button>
        )}
      </div>

      {/* FOOTER CONTAINED */}
      <div className="sticky bottom-6 bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 p-4 md:p-6 z-30 shadow-2xl rounded-2xl mx-2 md:mx-0 flex items-center justify-between mt-8">
        <div>
          <p className="text-xs text-neutral-400 uppercase tracking-widest">Verificación Física</p>
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
  );
}
