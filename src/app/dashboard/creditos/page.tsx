'use client';

import React, { useState, useEffect } from 'react';
import { getSedes } from '@/actions/dashboard-actions';
import { getClientesConDeuda, getDetalleDeudaCliente, registrarAbono, getMetodosPago } from '@/actions/creditos-actions';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subWeeks } from 'date-fns';
import { useEmpresa } from '@/components/providers/EmpresaProvider';
import { Calendar as CalendarIcon, Store, Wallet, Search, Check, FileText, ShoppingCart, User, Users, PlusCircle, X } from 'lucide-react';

export default function CreditosPage() {
  const { formatCurrency } = useEmpresa();
  const [sedes, setSedes] = useState<any[]>([]);
  const [metodosDisponibles, setMetodosDisponibles] = useState<string[]>(['Efectivo']);
  const [sedeId, setSedeId] = useState('ALL');
  
  // Rango de Fechas (Para filtrar clientes que deben)
  const [startDate, setStartDate] = useState<Date>(startOfYear(new Date()));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Datos
  const [clientes, setClientes] = useState<any[]>([]);
  const [isLoadingClientes, setIsLoadingClientes] = useState(false);
  
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<any[]>([]);
  const [isLoadingDetalle, setIsLoadingDetalle] = useState(false);

  // Pago
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [facturaPagar, setFacturaPagar] = useState<any>(null);
  const [montoAbonar, setMontoAbonar] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [isPagarLoading, setIsPagarLoading] = useState(false);

  useEffect(() => {
    getSedes().then(setSedes);
    getMetodosPago().then(m => {
      setMetodosDisponibles(m);
      if (m.length > 0) setMetodoPago(m[0]);
    });
    fetchClientes();
  }, []);

  // Fetch Clientes al cambiar filtros
  useEffect(() => {
    fetchClientes();
    setSelectedClienteId(null);
    setDetalle([]);
  }, [sedeId, startDate, endDate]);

  const fetchClientes = async () => {
    setIsLoadingClientes(true);
    const res = await getClientesConDeuda(sedeId, startDate, endDate);
    if (res.success) {
      setClientes(res.data || []);
    }
    setIsLoadingClientes(false);
  };

  const fetchDetalle = async (id: string | null) => {
    setSelectedClienteId(id);
    setIsLoadingDetalle(true);
    const res = await getDetalleDeudaCliente(id, sedeId);
    if (res.success) {
      setDetalle(res.data || []);
    }
    setIsLoadingDetalle(false);
  };

  const handlePagar = async () => {
    if (!facturaPagar || !montoAbonar || isNaN(Number(montoAbonar))) return;
    setIsPagarLoading(true);
    const res = await registrarAbono(facturaPagar.factura_id, Number(montoAbonar), metodoPago);
    setIsPagarLoading(false);
    if (res.success) {
      setShowPagoModal(false);
      setFacturaPagar(null);
      setMontoAbonar('');
      // Refrescar el detalle y los clientes
      fetchDetalle(selectedClienteId);
      fetchClientes();
    } else {
      alert("Error: " + res.error);
    }
  };

  const setPredefinedDate = (type: string) => {
    const today = new Date();
    switch (type) {
      case 'hoy': setStartDate(today); setEndDate(today); break;
      case 'ayer': setStartDate(subDays(today, 1)); setEndDate(subDays(today, 1)); break;
      case 'este_mes': setStartDate(startOfMonth(today)); setEndDate(endOfMonth(today)); break;
      case 'este_ano': setStartDate(startOfYear(today)); setEndDate(endOfYear(today)); break;
      case 'todo': setStartDate(new Date(2000, 0, 1)); setEndDate(new Date(2030, 0, 1)); break;
    }
    setShowDatePicker(false);
  };

  const clienteSeleccionado = clientes.find(c => c.id_cliente === selectedClienteId);

  return (
    <div className="flex h-full w-full bg-neutral-950 text-white overflow-hidden flex-col lg:flex-row relative">
      
      {/* FILTROS (IZQUIERDA) */}
      <div className="w-full lg:w-72 border-r border-neutral-800 bg-neutral-950 flex flex-col shrink-0 overflow-visible">
        <div className="p-5 border-b border-neutral-800">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Search size={18} className="text-emerald-400" />
            Filtros
          </h2>
        </div>
        
        <div className="flex-1 p-5 space-y-6 overflow-visible">
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Sucursal</label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
              <select value={sedeId} onChange={(e) => setSedeId(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 text-white text-sm py-2.5 pl-10 pr-3 rounded-lg focus:outline-none focus:border-emerald-500 appearance-none">
                <option value="ALL">Todas las sedes</option>
                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Fecha de Venta</label>
            <div className="relative">
              <button onClick={() => setShowDatePicker(!showDatePicker)} className="w-full bg-neutral-900 border border-neutral-800 hover:border-neutral-600 text-white text-sm py-2.5 px-3 rounded-lg flex items-center justify-center gap-3 transition-colors">
                <CalendarIcon size={16} className="text-emerald-400" />
                <span className="font-medium">{format(startDate, 'dd/MM/yy')} - {format(endDate, 'dd/MM/yy')}</span>
              </button>
              
              {showDatePicker && (
                <div className="absolute top-full left-0 mt-2 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 w-[300px] p-5 flex flex-col origin-top-left">
                  <div className="space-y-4 mb-4 border-b border-neutral-800 pb-4">
                    <div>
                      <p className="text-xs font-bold text-neutral-400 uppercase mb-2">Inicio</p>
                      <input type="date" value={format(startDate, 'yyyy-MM-dd')} onChange={(e) => {
                          if(e.target.value) {
                            const d = new Date(e.target.value + 'T00:00:00');
                            if(!isNaN(d.getTime())) setStartDate(d);
                          }
                        }} className="w-full bg-neutral-950 border border-neutral-800 text-white text-sm py-2 px-3 rounded-lg [color-scheme:dark]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-400 uppercase mb-2">Fin</p>
                      <input type="date" value={format(endDate, 'yyyy-MM-dd')} onChange={(e) => {
                          if(e.target.value) {
                            const d = new Date(e.target.value + 'T00:00:00');
                            if(!isNaN(d.getTime())) setEndDate(d);
                          }
                        }} className="w-full bg-neutral-950 border border-neutral-800 text-white text-sm py-2 px-3 rounded-lg [color-scheme:dark]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={()=>setPredefinedDate('este_mes')} className="text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 px-2 py-1.5 rounded bg-neutral-950">Este Mes</button>
                    <button onClick={()=>setPredefinedDate('este_ano')} className="text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 px-2 py-1.5 rounded bg-neutral-950">Este Año</button>
                    <button onClick={()=>setPredefinedDate('todo')} className="col-span-2 text-sm font-bold text-emerald-400 hover:bg-neutral-800 px-2 py-1.5 rounded bg-neutral-950">Todo el Historial</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* LISTA DE DEUDORES (CENTRO) */}
      <div className="w-full lg:w-1/3 border-r border-neutral-800 bg-neutral-950 flex flex-col shrink-0">
        <div className="p-5 border-b border-neutral-800 flex justify-between items-center">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users size={18} className="text-emerald-400" />
            Cuentas por Cobrar
          </h2>
          <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-1 rounded-full">
            {clientes.length}
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-neutral-900/30">
          {isLoadingClientes ? (
            <p className="text-neutral-500 text-center py-10 text-sm font-medium">Cargando...</p>
          ) : clientes.length === 0 ? (
            <p className="text-neutral-500 text-center py-10 text-sm font-medium">No hay deudas en este período.</p>
          ) : (
            clientes.map((c, i) => (
              <button 
                key={i}
                onClick={() => fetchDetalle(c.id_cliente)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedClienteId === c.id_cliente 
                  ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                  : 'bg-neutral-900 border-neutral-800 hover:border-neutral-600'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className={`font-bold ${selectedClienteId === c.id_cliente ? 'text-emerald-400' : 'text-white'}`}>{c.nombre_cliente}</h3>
                  <span className="font-black text-rose-400">{formatCurrency(c.monto_adeudado || 0)}</span>
                </div>
                <p className="text-xs text-neutral-500">Última compra: {format(new Date(c.ultima_compra), 'dd/MM/yyyy')}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* DETALLE (DERECHA) */}
      <div className="flex-1 flex flex-col bg-neutral-950 overflow-hidden">
        {!selectedClienteId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-50">
            <Wallet size={48} className="text-neutral-600 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Selecciona un deudor</h2>
            <p className="text-neutral-400">Haz clic en un cliente para ver sus facturas y registrar pagos.</p>
          </div>
        ) : (
          <>
            <div className="p-6 border-b border-neutral-800 bg-neutral-900/50">
              <h2 className="text-2xl font-black text-white">{clienteSeleccionado?.nombre_cliente}</h2>
              <p className="text-rose-400 font-bold mt-1">Deuda Total: {formatCurrency(clienteSeleccionado?.monto_adeudado || 0)}</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoadingDetalle ? (
                <p className="text-neutral-500 text-center py-10 font-medium">Cargando facturas...</p>
              ) : (
                detalle.map((fac, i) => (
                  <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="p-4 border-b border-neutral-800 bg-neutral-900/80 flex flex-wrap justify-between items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <FileText size={16} className="text-indigo-400" />
                          <h3 className="font-bold text-white">Factura {fac.numero_documento}</h3>
                          <span className="bg-neutral-800 text-neutral-400 text-xs px-2 py-0.5 rounded">{fac.sede_nombre}</span>
                        </div>
                        <p className="text-xs text-neutral-500">{format(new Date(fac.fecha_venta), 'dd/MM/yyyy HH:mm')}</p>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs font-bold text-neutral-400 uppercase">Total Factura</p>
                          <p className="font-medium text-white">{formatCurrency(fac.total_factura || 0)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-rose-500 uppercase">Falta por Pagar</p>
                          <p className="font-black text-rose-400 text-lg">{formatCurrency(fac.saldo_pendiente || 0)}</p>
                        </div>
                        <button 
                          onClick={() => { setFacturaPagar(fac); setMontoAbonar(fac.saldo_pendiente); setShowPagoModal(true); }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg flex items-center gap-2 transition-colors"
                        >
                          <PlusCircle size={16} /> Abonar
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-neutral-950">
                      <p className="text-xs font-bold text-neutral-500 uppercase mb-3 flex items-center gap-2"><ShoppingCart size={14} /> Qué Llevó</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {fac.productos_detalle?.map((p:any, j:number) => (
                          <div key={j} className="flex justify-between items-center p-2 rounded bg-neutral-900/50 border border-neutral-800/50">
                            <span className="text-sm font-medium text-neutral-300 truncate pr-2">{p.cantidad}x {p.producto}</span>
                            <span className="text-sm font-bold text-neutral-400">{formatCurrency(p.total || 0)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* MODAL DE PAGO */}
      {showPagoModal && facturaPagar && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowPagoModal(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white">
              <X size={20} />
            </button>
            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2"><Wallet className="text-emerald-400" /> Registrar Abono</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase block mb-1">Monto a Abonar ($)</label>
                <input 
                  type="number" 
                  value={montoAbonar} 
                  onChange={(e) => setMontoAbonar(e.target.value)} 
                  max={facturaPagar.saldo_pendiente}
                  className="w-full bg-neutral-950 border border-emerald-500/30 focus:border-emerald-500 text-emerald-400 font-black text-xl py-3 px-4 rounded-xl outline-none transition-colors"
                />
                <p className="text-xs text-neutral-500 mt-1">Saldo pendiente máximo: ${facturaPagar.saldo_pendiente}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase block mb-1">Método de Pago</label>
                <select 
                  value={metodoPago} 
                  onChange={(e) => setMetodoPago(e.target.value)} 
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-neutral-600 text-white font-medium py-3 px-4 rounded-xl outline-none appearance-none"
                >
                  {metodosDisponibles.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={handlePagar}
                disabled={isPagarLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg mt-4 transition-colors"
              >
                {isPagarLoading ? 'Procesando...' : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
