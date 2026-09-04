"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { getSedes } from "@/actions/dashboard-actions";
import {
  getProveedoresConDeuda, getFacturasProveedor, registrarPagoProveedor,
  getHistoricoProveedores, getTodosProveedores, crearFacturaProveedor, crearProveedor
} from "./actions";
import { useEmpresa } from "@/components/providers/EmpresaProvider";
import {
  Store, Wallet, Search, Check, FileText, ChevronDown, ChevronUp,
  Clock, PlusCircle, X, Plus, User, Phone, MapPin, Hash,
  CreditCard, Building2, AlertCircle, History, DollarSign
} from "lucide-react";
import { format } from "date-fns";

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
  const { formatCurrency } = useEmpresa();
  const [sedes, setSedes] = useState<any[]>([]);
  const [sedeId, setSedeId] = useState("ALL");

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
  const [facMoneda, setFacMoneda] = useState<'USD'|'VES'>('USD');
  const [facMetodoPago, setFacMetodoPago] = useState('Por pagar');
  const [enviandoFactura, setEnviandoFactura] = useState(false);
  const [errorFactura, setErrorFactura] = useState('');

  // ── Modal: Pago ───────────────────────────────────────────
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [facturaPagar, setFacturaPagar] = useState<any>(null);
  const [montoAbonar, setMontoAbonar] = useState('');
  const [metodoPago, setMetodoPago] = useState('Transferencia');
  const [referencia, setReferencia] = useState('');
  const [bancoOrigen, setBancoOrigen] = useState('');
  const [fechaPago, setFechaPago] = useState('');
  const [isPagarLoading, setIsPagarLoading] = useState(false);
  const [errorPago, setErrorPago] = useState('');

  // ── Debounce search ───────────────────────────────────────
  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(h);
  }, [searchTerm]);

  // ── Initial Load ──────────────────────────────────────────
  const fetchInit = useCallback(async () => {
    setLoading(true);
    setPage(1);
    const [sedesRes, provRes, todosRes] = await Promise.all([
      getSedes(),
      getProveedoresConDeuda(sedeId, 1, 20, debouncedSearch),
      getTodosProveedores(),
    ]);
    if (Array.isArray(sedesRes)) setSedes(sedesRes);
    if (provRes.success) { setProveedores(provRes.data || []); setTotalCount(provRes.totalCount || 0); }
    if (todosRes.success) setTodosProveedores(todosRes.data || []);
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
    if (!facTotal || isNaN(Number(facTotal)) || Number(facTotal) <= 0) { setErrorFactura('Monto inválido'); return; }
    setEnviandoFactura(true);
    setErrorFactura('');
    const res = await crearFacturaProveedor(
      facProveedorId, facSede || sedeId, facNumero, facConcepto,
      Number(facTotal), facFecha, facMetodoPago, facMoneda
    );
    if (res.success) {
      setShowFacturaModal(false);
      setFacProveedorId(''); setFacConcepto(''); setFacTotal(''); setFacNumero('');
      setFacFecha(new Date().toISOString().split('T')[0]); setFacMetodoPago('Por pagar');
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
      setMontoAbonar(''); setReferencia(''); setBancoOrigen(''); setFechaPago('');
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
          <button onClick={() => setShowFacturaModal(true)}
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
              <option value="ALL">Todas las sedes</option>
              {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
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
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto">
                    {prov.monto_adeudado !== undefined && (
                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase text-neutral-500 mb-1">Adeudado</p>
                        <p className="font-black text-rose-400 text-lg">{formatCurrency(prov.monto_adeudado)}</p>
                      </div>
                    )}
                    <button className="text-neutral-500 hover:text-white transition-colors p-2 rounded-full hover:bg-neutral-700">
                      {expandedId === (prov.id_proveedor || prov.id) ? <ChevronUp /> : <ChevronDown />}
                    </button>
                  </div>
                </div>

                {/* ── Facturas expandidas ── */}
                {expandedId === (prov.id_proveedor || prov.id) && (
                  <div className="bg-neutral-950/50 border-t border-neutral-800 p-5 px-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                        <FileText size={16} /> Facturas
                      </h4>
                      <button
                        onClick={() => { setFacProveedorId(prov.id_proveedor || prov.id); setShowFacturaModal(true); }}
                        className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 px-2 py-1 rounded-lg transition-colors">
                        <Plus size={12} /> Agregar factura
                      </button>
                    </div>

                    {loadingFacturas ? (
                      <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-16 bg-neutral-900 animate-pulse rounded-xl border border-neutral-800" />)}</div>
                    ) : facturasProveedor.length === 0 ? (
                      <div className="text-neutral-500 text-sm py-4 text-center">No hay facturas registradas para este proveedor.</div>
                    ) : (
                      <div className="space-y-3">
                        {facturasProveedor.map((fac: any) => {
                          const saldado = fac.saldo_pendiente <= 0;
                          return (
                            <React.Fragment key={fac.id}>
                              <div className={`bg-neutral-900 border rounded-xl p-4 transition-colors ${saldado ? 'border-emerald-500/20 opacity-60' : 'border-neutral-800 hover:border-neutral-700'}`}>
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <h5 className="font-bold text-white">{fac.concepto || 'Factura / Deuda'}</h5>
                                      {fac.numero_factura && <span className="text-xs bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded">Nº {fac.numero_factura}</span>}
                                      {saldado && <Badge label="Saldada" color="emerald" />}
                                    </div>
                                    <p className="text-xs text-neutral-500 flex items-center gap-1"><Clock size={12} /> {safeDate(fac.fecha_emision)}</p>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <p className="text-xs text-neutral-500">Total: {formatCurrency(fac.total)}</p>
                                      <p className={`font-black text-lg ${saldado ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(fac.saldo_pendiente)}</p>
                                      <p className="text-xs text-neutral-600">pendiente</p>
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

                              {/* ── Historial de pagos por factura ── */}
                              {fac.pagos && fac.pagos.length > 0 && (
                                <div className="bg-neutral-950 p-3 rounded-b-xl border border-neutral-800 border-t-0 -mt-2 ml-4 mr-2">
                                  <p className="text-xs font-bold text-neutral-500 uppercase mb-2 flex items-center gap-1"><History size={11} /> Historial de Pagos</p>
                                  <div className="space-y-1">
                                    {fac.pagos.map((pago: any) => (
                                      <div key={pago.id} className="flex flex-wrap justify-between items-center text-xs py-1.5 border-b border-neutral-800/50 last:border-0 gap-x-4">
                                        <span className="text-neutral-500">{safeDateTime(pago.created_at)}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-neutral-400">{pago.metodo_pago}</span>
                                          {pago.banco_origen && <span className="text-neutral-600">({pago.banco_origen})</span>}
                                          {pago.referencia && <span className="text-indigo-400">#{pago.referencia}</span>}
                                        </div>
                                        <span className="font-bold text-emerald-400">+{formatCurrency(pago.monto)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
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
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-neutral-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><FileText size={18} className="text-indigo-400" /> Nueva Factura / Deuda</h3>
              <button onClick={() => setShowFacturaModal(false)} className="text-neutral-400 hover:text-white"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1.5">Proveedor *</label>
                <select value={facProveedorId} onChange={e => setFacProveedorId(e.target.value)}
                  className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 appearance-none">
                  <option value="">Selecciona un proveedor...</option>
                  {todosProveedores.map(p => <option key={p.id} value={p.id}>{p.nombre_comercial}{p.rif_cedula ? ` (${p.rif_cedula})` : ''}</option>)}
                </select>
                <button onClick={() => { setShowFacturaModal(false); setShowCrearModal(true); }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 flex items-center gap-1">
                  <Plus size={11} /> Crear nuevo proveedor
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1.5">Nº Factura</label>
                  <input type="text" value={facNumero} onChange={e => setFacNumero(e.target.value)}
                    placeholder="00001 (opcional)"
                    className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1.5">Fecha</label>
                  <input type="date" value={facFecha} onChange={e => setFacFecha(e.target.value)}
                    className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 [color-scheme:dark] text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1.5">Concepto / Descripción</label>
                <input type="text" value={facConcepto} onChange={e => setFacConcepto(e.target.value)}
                  placeholder="Ej. Compra de materia prima"
                  className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1.5">Monto Total *</label>
                  <input type="number" min="0" step="any" value={facTotal} onChange={e => setFacTotal(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1.5">Moneda</label>
                  <select value={facMoneda} onChange={e => setFacMoneda(e.target.value as 'USD'|'VES')}
                    className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 text-sm">
                    <option value="USD">USD</option>
                    <option value="VES">VES</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1.5">Estado de Pago</label>
                <select value={facMetodoPago} onChange={e => setFacMetodoPago(e.target.value)}
                  className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 text-sm">
                  <option value="Por pagar">Por pagar (deuda)</option>
                  <option value="Efectivo USD">Pagado - Efectivo USD</option>
                  <option value="Transferencia">Pagado - Transferencia</option>
                  <option value="Zelle">Pagado - Zelle</option>
                  <option value="Pago Movil">Pagado - Pago Móvil</option>
                </select>
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
                <div className="flex justify-between">
                  <span className="text-xs text-neutral-500">Total: {formatCurrency(facturaPagar.total)}</span>
                  <span className="text-rose-400 font-bold">Pendiente: {formatCurrency(facturaPagar.saldo_pendiente)}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1.5">Monto a Abonar *</label>
                <input type="number" min="0.01" step="any" value={montoAbonar} onChange={e => setMontoAbonar(e.target.value)}
                  className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 text-lg font-semibold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1.5">Método de Pago</label>
                  <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}
                    className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 text-sm">
                    <option>Transferencia</option>
                    <option>Efectivo USD</option>
                    <option>Efectivo Bs</option>
                    <option>Zelle</option>
                    <option>Pago Movil</option>
                    <option>Punto de Venta</option>
                    <option>Cheque</option>
                  </select>
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
    </div>
  );
}
