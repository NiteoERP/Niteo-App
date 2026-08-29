
"use client";

import React, { useState, useEffect } from "react";
import { getSedes } from "@/actions/dashboard-actions";
import { getClientesConDeuda, getDetalleDeudaCliente, registrarAbono, getMetodosPago } from "@/actions/creditos-actions";
import { format, startOfYear } from "date-fns";
import { useEmpresa } from "@/components/providers/EmpresaProvider";
import { Calendar as CalendarIcon, Store, Wallet, Search, Check, FileText, ShoppingCart, User, Users, PlusCircle, X, Download, Hash } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function CreditosPage() {
  const { formatCurrency } = useEmpresa();
  const [sedes, setSedes] = useState<any[]>([]);
  const [metodosDisponibles, setMetodosDisponibles] = useState<string[]>(["Efectivo"]);
  const [sedeId, setSedeId] = useState("ALL");
  
  const [startDate, setStartDate] = useState<Date>(new Date('2020-01-01'));
  const [endDate, setEndDate] = useState<Date>(new Date());
  
  const [clientes, setClientes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Paginación
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingClientes, setIsLoadingClientes] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<any[]>([]);
  const [isLoadingDetalle, setIsLoadingDetalle] = useState(false);

  const [showPagoModal, setShowPagoModal] = useState(false);
  const [facturaPagar, setFacturaPagar] = useState<any>(null);
  const [montoAbonar, setMontoAbonar] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [isPagarLoading, setIsPagarLoading] = useState(false);

  useEffect(() => {
    getSedes().then(s => setSedes(s));
    getMetodosPago().then(m => {
      if (m.success && m.data && m.data.length > 0) {
        setMetodosDisponibles(m.data.map((x:any) => x.nombre));
        setMetodoPago(m.data[0].nombre);
      }
    });
  }, []);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Cargar clientes inicial
  useEffect(() => {
    const fetchInit = async () => {
      setIsLoadingClientes(true);
      setPage(1); // Reset page on new filters
      const res = await getClientesConDeuda(sedeId, startDate, endDate, 1, 20, debouncedSearch);
      if (res.success) {
        setClientes(res.data || []);
        setTotalCount(res.totalCount || 0);
        // Si el cliente seleccionado ya no está, limpiar detalle
        if (selectedClienteId && !res.data?.find((c:any) => c.id_cliente === selectedClienteId)) {
          setSelectedClienteId(null);
          setDetalle([]);
        }
      } else {
        console.error(res.error);
      }
      setIsLoadingClientes(false);
    };
    fetchInit();
  }, [sedeId, startDate, endDate, debouncedSearch]);

  const handleLoadMore = async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const res = await getClientesConDeuda(sedeId, startDate, endDate, nextPage, 20, debouncedSearch);
    if (res.success) {
      setClientes(prev => [...prev, ...(res.data || [])]);
      setTotalCount(res.totalCount || 0);
      setPage(nextPage);
    }
    setIsLoadingMore(false);
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
    if (!facturaPagar || !montoAbonar) return;
    setIsPagarLoading(true);
    const res = await registrarAbono(facturaPagar.id_factura, Number(montoAbonar), metodoPago);
    if (res.success) {
      setShowPagoModal(false);
      // Recargar detalle y lista actual sin resetear
      await fetchDetalle(selectedClienteId);
      const resCli = await getClientesConDeuda(sedeId, startDate, endDate, 1, page * 20, debouncedSearch);
      if (resCli.success) {
        setClientes(resCli.data || []);
        setTotalCount(resCli.totalCount || 0);
      }
    } else {
      alert("Error: " + res.error);
    }
    setIsPagarLoading(false);
  };

  const clienteSeleccionado = clientes.find(c => c.id_cliente === selectedClienteId);

  const generatePDF = () => {
    if (!clienteSeleccionado) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Estado de Cuenta: ${clienteSeleccionado.nombre_cliente}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Deuda Total: ${formatCurrency(clienteSeleccionado.monto_adeudado)}`, 14, 30);
    doc.text(`Fecha del Reporte: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 38);

    const tableData = detalle.map(fac => [
      fac.numero_documento,
      format(new Date(fac.fecha_venta), "dd/MM/yyyy"),
      formatCurrency(fac.total_factura || 0),
      formatCurrency(fac.saldo_pendiente || 0)
    ]);

    autoTable(doc, {
      startY: 45,
      head: [["Factura", "Fecha", "Total", "Deuda"]],
      body: tableData,
    });
    doc.save(`Estado_Cuenta_${clienteSeleccionado.nombre_cliente.replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
      
      {/* SIDEBAR CLIENTES */}
      <div className="w-full lg:w-[400px] flex flex-col bg-neutral-950 border-r border-neutral-800">
        <div className="p-4 border-b border-neutral-800 space-y-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Users className="text-emerald-500" /> Cuentas por Cobrar
            </h1>
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Store size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <select 
                value={sedeId} 
                onChange={e => setSedeId(e.target.value)} 
                className="w-full bg-neutral-900 border border-neutral-800 text-neutral-300 text-sm py-2 pl-9 pr-3 rounded-lg appearance-none outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="ALL">Todas las sedes</option>
                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          </div>
          
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 text-white text-sm py-2 pl-10 pr-4 rounded-xl outline-none focus:border-emerald-500 transition-colors placeholder-neutral-600"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" onScroll={(e) => {
          const target = e.currentTarget;
          if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50 && !isLoadingMore && clientes.length < totalCount) {
            handleLoadMore();
          }
        }}>
          {isLoadingClientes ? (
            // Skeleton Loader
            [1,2,3,4,5,6].map((i) => (
              <div key={i} className="w-full p-4 rounded-xl border border-neutral-800 bg-neutral-900/30 animate-pulse h-24"></div>
            ))
          ) : clientes.length === 0 ? (
            <p className="text-neutral-500 text-center py-10 text-sm font-medium">No hay deudas o clientes coincidentes.</p>
          ) : (
            clientes.map((cli) => (
              <button
                key={cli.id_cliente}
                onClick={() => fetchDetalle(cli.id_cliente)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedClienteId === cli.id_cliente 
                    ? "bg-emerald-900/20 border-emerald-500/50 shadow-lg" 
                    : "bg-neutral-900/50 border-neutral-800 hover:bg-neutral-900"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className={`font-black uppercase truncate pr-2 ${selectedClienteId === cli.id_cliente ? "text-emerald-400" : "text-white"}`}>{cli.nombre_cliente}</h3>
                    {cli.sedes_involucradas && <p className="text-xs text-neutral-500 font-medium">{cli.sedes_involucradas}</p>}
                  </div>
                  <span className={`font-bold ${selectedClienteId === cli.id_cliente ? "text-rose-400" : "text-rose-500"}`}>{formatCurrency(cli.monto_adeudado)}</span>
                </div>
                <p className="text-xs text-neutral-500">
                  Última compra: {cli.ultima_compra ? format(new Date(cli.ultima_compra), "dd/MM/yyyy") : "-"}
                </p>
              </button>
            ))
          )}
          
          {!isLoadingClientes && isLoadingMore && (
            <div className="w-full p-4 rounded-xl border border-neutral-800 bg-neutral-900/30 animate-pulse h-24"></div>
          )}
        </div>
      </div>

      {/* DETALLE (DERECHA) */}
      <div className="flex-1 flex flex-col bg-neutral-950 overflow-hidden">
        {!selectedClienteId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-50">
            <Wallet size={48} className="text-neutral-600 mb-4" />
            <h2 className="text-xl font-bold text-neutral-400">Selecciona un cliente</h2>
            <p className="text-sm text-neutral-500 mt-2">Haz clic en un cliente de la lista para ver sus facturas y registrar pagos.</p>
          </div>
        ) : (
          <>
            <div className="p-6 border-b border-neutral-800 bg-neutral-950/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">{clienteSeleccionado?.nombre_cliente}</h2>
                <p className="text-rose-400 font-bold mt-1">Deuda Total: {formatCurrency(clienteSeleccionado?.monto_adeudado || 0)}</p>
              </div>
              <button
                onClick={generatePDF}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                <Download size={16} /> Exportar PDF
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoadingDetalle ? (
                <div className="space-y-6">
                   {[1,2].map(i => <div key={i} className="h-40 bg-neutral-900/50 border border-neutral-800 rounded-xl animate-pulse"></div>)}
                </div>
              ) : (
                detalle.map((fac, i) => (
                  <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="p-4 border-b border-neutral-800 bg-neutral-900/80 flex flex-wrap justify-between items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <FileText size={16} className="text-indigo-400" />
                          <h3 className="font-bold text-white">Factura {fac.numero_documento}</h3>
                            {fac.numero_orden && (<span className="flex items-center gap-1 bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 rounded border border-indigo-500/30"><Hash size={12} /> {fac.numero_orden}</span>)}
                          <span className="bg-neutral-800 text-neutral-400 text-xs px-2 py-0.5 rounded">{fac.sede_nombre}</span>
                        </div>
                        <p className="text-xs text-neutral-500">{format(new Date(fac.fecha_venta), "dd/MM/yyyy HH:mm")}</p>
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
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs font-bold text-neutral-500 uppercase mb-3 flex items-center gap-2"><ShoppingCart size={14} /> Qué Llevó</p>
                          <div className="space-y-2">
                            {fac.productos_detalle?.map((p:any, j:number) => (
                              <div key={j} className="flex justify-between items-center p-2 rounded bg-neutral-900/50 border border-neutral-800/50">
                                <span className="text-sm font-medium text-neutral-300 truncate pr-2">{p.cantidad}x {p.producto}</span>
                                <span className="text-sm font-bold text-neutral-400">{formatCurrency(p.total || 0)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-xs font-bold text-neutral-500 uppercase mb-3 flex items-center gap-2"><Wallet size={14} /> Historial de Abonos</p>
                          <div className="space-y-2">
                            {!fac.abonos_detalle || fac.abonos_detalle.length === 0 ? (
                              <p className="text-sm text-neutral-500 italic p-2">Sin abonos registrados.</p>
                            ) : (
                              fac.abonos_detalle.map((a:any, j:number) => (
                                <div key={j} className="flex justify-between items-center p-2 rounded bg-neutral-900/50 border border-emerald-900/30">
                                  <div>
                                    <span className="text-sm font-medium text-emerald-400 block">{formatCurrency(a.monto)}</span>
                                    <span className="text-xs text-neutral-500">{a.metodo}</span>
                                  </div>
                                  <span className="text-xs font-medium text-neutral-400">{format(new Date(a.fecha), "dd/MM/yy HH:mm")}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

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
                {isPagarLoading ? "Procesando..." : "Confirmar Pago"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


