
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { getSedes } from "@/actions/dashboard-actions";
import { getProveedoresConDeuda, getFacturasProveedor, registrarPagoProveedor, getHistoricoProveedores, getTodosProveedores, crearFacturaProveedor, crearProveedorRapido } from "./actions";
import { useEmpresa } from "@/components/providers/EmpresaProvider";
import { Store, Wallet, Search, Check, FileText, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Clock, Activity, PlusCircle, X } from "lucide-react";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";

export default function ProveedoresPage() {
  const { formatCurrency } = useEmpresa();
  const [sedes, setSedes] = useState<any[]>([]);
  const [sedeId, setSedeId] = useState("ALL");
  
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [facturasProveedor, setFacturasProveedor] = useState<any[]>([]);
  const [loadingFacturas, setLoadingFacturas] = useState(false);

  const [showPagoModal, setShowPagoModal] = useState(false);
  const [facturaPagar, setFacturaPagar] = useState<any>(null);
  const [montoAbonar, setMontoAbonar] = useState("");
  const [metodoPago, setMetodoPago] = useState("Transferencia");
  const [referencia, setReferencia] = useState("");
  const [bancoOrigen, setBancoOrigen] = useState("");
  const [isPagarLoading, setIsPagarLoading] = useState(false);

  const [isCreatingFac, setIsCreatingFac] = useState(false);
  const [newFacProveedor, setNewFacProveedor] = useState("");
  const [newFacSede, setNewFacSede] = useState("");
  const [newFacConcepto, setNewFacConcepto] = useState("");
  const [newFacTotal, setNewFacTotal] = useState("");
  const [newFacNumero, setNewFacNumero] = useState("");
  const [newFacFecha, setNewFacFecha] = useState(new Date().toISOString().split("T")[0]);
  const [todosProveedores, setTodosProveedores] = useState<any[]>([]);
  const [isSubmitCreating, setIsSubmitCreating] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchInit = async () => {
    setLoading(true);
    setPage(1);
    
    // Solo cargar sedes e histórico si no están
    if (sedes.length === 0) {
      const s = await getSedes();
      setSedes(s);
      if (s.length > 0) setNewFacSede(s[0].id);
    }
    if (historico.length === 0) {
      const histRes = await getHistoricoProveedores(6);
      if (histRes.success) setHistorico((histRes.data || []).reverse());
      const provRes = await getTodosProveedores();
      if (provRes.success) setTodosProveedores(provRes.data || []);
    }

    const res = await getProveedoresConDeuda(sedeId, 1, 20, debouncedSearch);
    if (res.success) {
      setProveedores(res.data || []);
      setTotalCount(res.totalCount || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInit();
  }, [sedeId, debouncedSearch]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const res = await getProveedoresConDeuda(sedeId, nextPage, 20, debouncedSearch);
    if (res.success) {
      setProveedores(prev => [...prev, ...(res.data || [])]);
      setTotalCount(res.totalCount || 0);
      setPage(nextPage);
    }
    setLoadingMore(false);
  }, [loadingMore, page, sedeId, debouncedSearch]);;

  const observerTarget = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loadingMore && proveedores.length < totalCount) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [handleLoadMore, loadingMore, proveedores.length, totalCount]);

  const toggleExpand = async (provId: string) => {
    if (expandedId === provId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(provId);
    setLoadingFacturas(true);
    const res = await getFacturasProveedor(provId, sedeId);
    if (res.success) {
      setFacturasProveedor(res.data || []);
    }
    setLoadingFacturas(false);
  };

  const handleOpenPago = (factura: any) => {
    setFacturaPagar(factura);
    setMontoAbonar(factura.saldo_pendiente);
    setMetodoPago("Transferencia");
    setReferencia("");
    setBancoOrigen("");
    setShowPagoModal(true);
  };

  const handlePagar = async () => {
    if (!facturaPagar || !montoAbonar || !metodoPago) return;
    setIsPagarLoading(true);
    const res = await registrarPagoProveedor(facturaPagar.id, Number(montoAbonar), metodoPago, referencia, bancoOrigen);
    if (res.success) {
      setShowPagoModal(false);
      // Reload current list without reset
      const resCli = await getProveedoresConDeuda(sedeId, 1, page * 20, debouncedSearch);
      if (resCli.success) {
        setProveedores(resCli.data || []);
        setTotalCount(resCli.totalCount || 0);
      }
      if (expandedId) {
        setLoadingFacturas(true);
        const fRes = await getFacturasProveedor(expandedId, sedeId);
        if (fRes.success) setFacturasProveedor(fRes.data || []);
        setLoadingFacturas(false);
      }
    } else {
      alert("Error al registrar pago: " + res.error);
    }
    setIsPagarLoading(false);
  };

  const handleCreateFactura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFacProveedor || !newFacSede || !newFacTotal) return;
    
    setIsSubmitCreating(true);
    let targetProvId = newFacProveedor;

    if (newFacProveedor === "NEW") {
      const nombreNuevo = prompt("Ingresa el nombre del nuevo proveedor:");
      if (!nombreNuevo) {
        setIsSubmitCreating(false);
        return;
      }
      const resP = await crearProveedorRapido(nombreNuevo);
      if (resP.success) {
        targetProvId = resP.data!.id;
        const provRes = await getTodosProveedores();
        if (provRes.success) setTodosProveedores(provRes.data || []);
      } else {
        alert("Error creando proveedor: " + resP.error);
        setIsSubmitCreating(false);
        return;
      }
    }

    const res = await crearFacturaProveedor(targetProvId, newFacSede, newFacNumero, newFacConcepto, Number(newFacTotal), newFacFecha);
    if (res.success) {
      setIsCreatingFac(false);
      setNewFacConcepto("");
      setNewFacNumero("");
      setNewFacTotal("");
      const resCli = await getProveedoresConDeuda(sedeId, 1, page * 20, debouncedSearch);
      if (resCli.success) {
        setProveedores(resCli.data || []);
        setTotalCount(resCli.totalCount || 0);
      }
    } else {
      alert("Error creando factura: " + res.error);
    }
    setIsSubmitCreating(false);
  };

  const deudaTotal = proveedores.reduce((acc, p) => acc + Number(p.monto_adeudado || 0), 0);
  const deudaMesPasado = historico.length > 1 ? Number(historico[historico.length - 2].deuda_total || 0) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Store className="text-emerald-500" /> Cuentas por Pagar (Proveedores)
          </h1>
          <p className="text-neutral-400 text-sm mt-1">Controla las deudas de insumos, servicios y alquileres.</p>
        </div>
        <button
          onClick={() => setIsCreatingFac(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-emerald-900/20 flex items-center gap-2"
        >
          <PlusCircle size={18} /> Registrar Deuda / Gasto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-emerald-500/10 group-hover:text-emerald-500/20 transition-colors">
            <Wallet size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-neutral-400">Total Cuentas por Pagar</p>
            <div className="flex items-end gap-3">
              <h2 className="text-3xl font-black text-white tracking-tight">{formatCurrency(deudaTotal)}</h2>
              {!loading && historico.length > 1 && (
                <div className={`flex items-center gap-1 text-sm font-medium mb-1 ${deudaTotal <= deudaMesPasado ? "text-emerald-400" : "text-rose-400"}`}>
                  {deudaTotal <= deudaMesPasado ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                  <span>vs mes ant.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-sm relative overflow-hidden group col-span-1 lg:col-span-2 cursor-pointer hover:border-neutral-700 transition-colors" onClick={() => setShowHistoricoModal(true)}>
          <div className="relative z-10 flex justify-between items-center h-full">
            <div>
              <p className="text-sm font-medium text-neutral-400">Tendencia Histórica (6 Meses)</p>
              <h3 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                <Activity size={18} className="text-indigo-400" /> Ver Gráfica Completa
              </h3>
            </div>
            <div className="h-16 w-32 sm:w-48">
              {!loading && historico.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historico}>
                    <Bar dataKey="deuda_total" radius={[4, 4, 0, 0]}>
                      {historico.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === historico.length - 1 ? "#34d399" : "#4b5563"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-neutral-800 bg-neutral-900/50 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:w-96">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input 
              type="text" 
              placeholder="Buscar proveedor..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-white text-sm py-2 pl-10 pr-4 rounded-xl outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-48">
              <Store size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <select 
                value={sedeId} 
                onChange={e => setSedeId(e.target.value)} 
                className="w-full bg-neutral-950 border border-neutral-800 text-neutral-300 text-sm py-2 pl-9 pr-3 rounded-xl appearance-none outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="ALL">Todas las sedes</option>
                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-4">
             {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-neutral-800/30 animate-pulse rounded-xl border border-neutral-800"></div>)}
          </div>
        ) : proveedores.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <Check size={48} className="text-emerald-500/50 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">¡Todo al día!</h3>
            <p className="text-neutral-400">No tienes cuentas por pagar a proveedores o no hay coincidencias.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800/50">
            {proveedores.map(prov => (
              <div key={prov.id_proveedor} className="group">
                <div 
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-neutral-800/30 transition-colors"
                  onClick={() => toggleExpand(prov.id_proveedor)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-colors">
                      <Store size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg text-white truncate">{prov.nombre_proveedor}</h3>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm text-neutral-400">RIF/Cédula: {prov.rif || "N/A"}</p>
                        {prov.sedes_involucradas && <p className="text-xs text-neutral-500 font-medium">Sedes: {prov.sedes_involucradas}</p>}
                        <p className="text-sm text-neutral-500">{prov.facturas_pendientes} {prov.facturas_pendientes === 1 ? "factura pendiente" : "facturas pendientes"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/3">
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase text-neutral-500 mb-1">Total Adeudado</p>
                      <p className="font-black text-rose-400 text-lg">{formatCurrency(prov.monto_adeudado)}</p>
                    </div>
                    <button className="text-neutral-500 hover:text-white transition-colors p-2 rounded-full hover:bg-neutral-700">
                      {expandedId === prov.id_proveedor ? <ChevronUp /> : <ChevronDown />}
                    </button>
                  </div>
                </div>

                {expandedId === prov.id_proveedor && (
                  <div className="bg-neutral-950/50 border-t border-neutral-800 p-5 px-6 sm:px-20">
                    <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <FileText size={16} /> Facturas Pendientes
                    </h4>
                    
                    {loadingFacturas ? (
                      <div className="space-y-3">
                         {[1,2].map(i => <div key={i} className="h-16 bg-neutral-900 animate-pulse rounded-xl border border-neutral-800"></div>)}
                      </div>
                    ) : facturasProveedor.length === 0 ? (
                      <div className="text-neutral-500 text-sm py-4">No hay facturas detalladas (Revisa si están en el sistema).</div>
                    ) : (
                      <div className="space-y-3">
                        {facturasProveedor.map(fac => (
                          <div key={fac.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-neutral-700 transition-colors">
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-white">{fac.concepto || "Factura / Deuda"}</h5>
                                {fac.numero_factura && <span className="text-xs bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded">Nº {fac.numero_factura}</span>}
                              </div>
                              <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1"><Clock size={12} /> {format(new Date(fac.fecha_emision), "dd/MM/yyyy")}</p>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-xs font-semibold text-neutral-500">Total: {formatCurrency(fac.total)}</p>
                                <p className="font-black text-rose-400">{formatCurrency(fac.saldo_pendiente)}</p>
                              </div>
                              <button 
                                onClick={() => handleOpenPago(fac)}
                                className="bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white border border-emerald-600/30 px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
                              >
                                Pagar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {!loading && proveedores.length < totalCount && (
              <div ref={observerTarget} className="p-5">
                <div className="h-20 bg-neutral-800/30 animate-pulse rounded-xl border border-neutral-800 w-full"></div>
              </div>
            )}
          </div>
        )}
      </div>

      {showHistoricoModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-4xl shadow-2xl relative">
            <button onClick={() => setShowHistoricoModal(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white">
              <X size={20} />
            </button>
            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2"><Activity className="text-indigo-400" /> Histórico de Cuentas por Pagar (6 Meses)</h2>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historico} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="mes" stroke="#6b7280" tick={{fontSize: 12}} />
                  <RechartsTooltip 
                    formatter={(value: any) => [formatCurrency(Number(value)), "Deuda Total"]}
                    contentStyle={{ backgroundColor: "#171717", borderColor: "#262626", borderRadius: "8px", color: "#fff" }}
                    itemStyle={{ color: "#34d399", fontWeight: "bold" }}
                  />
                  <Bar dataKey="deuda_total" radius={[4, 4, 0, 0]}>
                    {historico.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === historico.length - 1 ? "#34d399" : "#4b5563"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {showPagoModal && facturaPagar && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowPagoModal(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white">
              <X size={20} />
            </button>
            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2"><Wallet className="text-emerald-400" /> Registrar Pago a Proveedor</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase block mb-1">Monto a Pagar ($)</label>
                <input 
                  type="number" 
                  value={montoAbonar} 
                  onChange={(e) => setMontoAbonar(e.target.value)} 
                  max={facturaPagar.saldo_pendiente}
                  className="w-full bg-neutral-950 border border-emerald-500/30 focus:border-emerald-500 text-emerald-400 font-black text-xl py-3 px-4 rounded-xl outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase block mb-1">Método de Pago</label>
                <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 focus:border-neutral-600 text-white font-medium py-3 px-4 rounded-xl outline-none">
                  <option value="Transferencia">Transferencia</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Zelle">Zelle</option>
                  <option value="Pago Móvil">Pago Móvil</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase block mb-1">Banco Origen</label>
                  <input type="text" value={bancoOrigen} onChange={(e) => setBancoOrigen(e.target.value)} placeholder="Ej. Banesco" className="w-full bg-neutral-950 border border-neutral-800 text-white py-2 px-3 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase block mb-1">Referencia</label>
                  <input type="text" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Ej. 123456" className="w-full bg-neutral-950 border border-neutral-800 text-white py-2 px-3 rounded-lg outline-none" />
                </div>
              </div>
              <button onClick={handlePagar} disabled={isPagarLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg mt-4 transition-colors">
                {isPagarLoading ? "Procesando..." : "Confirmar Pago"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreatingFac && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
            <button onClick={() => setIsCreatingFac(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white">
              <X size={20} />
            </button>
            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2"><PlusCircle className="text-emerald-400" /> Registrar Deuda / Gasto</h2>
            <form onSubmit={handleCreateFactura} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase block mb-1">Proveedor</label>
                <select value={newFacProveedor} onChange={(e) => setNewFacProveedor(e.target.value)} required className="w-full bg-neutral-950 border border-neutral-800 text-white py-2.5 px-3 rounded-lg outline-none">
                  <option value="">Selecciona un proveedor</option>
                  <option value="NEW">+ CREAR NUEVO PROVEEDOR...</option>
                  {todosProveedores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre_comercial}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase block mb-1">Sede Destino</label>
                  <select value={newFacSede} onChange={(e) => setNewFacSede(e.target.value)} required className="w-full bg-neutral-950 border border-neutral-800 text-white py-2.5 px-3 rounded-lg outline-none">
                    {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase block mb-1">Total Deuda ($)</label>
                  <input type="number" step="0.01" value={newFacTotal} onChange={(e) => setNewFacTotal(e.target.value)} required className="w-full bg-neutral-950 border border-emerald-500/30 text-emerald-400 font-bold py-2.5 px-3 rounded-lg outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase block mb-1">Nº Factura (Opcional)</label>
                  <input type="text" value={newFacNumero} onChange={(e) => setNewFacNumero(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 text-white py-2.5 px-3 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase block mb-1">Fecha Emisión</label>
                  <input type="date" value={newFacFecha} onChange={(e) => setNewFacFecha(e.target.value)} required className="w-full bg-neutral-950 border border-neutral-800 text-white py-2.5 px-3 rounded-lg outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase block mb-1">Concepto / Detalle (Opcional)</label>
                <input type="text" value={newFacConcepto} onChange={(e) => setNewFacConcepto(e.target.value)} placeholder="Ej. Alquiler Agosto 2026" className="w-full bg-neutral-950 border border-neutral-800 text-white py-2.5 px-3 rounded-lg outline-none" />
              </div>
              <button type="submit" disabled={isSubmitCreating} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg mt-6 transition-colors">
                {isSubmitCreating ? "Registrando..." : "Guardar Deuda"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



