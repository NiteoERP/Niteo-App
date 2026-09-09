"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { getSedes } from "@/actions/dashboard-actions";
import { getInsumos } from "@/actions/compras-actions";
import {
  getProveedoresConDeuda, getFacturasProveedor, registrarPagoProveedor,
  getHistoricoProveedores, getTodosProveedores, crearFacturaProveedor, crearProveedor,
  crearFacturaProveedorConInsumos, registrarPagoGeneralProveedor
} from "./actions";
import { getTasaBcvAction } from "@/actions/config-actions";
import { useEmpresa } from "@/components/providers/EmpresaProvider";
import {
  Store, Wallet, Search, Check, FileText, ChevronDown, ChevronUp,
  Clock, PlusCircle, X, Plus, User, Phone, MapPin, Hash,
  CreditCard, Building2, AlertCircle, History, DollarSign, Package, CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import MobileCompraForm from "@/components/compras/MobileCompraForm";

// ── Helpers ────────────────────────────────────────────────
function Badge({ label, color = 'neutral' }: { label: string; color?: string }) {
  const map: Record<string, string> = {
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    rose: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    neutral: 'bg-neutral-700 text-neutral-300 border-neutral-700',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${map[color] || map.neutral}`}>
      {label}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────
export default function ProveedoresPage() {
  const { formatCurrency, empresa } = useEmpresa();
  const [sedes, setSedes] = useState<any[]>([]);
  const [sedeId, setSedeId] = useState("ALL");

  const metodosDisponibles = Array.from(new Set([
    ...(Array.isArray(empresa?.metodos_pago) ? empresa.metodos_pago : []),
    'Transferencia', 'Efectivo USD', 'Efectivo Bs', 'Zelle', 'Pago Movil', 'Punto de Venta', 'Binance', 'Cheque'
  ]));

  const [proveedores, setProveedores] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [facturasProveedor, setFacturasProveedor] = useState<any[]>([]);
  const [loadingFacturas, setLoadingFacturas] = useState(false);

  // ── Tab: solo con deuda vs todos ──────────────────────────
  const [soloConDeuda, setSoloConDeuda] = useState(true);
  const [todosProveedores, setTodosProveedores] = useState<any[]>([]);

  // ── Modal: Crear Proveedor ────────────────────────────────
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoRif, setNuevoRif] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [nuevoUbicacion, setNuevoUbicacion] = useState('');
  const [creandoProveedor, setCreandoProveedor] = useState(false);
  const [errorCrear, setErrorCrear] = useState('');

  // ── Modal: Nueva Factura ──────────────────────────────────
  const [showFacturaModal, setShowFacturaModal] = useState(false);
  const [facProveedorId, setFacProveedorId] = useState('');
  const [facSede, setFacSede] = useState('');
  const [facConcepto, setFacConcepto] = useState('');
  const [facTotal, setFacTotal] = useState('');
  const [facNumero, setFacNumero] = useState('');
  const [facFecha, setFacFecha] = useState(new Date().toISOString().split('T')[0]);
  const [facFechaVencimiento, setFacFechaVencimiento] = useState('');
  const [facMoneda, setFacMoneda] = useState<'USD'|'VES'>('USD');
  const [tasaBcv, setTasaBcv] = useState<number>(804.81);
  const [facTasa, setFacTasa] = useState<number>(804.81);
  const [facMetodoPago, setFacMetodoPago] = useState('Por pagar');
  const [enviandoFactura, setEnviandoFactura] = useState(false);
  const [errorFactura, setErrorFactura] = useState('');
  const [facturaTab, setFacturaTab] = useState<'gastos'|'insumos'>('insumos');
  
  // Cart para insumos en factura
  const [facItems, setFacItems] = useState<any[]>([]);
  const [insumosList, setInsumosList] = useState<any[]>([]);
  const [insumoSearch, setInsumoSearch] = useState('');
  const [insumoQty, setInsumoQty] = useState('');
  const [insumoPrecioUnitario, setInsumoPrecioUnitario] = useState('');
  const [insumoCostoTotal, setInsumoCostoTotal] = useState('');
  const [insumoMoneda, setInsumoMoneda] = useState<'USD'|'VES'>('USD');
  const [crearInsumoNuevo, setCrearInsumoNuevo] = useState(false);
  const [nombreInsumoNuevo, setNombreInsumoNuevo] = useState('');
  const [unidadInsumoNueva, setUnidadInsumoNueva] = useState('unid');

  // ── Modal: Pago ───────────────────────────────────────────
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [facturaPagar, setFacturaPagar] = useState<any>(null);
  const [montoAbonar, setMontoAbonar] = useState('');
  const [metodoPago, setMetodoPago] = useState('Transferencia');
  const [referencia, setReferencia] = useState('');
  const [bancoOrigen, setBancoOrigen] = useState('');
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [isPagarLoading, setIsPagarLoading] = useState(false);
  const [errorPago, setErrorPago] = useState('');

  // ── Historial de pagos minimizado por factura ──────────────
  const [expandedPagos, setExpandedPagos] = useState<Record<string, boolean>>({});
  const togglePagos = (facId: string) => {
    setExpandedPagos(prev => ({ ...prev, [facId]: !prev[facId] }));
  };

  // ── Ver historial de facturas saldadas por proveedor ───────
  const [mostrarHistorialPagadas, setMostrarHistorialPagadas] = useState<Record<string, boolean>>({});
  const toggleHistorialPagadas = (provId: string) => {
    setMostrarHistorialPagadas(prev => ({ ...prev, [provId]: !prev[provId] }));
  };

  // ── Modal: Pago General / Cascada FIFO ──────────────────────
  const [showPagoGeneralModal, setShowPagoGeneralModal] = useState(false);
  const [proveedorPagarGeneral, setProveedorPagarGeneral] = useState<any>(null);
  const [montoAbonoGeneral, setMontoAbonoGeneral] = useState('');
  const [metodoPagoGeneral, setMetodoPagoGeneral] = useState('Transferencia');
  const [referenciaGeneral, setReferenciaGeneral] = useState('');
  const [bancoOrigenGeneral, setBancoOrigenGeneral] = useState('');
  const [fechaPagoGeneral, setFechaPagoGeneral] = useState(new Date().toISOString().split('T')[0]);
  const [isPagarGeneralLoading, setIsPagarGeneralLoading] = useState(false);
  const [errorPagoGeneral, setErrorPagoGeneral] = useState('');

  // ── Debounce search ───────────────────────────────────────
  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(h);
  }, [searchTerm]);

  // ── Initial Load ──────────────────────────────────────────
  const fetchInit = useCallback(async () => {
    setLoading(true);
    setPage(1);
    const [sedesRes, provRes, todosRes, tasaRes] = await Promise.all([
      getSedes(),
      getProveedoresConDeuda(sedeId, 1, 20, debouncedSearch),
      getTodosProveedores(),
      getTasaBcvAction(),
    ]);
    if (Array.isArray(sedesRes)) setSedes(sedesRes);
    if (provRes.success) { setProveedores(provRes.data || []); setTotalCount(provRes.totalCount || 0); }
    if (todosRes.success) setTodosProveedores(todosRes.data || []);
    if (tasaRes?.tasa && tasaRes.tasa > 1) {
      setTasaBcv(tasaRes.tasa);
      setFacTasa(tasaRes.tasa);
    }
    setLoading(false);
  }, [sedeId, debouncedSearch]);

  useEffect(() => { fetchInit(); }, [fetchInit]);

  const fetchMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    const res = await getProveedoresConDeuda(sedeId, nextPage, 20, debouncedSearch);
    if (res.success) {
      setProveedores(prev => [...prev, ...(res.data || [])]);
      setPage(nextPage);
    }
    setLoadingMore(false);
  };

  const toggleExpand = async (provId: string) => {
    if (expandedId === provId) { setExpandedId(null); return; }
    setExpandedId(provId);
    setLoadingFacturas(true);
    const res = await getFacturasProveedor(provId, sedeId);
    if (res.success) setFacturasProveedor(res.data || []);
    setLoadingFacturas(false);
  };

  useEffect(() => {
    if (showFacturaModal && insumosList.length === 0) {
      getInsumos().then(res => {
        if (Array.isArray(res)) setInsumosList(res);
      });
    }
  }, [showFacturaModal]);

  // ── Crear Proveedor ───────────────────────────────────────
  const handleCrearProveedor = async () => {
    if (!nuevoNombre.trim()) { setErrorCrear('El nombre es obligatorio'); return; }
    setCreandoProveedor(true);
    setErrorCrear('');
    const res = await crearProveedor({ nombre: nuevoNombre, rif: nuevoRif, telefono: nuevoTelefono, ubicacion: nuevoUbicacion });
    if (res.success) {
      setShowCrearModal(false);
      setNuevoNombre(''); setNuevoRif(''); setNuevoTelefono(''); setNuevoUbicacion('');
      fetchInit();
    } else {
      setErrorCrear(res.error || 'Error al crear proveedor');
    }
    setCreandoProveedor(false);
  };

  // ── Crear Factura ─────────────────────────────────────────
  const handleCrearFactura = async () => {
    if (!facProveedorId) { setErrorFactura('Selecciona un proveedor'); return; }
    
    let totalToSubmit = Number(facTotal);
    if (facturaTab === 'gastos') {
      if (!facTotal || isNaN(totalToSubmit) || totalToSubmit <= 0) { setErrorFactura('Monto inválido'); return; }
    } else {
      if (facItems.length === 0) { setErrorFactura('Añade al menos un insumo'); return; }
      totalToSubmit = facItems.reduce((acc, item) => acc + item.costoTotal, 0);
    }
    
    setEnviandoFactura(true);
    setErrorFactura('');
    
    const tasaFinal = (facTasa && facTasa > 1) ? facTasa : tasaBcv;

    let res;
    if (facturaTab === 'gastos') {
      res = await crearFacturaProveedor(
        facProveedorId, facSede || sedeId, facNumero, facConcepto,
        totalToSubmit, facFecha, facMetodoPago, facMoneda, tasaFinal, facFechaVencimiento
      );
    } else {
      res = await crearFacturaProveedorConInsumos(
        facProveedorId, facSede || sedeId, facNumero, facConcepto,
        facFecha, facMetodoPago, facMoneda, tasaFinal, facFechaVencimiento, facItems
      );
    }

    if (res.success) {
      setShowFacturaModal(false);
      setFacProveedorId(''); setFacConcepto(''); setFacTotal(''); setFacNumero('');
      setFacFecha(new Date().toISOString().split('T')[0]); setFacFechaVencimiento(''); setFacMetodoPago('Por pagar');
      setFacItems([]);
      fetchInit();
      if (expandedId) {
        const r2 = await getFacturasProveedor(expandedId, sedeId);
        if (r2.success) setFacturasProveedor(r2.data || []);
      }
    } else {
      setErrorFactura(res.error || 'Error al registrar factura');
    }
    setEnviandoFactura(false);
  };

  // ── Registrar Pago ────────────────────────────────────────
  const handlePagar = async () => {
    if (!montoAbonar || isNaN(Number(montoAbonar)) || Number(montoAbonar) <= 0) {
      setErrorPago('Monto inválido'); return;
    }
    setIsPagarLoading(true);
    setErrorPago('');
    const res = await registrarPagoProveedor(
      facturaPagar.id, Number(montoAbonar), metodoPago, referencia, bancoOrigen, fechaPago || undefined
    );
    if (res.success) {
      setShowPagoModal(false);
      setMontoAbonar(''); setReferencia(''); setBancoOrigen(''); setFechaPago(new Date().toISOString().split('T')[0]);
      fetchInit();
      if (expandedId) {
        const r2 = await getFacturasProveedor(expandedId, sedeId);
        if (r2.success) setFacturasProveedor(r2.data || []);
      }
    } else {
      setErrorPago(res.error || 'Error al registrar pago');
    }
    setIsPagarLoading(false);
  };

  // ── Registrar Pago General (Cascada FIFO) ──────────────────
  const handlePagarGeneral = async () => {
    if (!montoAbonoGeneral || isNaN(Number(montoAbonoGeneral)) || Number(montoAbonoGeneral) <= 0) {
      setErrorPagoGeneral('Ingresa un monto válido');
      return;
    }
    setIsPagarGeneralLoading(true);
    setErrorPagoGeneral('');
    const targetProvId = proveedorPagarGeneral.id_proveedor || proveedorPagarGeneral.id;
    const res = await registrarPagoGeneralProveedor(
      targetProvId,
      sedeId,
      Number(montoAbonoGeneral),
      metodoPagoGeneral,
      referenciaGeneral || undefined,
      bancoOrigenGeneral || undefined,
      fechaPagoGeneral || undefined
    );
    if (res.success) {
      setShowPagoGeneralModal(false);
      setMontoAbonoGeneral('');
      setReferenciaGeneral('');
      setBancoOrigenGeneral('');
      setFechaPagoGeneral(new Date().toISOString().split('T')[0]);
      fetchInit();
      if (expandedId) {
        const r2 = await getFacturasProveedor(expandedId, sedeId);
        if (r2.success) setFacturasProveedor(r2.data || []);
      }
    } else {
      setErrorPagoGeneral(res.error || 'Error al procesar pago general');
    }
    setIsPagarGeneralLoading(false);
  };

  // ── Helpers ───────────────────────────────────────────────
  const safeDate = (d: string) => { try { return format(new Date(d), 'dd/MM/yyyy'); } catch { return d; } };
  const safeDateTime = (d: string) => { try { return format(new Date(d), 'dd/MM/yyyy HH:mm'); } catch { return d; } };

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Store className="text-emerald-400" /> Proveedores</h1>
          <p className="text-neutral-400 text-sm mt-0.5">Gestiona tus proveedores, facturas y pagos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowFacturaModal(true); setFacturaTab('insumos'); setErrorFactura(''); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors">
            <FileText size={16} /> Nueva Factura
          </button>
          <button onClick={() => setShowCrearModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors">
            <Plus size={16} /> Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar proveedor..."
              className="w-full bg-neutral-950 border border-neutral-800 text-neutral-300 text-sm py-2 pl-9 pr-3 rounded-xl outline-none focus:border-emerald-500"
            />
          </div>
          <div className="relative w-full sm:w-48">
            <Store size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <select value={sedeId} onChange={e => setSedeId(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-neutral-300 text-sm py-2 pl-9 pr-3 rounded-xl appearance-none outline-none focus:border-emerald-500">
              <option className="bg-neutral-900 text-white" value="ALL">Todas las sedes</option>
              {sedes.map(s => <option key={s.id} value={s.id} className="bg-neutral-900 text-white">{s.nombre}</option>)}
            </select>
          </div>
          <div className="flex rounded-xl overflow-hidden border border-neutral-800 text-sm">
            <button onClick={() => setSoloConDeuda(true)}
              className={`px-3 py-2 font-medium transition-colors ${soloConDeuda ? 'bg-rose-600 text-white' : 'bg-neutral-950 text-neutral-400 hover:text-white'}`}>
              Con deuda
            </button>
            <button onClick={() => setSoloConDeuda(false)}
              className={`px-3 py-2 font-medium transition-colors ${!soloConDeuda ? 'bg-neutral-700 text-white' : 'bg-neutral-950 text-neutral-400 hover:text-white'}`}>
              Todos
            </button>
          </div>
        </div>
      </div>

      {/* ── List ── */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-neutral-800/30 animate-pulse rounded-xl border border-neutral-800" />)}
          </div>
        ) : (soloConDeuda ? proveedores : todosProveedores).length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <Check size={48} className="text-emerald-500/50 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">{soloConDeuda ? '¡Todo al día!' : 'Sin proveedores'}</h3>
            <p className="text-neutral-400">{soloConDeuda ? 'No tienes cuentas por pagar.' : 'Aún no has creado ningún proveedor.'}</p>
            {!soloConDeuda && (
              <button onClick={() => setShowCrearModal(true)}
                className="mt-4 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm">
                <Plus size={16} /> Crear primer proveedor
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-neutral-800/50">
            {(soloConDeuda ? proveedores : todosProveedores).map((prov: any) => (
              <div key={prov.id_proveedor || prov.id} className="group">
                <div
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-neutral-800/30 transition-colors"
                  onClick={() => toggleExpand(prov.id_proveedor || prov.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-colors shrink-0">
                      <Store size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-white truncate">{prov.nombre_proveedor || prov.nombre_comercial}</h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-neutral-500 mt-0.5">
                        {(prov.rif || prov.rif_cedula) && <span>RIF: {prov.rif || prov.rif_cedula}</span>}
                        {(prov.numero_contacto) && <span>📞 {prov.numero_contacto}</span>}
                        {prov.facturas_pendientes && <span>{prov.facturas_pendientes} factura(s) pendiente(s)</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 sm:w-auto">
                    {prov.monto_adeudado !== undefined && (
                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase text-neutral-500 mb-0.5">Adeudado</p>
                        <p className="font-black text-rose-400 text-lg">{formatCurrency(prov.monto_adeudado)}</p>
                      </div>
                    )}
                    {prov.monto_adeudado > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProveedorPagarGeneral(prov);
                          setMontoAbonoGeneral(String(prov.monto_adeudado));
                          setFechaPagoGeneral(new Date().toISOString().split('T')[0]);
                          setErrorPagoGeneral('');
                          setShowPagoGeneralModal(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-600/20 whitespace-nowrap"
                      >
                        <Wallet size={14} /> Pagar / Abonar Deuda
                      </button>
                    )}
                    <button className="text-neutral-500 hover:text-white transition-colors p-2 rounded-full hover:bg-neutral-700">
                      {expandedId === (prov.id_proveedor || prov.id) ? <ChevronUp /> : <ChevronDown />}
                    </button>
                  </div>
                </div>

                {/* ── Facturas expandidas ── */}
                {expandedId === (prov.id_proveedor || prov.id) && (() => {
                  const provId = prov.id_proveedor || prov.id;
                  const facturasPendientes = facturasProveedor.filter(f => Number(f.saldo_pendiente) > 0);
                  const facturasPagadas = facturasProveedor.filter(f => Number(f.saldo_pendiente) <= 0);
                  const verPagadas = mostrarHistorialPagadas[provId] || false;

                  const renderFacturaItem = (fac: any) => {
                    const saldado = Number(fac.saldo_pendiente) <= 0;
                    return (
                      <React.Fragment key={fac.id}>
                        <div className={`bg-neutral-900 border rounded-xl p-4 transition-colors ${saldado ? 'border-emerald-500/20 bg-neutral-900/60' : 'border-neutral-800 hover:border-neutral-700'}`}>
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h5 className="font-bold text-white">{fac.concepto || 'Factura / Deuda'}</h5>
                                {fac.numero_factura && <span className="text-xs bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded">Nº {fac.numero_factura}</span>}
                                {saldado && <Badge label="Saldada" color="emerald" />}
                                {!saldado && fac.fecha_vencimiento && (() => {
                                  const now = new Date();
                                  const vDate = new Date(fac.fecha_vencimiento);
                                  const diffDays = Math.ceil((vDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
                                  
                                  if (diffDays < 0) return <Badge label="Vencida" color="rose" />;
                                  if (diffDays <= 7) return <Badge label={`Vence en ${diffDays}d`} color="amber" />;
                                  return <span className="text-xs text-neutral-500 border border-neutral-700 px-2 py-0.5 rounded">Vence: {safeDate(fac.fecha_vencimiento)}</span>;
                                })()}
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                <p className="text-xs text-neutral-500 flex items-center gap-1"><Clock size={12} /> Emisión: {safeDate(fac.fecha_emision)}</p>
                                {fac.pagos && fac.pagos.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => togglePagos(fac.id)}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-2 py-0.5 rounded-lg transition-colors"
                                  >
                                    <History size={11} />
                                    {expandedPagos[fac.id] ? 'Ocultar abonos' : `Ver abonos (${fac.pagos.length})`}
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-xs text-neutral-500">
                                  Total: {formatCurrency(fac.total)}
                                </p>
                                <p className={`font-black text-lg ${saldado ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(fac.saldo_pendiente)}</p>
                                <p className="text-xs text-neutral-600">{saldado ? 'saldada' : 'pendiente'}</p>
                              </div>
                              {!saldado && (
                                <button
                                  onClick={() => { setFacturaPagar(fac); setMontoAbonar(String(fac.saldo_pendiente)); setShowPagoModal(true); }}
                                  className="bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white border border-emerald-600/30 px-3 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap">
                                  + Abonar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* ── Historial de pagos por factura (Minimizado) ── */}
                        {fac.pagos && fac.pagos.length > 0 && expandedPagos[fac.id] && (
                          <div className="bg-neutral-950/80 p-3.5 rounded-b-xl border border-neutral-800 border-t-0 -mt-2 ml-4 mr-2 shadow-inner">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-bold text-neutral-400 uppercase flex items-center gap-1"><History size={12} className="text-indigo-400" /> Detalle de Abonos a esta Factura</p>
                              <button
                                type="button"
                                onClick={() => togglePagos(fac.id)}
                                className="text-[11px] text-neutral-500 hover:text-white"
                              >
                                Ocultar
                              </button>
                            </div>
                            <div className="space-y-1.5">
                              {fac.pagos.map((pago: any) => (
                                <div key={pago.id} className="flex flex-wrap justify-between items-center text-xs py-1.5 px-3 border border-neutral-800/60 bg-neutral-900/60 rounded-lg gap-x-4">
                                  <span className="text-neutral-400 font-mono">{safeDateTime(pago.fecha_pago || pago.created_at)}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-white font-medium">{pago.metodo_pago}</span>
                                    {pago.banco_origen && <span className="text-neutral-500">({pago.banco_origen})</span>}
                                    {pago.referencia && <span className="text-indigo-400 font-mono">#{pago.referencia}</span>}
                                  </div>
                                  <span className="font-bold text-emerald-400">+{formatCurrency(pago.monto)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  };

                  return (
                    <div className="bg-neutral-950/50 border-t border-neutral-800 p-5 px-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                            <FileText size={16} className="text-rose-400" /> Facturas por Pagar
                          </h4>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                            facturasPendientes.length > 0 
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }`}>
                            {facturasPendientes.length} pendiente{facturasPendientes.length === 1 ? '' : 's'}
                          </span>
                        </div>

                        {/* Esquina superior derecha: Historial de facturas y Agregar factura */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {facturasPagadas.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleHistorialPagadas(provId)}
                              className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all font-semibold ${
                                verPagadas
                                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                                  : 'bg-neutral-900 text-neutral-300 hover:text-white border-neutral-700 hover:border-neutral-600'
                              }`}
                            >
                              <History size={13} className={verPagadas ? "text-white" : "text-indigo-400"} />
                              {verPagadas ? 'Ocultar historial' : `Historial de facturas (${facturasPagadas.length})`}
                            </button>
                          )}
                          <button
                            onClick={() => { setFacProveedorId(provId); setShowFacturaModal(true); setFacturaTab('insumos'); setErrorFactura(''); }}
                            className="text-xs flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-xl transition-colors font-semibold">
                            <Plus size={13} /> Agregar factura
                          </button>
                        </div>
                      </div>

                      {loadingFacturas ? (
                        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-16 bg-neutral-900 animate-pulse rounded-xl border border-neutral-800" />)}</div>
                      ) : facturasProveedor.length === 0 ? (
                        <div className="text-neutral-500 text-sm py-4 text-center">No hay facturas registradas para este proveedor.</div>
                      ) : (
                        <div className="space-y-4">
                          {/* 1. Facturas que faltan por pagar */}
                          {facturasPendientes.length === 0 ? (
                            <div className="text-center py-6 border border-dashed border-neutral-800/90 rounded-2xl bg-neutral-900/30">
                              <CheckCircle2 className="mx-auto text-emerald-400 mb-1.5" size={26} />
                              <p className="text-sm font-semibold text-white">¡No hay facturas pendientes por pagar!</p>
                              <p className="text-xs text-neutral-500 mt-0.5">Todas las facturas de este proveedor se encuentran saldadas.</p>
                              {facturasPagadas.length > 0 && !verPagadas && (
                                <button
                                  type="button"
                                  onClick={() => toggleHistorialPagadas(provId)}
                                  className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1.5 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20 hover:border-indigo-500/40 transition-colors"
                                >
                                  <History size={13} /> Ver {facturasPagadas.length} factura(s) en el historial
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {facturasPendientes.map((fac: any) => renderFacturaItem(fac))}
                            </div>
                          )}

                          {/* 2. Sección desplegable: Historial de facturas pagadas */}
                          {verPagadas && facturasPagadas.length > 0 && (
                            <div className="mt-5 pt-4 border-t border-neutral-800 space-y-3">
                              <div className="flex items-center justify-between">
                                <h5 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <History size={13} className="text-emerald-400" /> Historial de Facturas Pagadas / Saldadas ({facturasPagadas.length})
                                </h5>
                                <button
                                  type="button"
                                  onClick={() => toggleHistorialPagadas(provId)}
                                  className="text-[11px] text-neutral-500 hover:text-neutral-300"
                                >
                                  Ocultar
                                </button>
                              </div>
                              <div className="space-y-3 opacity-90">
                                {facturasPagadas.map((fac: any) => renderFacturaItem(fac))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}

            {soloConDeuda && !loading && proveedores.length < totalCount && (
              <div className="p-4 text-center">
                <button onClick={fetchMore} disabled={loadingMore}
                  className="text-sm text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-6 py-2 rounded-xl transition-colors">
                  {loadingMore ? 'Cargando...' : 'Ver más'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════
          MODAL: Crear Proveedor
      ════════════════════════════════════ */}
      {showCrearModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-neutral-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><User size={18} className="text-emerald-400" /> Nuevo Proveedor</h3>
              <button onClick={() => setShowCrearModal(false)} className="text-neutral-400 hover:text-white"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1.5">Nombre Comercial *</label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input type="text" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)}
                    placeholder="Ej. Distribuidora Central"
                    className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1.5">RIF / Cédula</label>
                  <div className="relative">
                    <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input type="text" value={nuevoRif} onChange={e => setNuevoRif(e.target.value)}
                      placeholder="J-00000000-0"
                      className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl pl-8 pr-4 py-2.5 focus:outline-none focus:border-emerald-500 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1.5">Teléfono</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input type="tel" value={nuevoTelefono} onChange={e => setNuevoTelefono(e.target.value)}
                      placeholder="04XX-0000000"
                      className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl pl-8 pr-4 py-2.5 focus:outline-none focus:border-emerald-500 text-sm" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1.5">Dirección / Ubicación</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-3 text-neutral-500" />
                  <textarea rows={2} value={nuevoUbicacion} onChange={e => setNuevoUbicacion(e.target.value)}
                    placeholder="Dirección (opcional)"
                    className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl pl-8 pr-4 py-2.5 focus:outline-none focus:border-emerald-500 text-sm resize-none" />
                </div>
              </div>
              {errorCrear && <p className="text-rose-400 text-sm flex items-center gap-2"><AlertCircle size={14} /> {errorCrear}</p>}
            </div>
            <div className="p-6 border-t border-neutral-800 flex gap-3 justify-end">
              <button onClick={() => setShowCrearModal(false)} className="px-5 py-2.5 rounded-xl text-neutral-300 hover:bg-neutral-800 text-sm">Cancelar</button>
              <button onClick={handleCrearProveedor} disabled={creandoProveedor}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50">
                {creandoProveedor ? 'Guardando...' : <><Plus size={16} /> Crear Proveedor</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          MODAL: Nueva Factura a Proveedor
      ════════════════════════════════════ */}
      {showFacturaModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between p-6 border-b border-neutral-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><FileText size={18} className="text-indigo-400" /> Nueva Factura / Deuda</h3>
              <button onClick={() => setShowFacturaModal(false)} className="text-neutral-400 hover:text-white"><X size={22} /></button>
            </div>
            <div className="px-6 pt-4">
              <div className="grid grid-cols-2 p-1 bg-black/40 border border-neutral-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setFacturaTab('insumos')}
                  className={`py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                    facturaTab === 'insumos'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Package size={16} /> Insumos / Inventario
                </button>
                <button
                  type="button"
                  onClick={() => setFacturaTab('gastos')}
                  className={`py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                    facturaTab === 'gastos'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <FileText size={16} /> Gasto / Servicio
                </button>
              </div>
            </div>
              
            <div className="p-6 space-y-4 pt-4">
              {/* Campos comunes (siempre visibles) */}
              <div>
                <label className="block text-sm text-neutral-400 mb-1.5">Proveedor *</label>
                <select value={facProveedorId} onChange={e => setFacProveedorId(e.target.value)}
                  className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 appearance-none">
                  <option className="bg-neutral-900 text-white" value="">Selecciona un proveedor...</option>
                  {todosProveedores.map(p => <option key={p.id} value={p.id} className="bg-neutral-900 text-white">{p.nombre_comercial}{p.rif_cedula ? ` (${p.rif_cedula})` : ''}</option>)}
                </select>
                <button onClick={() => { setShowFacturaModal(false); setShowCrearModal(true); }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 mt-1.5 flex items-center gap-1">
                  <Plus size={12} /> Crear nuevo proveedor
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1.5">Nº Factura</label>
                  <input type="text" value={facNumero} onChange={e => setFacNumero(e.target.value)}
                    placeholder="Opcional"
                    className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1.5">Fecha</label>
                  <input type="date" value={facFecha} onChange={e => setFacFecha(e.target.value)}
                    className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 [color-scheme:dark] text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1.5">Vencimiento</label>
                  <input type="date" value={facFechaVencimiento} onChange={e => setFacFechaVencimiento(e.target.value)}
                    className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 [color-scheme:dark] text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={facMoneda === 'VES' ? "sm:col-span-1" : "sm:col-span-2"}>
                  <label className="block text-sm text-neutral-400 mb-1.5">Concepto / Descripción</label>
                  <input type="text" value={facConcepto} onChange={e => setFacConcepto(e.target.value)}
                    placeholder="Ej. Compra de materia prima"
                    className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1.5">Moneda Factura</label>
                  <select value={facMoneda} onChange={e => setFacMoneda(e.target.value as 'USD'|'VES')}
                    className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 text-sm font-semibold">
                    <option className="bg-neutral-900 text-white" value="USD">USD ($)</option>
                    <option className="bg-neutral-900 text-white" value="VES">VES (Bolívares Bs.)</option>
                  </select>
                </div>
                {facMoneda === 'VES' && (
                  <div>
                    <label className="block text-sm text-amber-400 mb-1.5 font-medium flex items-center justify-between">
                      <span>Tasa de Cambio</span>
                      <span className="text-[10px] text-amber-400/80 font-mono bg-amber-500/20 px-1.5 py-0.5 rounded">BCV</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        value={facTasa}
                        onChange={e => setFacTasa(parseFloat(e.target.value) || 0)}
                        placeholder="804.81"
                        className="w-full bg-amber-500/10 border border-amber-500/40 text-amber-300 font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400 text-sm"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-400/70 font-semibold">Bs/$</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Campos específicos por tab */}
              {facturaTab === 'gastos' ? (
                <div className="pt-2 border-t border-neutral-800 space-y-2">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1.5">
                      Monto Total ({facMoneda === 'VES' ? 'Bolívares Bs.' : 'Dólares USD'}) *
                    </label>
                    <input type="number" min="0" step="any" value={facTotal} onChange={e => setFacTotal(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 text-sm font-semibold" />
                  </div>
                  {facMoneda === 'VES' && Number(facTotal) > 0 && facTasa > 0 && (
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs flex justify-between items-center text-indigo-300">
                      <span>Equivalente en Dólares (registrado como deuda):</span>
                      <span className="font-bold text-sm text-white">
                        $ {(Number(facTotal) / facTasa).toFixed(2)} USD
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 pt-2 border-t border-neutral-800">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-white flex items-center gap-2">
                      <Package size={15} className="text-indigo-400" /> Insumos / Productos
                    </label>
                    <button
                      type="button"
                      onClick={() => { setCrearInsumoNuevo(!crearInsumoNuevo); setInsumoSearch(''); }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      {crearInsumoNuevo ? '← Seleccionar existente' : '+ Crear nuevo insumo'}
                    </button>
                  </div>

                  {/* Add Item form */}
                  <div className="bg-neutral-950/60 p-3.5 rounded-2xl border border-neutral-800/80 space-y-3">
                    {crearInsumoNuevo ? (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Nombre del nuevo insumo..."
                          value={nombreInsumoNuevo}
                          onChange={e => setNombreInsumoNuevo(e.target.value)}
                          className="bg-black/50 border border-neutral-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                        />
                        <select
                          value={unidadInsumoNueva}
                          onChange={e => setUnidadInsumoNueva(e.target.value)}
                          className="bg-black/50 border border-neutral-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                        >
                          <option value="kg">kg (Kilogramos)</option>
                          <option value="g">g (Gramos)</option>
                          <option value="l">l (Litros)</option>
                          <option value="ml">ml (Mililitros)</option>
                          <option value="unid">unid (Unidades)</option>
                          <option value="paq">paq (Paquetes)</option>
                        </select>
                      </div>
                    ) : (
                      <div>
                        <select 
                          value={insumoSearch} 
                          onChange={(e) => {
                            const selId = e.target.value;
                            setInsumoSearch(selId);
                            const ins = insumosList.find(i => i.id === selId);
                            if (ins?.costo_promedio && ins.costo_promedio > 0) {
                              setInsumoPrecioUnitario(ins.costo_promedio.toString());
                              const q = parseFloat(insumoQty);
                              if (!isNaN(q) && q > 0) {
                                setInsumoCostoTotal((q * ins.costo_promedio).toFixed(2));
                              }
                            }
                          }}
                          className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">Selecciona un insumo...</option>
                          {insumosList.map(i => (
                            <option key={i.id} value={i.id}>
                              {i.nombre} ({i.cantidad_actual || 0} {i.unidad_medida})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {(() => {
                      const sel = insumosList.find(i => i.id === insumoSearch);
                      const unit = crearInsumoNuevo ? unidadInsumoNueva : (sel?.unidad_medida || '');
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                              Cantidad {unit ? `(${unit})` : ''}
                            </label>
                            <input
                              type="number"
                              placeholder="0.00"
                              min="0.001"
                              step="any"
                              value={insumoQty}
                              onChange={e => {
                                const val = e.target.value;
                                setInsumoQty(val);
                                const q = parseFloat(val);
                                const p = parseFloat(insumoPrecioUnitario);
                                if (!isNaN(q) && q > 0 && !isNaN(p) && p >= 0) {
                                  setInsumoCostoTotal((q * p).toFixed(2));
                                }
                              }}
                              className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                              Precio Unitario ({facMoneda === 'VES' ? 'Bs.' : '$'})
                            </label>
                            <input
                              type="number"
                              placeholder="0.00"
                              min="0.0001"
                              step="any"
                              value={insumoPrecioUnitario}
                              onChange={e => {
                                const val = e.target.value;
                                setInsumoPrecioUnitario(val);
                                const p = parseFloat(val);
                                const q = parseFloat(insumoQty);
                                if (!isNaN(p) && p >= 0 && !isNaN(q) && q > 0) {
                                  setInsumoCostoTotal((q * p).toFixed(2));
                                }
                              }}
                              className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                              Costo Total ({facMoneda === 'VES' ? 'Bs.' : '$'})
                            </label>
                            <input
                              type="number"
                              placeholder="0.00"
                              min="0.01"
                              step="any"
                              value={insumoCostoTotal}
                              onChange={e => {
                                const val = e.target.value;
                                setInsumoCostoTotal(val);
                                const t = parseFloat(val);
                                const q = parseFloat(insumoQty);
                                if (!isNaN(t) && t >= 0 && !isNaN(q) && q > 0) {
                                  setInsumoPrecioUnitario((t / q).toFixed(4));
                                }
                              }}
                              className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {facMoneda === 'VES' && facTasa > 0 && parseFloat(insumoCostoTotal) > 0 && (
                      <div className="text-[11px] text-amber-300/90 font-medium px-1">
                        ≈ $ {(parseFloat(insumoCostoTotal) / facTasa).toFixed(2)} USD (Tasa: {facTasa} Bs/$)
                      </div>
                    )}

                    <div className="pt-1">
                      <button 
                        type="button"
                        onClick={() => {
                          const qty = parseFloat(insumoQty);
                          let cost = parseFloat(insumoCostoTotal);
                          const unitPrice = parseFloat(insumoPrecioUnitario);

                          if (!qty || isNaN(qty) || qty <= 0) return;
                          if ((!cost || isNaN(cost) || cost <= 0) && (!isNaN(unitPrice) && unitPrice > 0)) {
                            cost = qty * unitPrice;
                          }
                          if (!cost || isNaN(cost) || cost <= 0) return;

                          const finalUnitPrice = !isNaN(unitPrice) && unitPrice > 0 ? unitPrice : (cost / qty);

                          if (crearInsumoNuevo) {
                            if (!nombreInsumoNuevo.trim()) return;
                            setFacItems([...facItems, {
                              id: Math.random().toString(),
                              insumo_id: null,
                              is_new: true,
                              nombre_nuevo: nombreInsumoNuevo.trim(),
                              unidad_nueva: unidadInsumoNueva,
                              cantidad: qty,
                              precioUnitario: finalUnitPrice,
                              costoTotal: cost,
                              monedaItem: facMoneda
                            }]);
                            setNombreInsumoNuevo('');
                          } else {
                            if (!insumoSearch) return;
                            const ins = insumosList.find(i => i.id === insumoSearch);
                            setFacItems([...facItems, {
                              id: Math.random().toString(),
                              insumo_id: insumoSearch,
                              is_new: false,
                              nombre_nuevo: ins?.nombre || 'Insumo',
                              unidad_nueva: ins?.unidad_medida || 'unid',
                              cantidad: qty,
                              precioUnitario: finalUnitPrice,
                              costoTotal: cost,
                              monedaItem: facMoneda
                            }]);
                          }
                          setInsumoQty('');
                          setInsumoPrecioUnitario('');
                          setInsumoCostoTotal('');
                          setInsumoSearch('');
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-600/20"
                      >
                        <Plus size={16} /> Agregar a la Factura
                      </button>
                    </div>
                  </div>

                  {/* Cart List */}
                  {facItems.length > 0 ? (
                    <div className="bg-black/30 border border-neutral-800 rounded-2xl overflow-hidden divide-y divide-neutral-800/60">
                      {facItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 text-sm">
                          <div>
                            <p className="font-semibold text-white">
                              {item.nombre_nuevo} 
                              {item.is_new && <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded ml-1">Nuevo</span>}
                            </p>
                            <p className="text-xs text-neutral-400 mt-0.5">
                              {item.cantidad} {item.unidad_nueva} × {facMoneda === 'VES' ? 'Bs. ' : '$ '} {(item.precioUnitario || item.costoTotal / item.cantidad).toFixed(2)} = <span className="text-white font-semibold">{facMoneda === 'VES' ? 'Bs. ' : '$ '} {item.costoTotal.toFixed(2)}</span>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFacItems(facItems.filter(i => i.id !== item.id))}
                            className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                      <div className="p-3 bg-neutral-900/50 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-sm font-bold">
                        <span className="text-neutral-300">Total Factura:</span>
                        <div className="text-right">
                          <span className="text-emerald-400 text-base">
                            {facMoneda === 'VES' ? 'Bs. ' : '$ '}
                            {facItems.reduce((acc, i) => acc + i.costoTotal, 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          {facMoneda === 'VES' && facTasa > 0 && (
                            <span className="block text-xs text-neutral-400 font-normal">
                              ≈ $ {(facItems.reduce((acc, i) => acc + i.costoTotal, 0) / facTasa).toFixed(2)} USD (Tasa: {facTasa} Bs/$)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500 italic text-center py-2">
                      No has agregado insumos todavía. Selecciona uno arriba y haz clic en &quot;Agregar&quot;.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm text-neutral-400 mb-1.5 mt-2">Estado / Método de Pago</label>
                <div className="relative">
                  <input
                    type="text"
                    list="lista-metodos-factura"
                    value={facMetodoPago}
                    onChange={e => setFacMetodoPago(e.target.value)}
                    placeholder="Ej. Por pagar, Transferencia, Zelle..."
                    className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                  <datalist id="lista-metodos-factura">
                    <option value="Por pagar" />
                    {metodosDisponibles.map(m => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {['Por pagar', ...metodosDisponibles.slice(0, 5)].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFacMetodoPago(m)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors ${
                        facMetodoPago === m
                          ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400 font-semibold'
                          : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              {errorFactura && <p className="text-rose-400 text-sm flex items-center gap-2"><AlertCircle size={14} /> {errorFactura}</p>}
            </div>
              <div className="p-6 border-t border-neutral-800 flex gap-3 justify-end">
                <button onClick={() => setShowFacturaModal(false)} className="px-5 py-2.5 rounded-xl text-neutral-300 hover:bg-neutral-800 text-sm">Cancelar</button>
                <button onClick={handleCrearFactura} disabled={enviandoFactura}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50">
                  {enviandoFactura ? 'Registrando...' : <><FileText size={16} /> Registrar Factura</>}
                </button>
              </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          MODAL: Registrar Pago / Abono
      ════════════════════════════════════ */}
      {showPagoModal && facturaPagar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-neutral-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Wallet size={18} className="text-emerald-400" /> Registrar Abono</h3>
              <button onClick={() => setShowPagoModal(false)} className="text-neutral-400 hover:text-white"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Factura info */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                <p className="text-sm text-neutral-400 mb-1">{facturaPagar.concepto || 'Factura'}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-500">
                    Total: {formatCurrency(facturaPagar.total)}
                    {tasaBcv > 0 && ` (~ Bs. ${(facturaPagar.total * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`}
                  </span>
                  <div className="text-right">
                    <span className="text-rose-400 font-bold block">
                      Pendiente: {formatCurrency(facturaPagar.saldo_pendiente)}
                    </span>
                    {tasaBcv > 0 && facturaPagar.saldo_pendiente > 0 && (
                      <span className="text-[11px] text-rose-400/80">
                        ≈ Bs. {(facturaPagar.saldo_pendiente * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1.5">Monto a Abonar (USD) *</label>
                <input type="number" min="0.01" step="any" value={montoAbonar} onChange={e => setMontoAbonar(e.target.value)}
                  className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 text-lg font-semibold" />
                {tasaBcv > 0 && Number(montoAbonar) > 0 && (
                  <p className="text-xs text-emerald-400/90 mt-1">
                    ≈ Bs. {(Number(montoAbonar) * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} a tasa {tasaBcv} Bs/$
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1.5">Método de Pago</label>
                  <div className="relative">
                    <input
                      type="text"
                      list="lista-metodos-abono"
                      value={metodoPago}
                      onChange={e => setMetodoPago(e.target.value)}
                      placeholder="Ej. Transferencia, Zelle..."
                      className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 text-sm"
                    />
                    <datalist id="lista-metodos-abono">
                      {metodosDisponibles.map(m => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {metodosDisponibles.slice(0, 5).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMetodoPago(m)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors ${
                          metodoPago === m
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-semibold'
                            : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1.5">Fecha del Pago</label>
                  <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)}
                    className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 [color-scheme:dark] text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1.5">Banco Origen</label>
                  <input type="text" value={bancoOrigen} onChange={e => setBancoOrigen(e.target.value)}
                    placeholder="Ej. Banesco"
                    className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1.5">N° Referencia</label>
                  <input type="text" value={referencia} onChange={e => setReferencia(e.target.value)}
                    placeholder="Opcional"
                    className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 text-sm" />
                </div>
              </div>
              {errorPago && <p className="text-rose-400 text-sm flex items-center gap-2"><AlertCircle size={14} /> {errorPago}</p>}
            </div>
            <div className="p-6 border-t border-neutral-800 flex gap-3 justify-end">
              <button onClick={() => setShowPagoModal(false)} className="px-5 py-2.5 rounded-xl text-neutral-300 hover:bg-neutral-800 text-sm">Cancelar</button>
              <button onClick={handlePagar} disabled={isPagarLoading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50">
                {isPagarLoading ? 'Registrando...' : <><Wallet size={16} /> Registrar Pago</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          MODAL: Pago General / Cascada FIFO
      ════════════════════════════════════ */}
      {showPagoGeneralModal && proveedorPagarGeneral && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-neutral-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Wallet size={18} className="text-emerald-400" /> Abono General a Proveedor
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {proveedorPagarGeneral.nombre_proveedor || proveedorPagarGeneral.nombre_comercial}
                </p>
              </div>
              <button onClick={() => setShowPagoGeneralModal(false)} className="text-neutral-400 hover:text-white">
                <X size={22} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Resumen Deuda y Regla FIFO */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold uppercase text-neutral-400">Deuda Total Acumulada</span>
                  <div className="text-right">
                    <span className="text-xl font-black text-rose-400">
                      {formatCurrency(proveedorPagarGeneral.monto_adeudado)}
                    </span>
                    {tasaBcv > 0 && proveedorPagarGeneral.monto_adeudado > 0 && (
                      <span className="block text-xs text-neutral-400 font-medium">
                        ≈ Bs. {(proveedorPagarGeneral.monto_adeudado * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
                  ⚡ <strong>Pago Automático en Cascada:</strong> El monto que ingreses se distribuirá cubriendo primero las facturas más antiguas (de mayor antigüedad a la más reciente).
                </div>
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-1.5">Monto a Abonar (USD) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={montoAbonoGeneral}
                  onChange={e => setMontoAbonoGeneral(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 text-lg font-bold"
                />
                {tasaBcv > 0 && Number(montoAbonoGeneral) > 0 && (
                  <p className="text-xs text-emerald-400/90 mt-1">
                    ≈ Bs. {(Number(montoAbonoGeneral) * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} a tasa {tasaBcv} Bs/$
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1.5">Método de Pago</label>
                  <div className="relative">
                    <input
                      type="text"
                      list="lista-metodos-abono-general"
                      value={metodoPagoGeneral}
                      onChange={e => setMetodoPagoGeneral(e.target.value)}
                      placeholder="Ej. Transferencia, Zelle..."
                      className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 text-sm"
                    />
                    <datalist id="lista-metodos-abono-general">
                      {metodosDisponibles.map(m => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {metodosDisponibles.slice(0, 5).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMetodoPagoGeneral(m)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors ${
                          metodoPagoGeneral === m
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-semibold'
                            : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1.5">Fecha del Pago</label>
                  <input
                    type="date"
                    value={fechaPagoGeneral}
                    onChange={e => setFechaPagoGeneral(e.target.value)}
                    className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 [color-scheme:dark] text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1.5">Banco Origen</label>
                  <input
                    type="text"
                    value={bancoOrigenGeneral}
                    onChange={e => setBancoOrigenGeneral(e.target.value)}
                    placeholder="Ej. Banesco, Chase"
                    className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1.5">N° Referencia</label>
                  <input
                    type="text"
                    value={referenciaGeneral}
                    onChange={e => setReferenciaGeneral(e.target.value)}
                    placeholder="Opcional"
                    className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>
              </div>

              {errorPagoGeneral && (
                <p className="text-rose-400 text-sm flex items-center gap-2">
                  <AlertCircle size={14} /> {errorPagoGeneral}
                </p>
              )}
            </div>

            <div className="p-6 border-t border-neutral-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowPagoGeneralModal(false)}
                className="px-5 py-2.5 rounded-xl text-neutral-300 hover:bg-neutral-800 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handlePagarGeneral}
                disabled={isPagarGeneralLoading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-600/20"
              >
                {isPagarGeneralLoading ? 'Aplicando pago...' : <><Wallet size={16} /> Aplicar Abono en Cascada</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
