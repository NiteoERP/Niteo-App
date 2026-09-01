'use client';

import React, { useState, useEffect } from 'react';
import { getCierrePrevio, guardarCierre } from '@/actions/cierres-actions';
import { Loader2, DollarSign, Building2, PlusCircle, Trash2, CheckCircle2 } from 'lucide-react';

type Transaccion = {
  metodo: string;
  banco: string;
  referencia: string;
  monto: number;
  moneda: string;
};

export default function CierreTurnoForm() {
  const [fecha, setFecha] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
  const [tasaCambio, setTasaCambio] = useState(0);
  const [ventasEsperadas, setVentasEsperadas] = useState(0);
  const [gastosEsperados, setGastosEsperados] = useState(0);
  
  // Realidad Efectivo
  const [efectivoBs, setEfectivoBs] = useState<number>(0);
  const [efectivoUsd, setEfectivoUsd] = useState<number>(0);
  
  // Lupa de Transacciones (Bancos)
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [nuevoTx, setNuevoTx] = useState<Transaccion>({ metodo: 'PAGO_MOVIL', banco: '', referencia: '', monto: 0, moneda: 'BS' });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. CARGAR DATOS PREVIOS DEL SISTEMA AL CAMBIAR FECHA
  useEffect(() => {
    const fetchCierre = async () => {
      setIsLoading(true);
      try {
        const data = await getCierrePrevio(fecha);
        setTasaCambio(data.tasaCambio);
        setVentasEsperadas(data.ventasTotales);
        setGastosEsperados(data.gastosTotales);
      } catch (err: any) {
        setErrorMsg("Error al obtener datos del sistema.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCierre();
  }, [fecha]);

  // 2. LÓGICA DE TRANSACCIONES (Agregar / Quitar)
  const addTransaccion = () => {
    if (!nuevoTx.banco || !nuevoTx.referencia || nuevoTx.monto <= 0) return;
    setTransacciones([...transacciones, nuevoTx]);
    // Limpiar input
    setNuevoTx({ ...nuevoTx, banco: '', referencia: '', monto: 0 });
  };

  const removeTransaccion = (index: number) => {
    setTransacciones(transacciones.filter((_, i) => i !== index));
  };

  // 3. MATEMÁTICA EN TIEMPO REAL
  // Convertimos todo a BS (Moneda Base) usando la tasa de cambio bloqueada
  const sistemaTotalEsperado = ventasEsperadas - gastosEsperados;
  
  const totalBancosBs = transacciones.filter(t => t.moneda === 'BS').reduce((acc, t) => acc + t.monto, 0);
  const totalBancosUsd = transacciones.filter(t => t.moneda === 'USD').reduce((acc, t) => acc + t.monto, 0);
  
  const totalRealDeclaradoBs = efectivoBs + totalBancosBs + ((efectivoUsd + totalBancosUsd) * tasaCambio);
  const diferencia = totalRealDeclaradoBs - sistemaTotalEsperado;

  // 4. GUARDAR CIERRE
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccess(false);

    const cierreData = {
      fecha_cierre: fecha,
      tasa_cambio: tasaCambio,
      sistema_ventas_brutas: ventasEsperadas,
      sistema_gastos_operativos: gastosEsperados,
      sistema_total_esperado: sistemaTotalEsperado,
      real_efectivo_bs: efectivoBs,
      real_efectivo_usd: efectivoUsd,
      real_bancos_bs: totalBancosBs,
      real_bancos_usd: totalBancosUsd,
      diferencia_total: diferencia
    };

    const res = await guardarCierre(cierreData, transacciones);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccess(true);
      // Reset
      setEfectivoBs(0); setEfectivoUsd(0); setTransacciones([]);
      setTimeout(() => setSuccess(false), 5000);
    }
    setIsSubmitting(false);
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;

  return (
    <div className="w-full max-w-4xl mx-auto bg-gray-50 dark:bg-gray-950 pb-24 relative">
      
      {/* HEADER DE FECHA Y TASA (Read Only) */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Cuadre de Caja</h1>
          <p className="text-gray-500">Conciliación de POS vs Bancos</p>
        </div>
        <div className="flex gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2 font-medium" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Tasa del Día</label>
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-xl px-4 py-2 font-bold select-none cursor-not-allowed">
              Bs. {tasaCambio.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {success && (
        <div className="mb-6 p-4 rounded-2xl bg-green-50 text-green-800 flex items-center gap-3">
          <CheckCircle2 size={24} /> <p className="font-medium">¡Cierre de Turno Guardado Exitosamente!</p>
        </div>
      )}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-800 font-medium">{errorMsg}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* COLUMNA IZQUIERDA: RESUMEN SISTEMA Y EFECTIVO */}
        <div className="space-y-6">
          {/* PANEL 1: LO QUE DICE EL SISTEMA */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><DollarSign className="text-gray-400"/> 1. Resumen del POS</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Ventas Brutas Totales</span> <span>Bs. {ventasEsperadas.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-500 font-medium">
                <span>Gastos Operativos (Pagados)</span> <span>- Bs. {gastosEsperados.toFixed(2)}</span>
              </div>
              <div className="h-px bg-gray-200 dark:bg-gray-700 w-full my-2"></div>
              <div className="flex justify-between text-xl font-black text-gray-900 dark:text-white">
                <span>Total Esperado en Caja</span> <span>Bs. {sistemaTotalEsperado.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* PANEL 2: DECLARACIÓN DE EFECTIVO */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-bold mb-4">2. Billetes en Gaveta</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Efectivo Bs</label>
                <input type="number" inputMode="decimal" value={efectivoBs || ''} onChange={(e) => setEfectivoBs(Number(e.target.value))} className="w-full h-12 bg-gray-50 border rounded-xl px-4 mt-1" placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Efectivo USD ($)</label>
                <input type="number" inputMode="decimal" value={efectivoUsd || ''} onChange={(e) => setEfectivoUsd(Number(e.target.value))} className="w-full h-12 bg-green-50 border-green-200 text-green-700 rounded-xl px-4 mt-1" placeholder="0.00" />
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: CONCILIACIÓN BANCARIA */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Building2 className="text-blue-500"/> 3. Transacciones (La Lupa)</h2>
          
          {/* Formulario para agregar Transacción */}
          <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-2xl mb-6 space-y-3 border border-blue-100 dark:border-blue-900">
            <div className="flex gap-2">
              <select value={nuevoTx.metodo} onChange={(e) => setNuevoTx({...nuevoTx, metodo: e.target.value})} className="h-10 bg-white border rounded-lg px-2 text-sm flex-1">
                <option value="PAGO_MOVIL">Pago Móvil</option>
                <option value="TRANSFERENCIA_BS">Transferencia Bs</option>
                <option value="PUNTO_VENTA">Punto de Venta</option>
                <option value="ZELLE">Zelle</option>
                <option value="TRANSFERENCIA_USD">Transferencia USD</option>
              </select>
              <select value={nuevoTx.moneda} onChange={(e) => setNuevoTx({...nuevoTx, moneda: e.target.value})} className="h-10 bg-white border rounded-lg px-2 text-sm w-24">
                <option value="BS">Bs.</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="Banco (Ej. Banesco)" value={nuevoTx.banco} onChange={(e) => setNuevoTx({...nuevoTx, banco: e.target.value})} className="h-10 bg-white border rounded-lg px-3 text-sm flex-1" />
              <input type="text" placeholder="Ref (4 últ.)" value={nuevoTx.referencia} onChange={(e) => setNuevoTx({...nuevoTx, referencia: e.target.value})} className="h-10 bg-white border rounded-lg px-3 text-sm w-32" />
            </div>
            <div className="flex gap-2">
              <input type="number" inputMode="decimal" placeholder="Monto" value={nuevoTx.monto || ''} onChange={(e) => setNuevoTx({...nuevoTx, monto: Number(e.target.value)})} className="h-10 bg-white border rounded-lg px-3 text-sm flex-1" />
              <button onClick={addTransaccion} className="h-10 bg-blue-600 text-white rounded-lg px-4 flex items-center gap-1 hover:bg-blue-700 text-sm font-bold">
                <PlusCircle size={16}/> Añadir
              </button>
            </div>
          </div>

          {/* Lista Acordeón / Desplegable de Transacciones */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {transacciones.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-4">No hay referencias agregadas.</p>
            ) : (
              transacciones.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded uppercase w-max">{t.metodo}</span>
                    <span className="text-sm font-medium mt-1">{t.banco} - Ref: {t.referencia}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 dark:text-white">{t.monto} {t.moneda}</span>
                    <button onClick={() => removeTransaccion(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* FOOTER FIJO: VEREDICTO */}
      <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 z-50">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase font-bold">Realidad Declarada</span>
            <span className="text-2xl font-black text-gray-900 dark:text-white">Bs. {totalRealDeclaradoBs.toFixed(2)}</span>
          </div>
          <div className="h-10 w-px bg-gray-300"></div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase font-bold">Diferencia</span>
            <span className={`text-2xl font-black ${diferencia === 0 ? 'text-green-500' : diferencia > 0 ? 'text-blue-500' : 'text-red-500'}`}>
              {diferencia > 0 ? '+' : ''}{diferencia.toFixed(2)} Bs.
            </span>
          </div>
        </div>
        
        <button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="w-full sm:w-auto px-8 py-4 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 dark:text-black text-white rounded-2xl font-bold text-lg disabled:opacity-50 transition-all flex justify-center items-center gap-2"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : 'Sellar Cuadre de Caja'}
        </button>
      </div>

    </div>
  );
}
