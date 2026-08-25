'use client';

import React, { useState, useEffect } from 'react';
import { getProveedoresConDeuda, getFacturasProveedor, registrarPagoProveedor, getHistoricoProveedores } from './actions';
import { getSedes } from '@/actions/dashboard-actions';
import { useEmpresa } from '@/components/providers/EmpresaProvider';
import { Truck, Search, ChevronDown, ChevronUp, DollarSign, Building2, Check, FileText, CreditCard, X, TrendingDown, TrendingUp, BarChart3, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ProveedoresPage() {
  const { formatCurrency, empresa } = useEmpresa();
  const metodos_pago = empresa?.metodos_pago || [];
  
  const [sedes, setSedes] = useState<any[]>([]);
  const [sedeId, setSedeId] = useState('ALL');
  
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [filteredProveedores, setFilteredProveedores] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Acordeón de facturas
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [facturasProveedor, setFacturasProveedor] = useState<any[]>([]);
  const [loadingFacturas, setLoadingFacturas] = useState(false);

  // Pago
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<any>(null);
  const [montoPago, setMontoPago] = useState<number | string>('');
  const [metodoPago, setMetodoPago] = useState(metodos_pago[0] || 'Transferencia');
  const [referencia, setReferencia] = useState('');
  const [bancoOrigen, setBancoOrigen] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInit = async () => {
    setLoading(true);
    const s = await getSedes();
    setSedes(s);
    
    const [res, histRes] = await Promise.all([
      getProveedoresConDeuda(sedeId),
      getHistoricoProveedores(12) // 12 meses para la gráfica
    ]);

    if (res.success) {
      setProveedores(res.data || []);
      setFilteredProveedores(res.data || []);
    }
    if (histRes.success) {
      // Revertimos para que el mes actual salga al final de la gráfica
      setHistorico((histRes.data || []).reverse());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInit();
  }, [sedeId]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredProveedores(proveedores);
    } else {
      setFilteredProveedores(
        proveedores.filter(p => p.nombre_proveedor.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
  }, [searchTerm, proveedores]);

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
    setSelectedFactura(factura);
    setMontoPago(factura.saldo_pendiente);
    setShowPagoModal(true);
  };

  const handleSubmitPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFactura || !montoPago) return;

    setIsSubmitting(true);
    const res = await registrarPagoProveedor(
      selectedFactura.id,
      Number(montoPago),
      metodoPago,
      referencia,
      bancoOrigen
    );
    setIsSubmitting(false);

    if (res.success) {
      setShowPagoModal(false);
      fetchInit();
      if (expandedId) {
        setLoadingFacturas(true);
        const fRes = await getFacturasProveedor(expandedId, sedeId);
        if (fRes.success) setFacturasProveedor(fRes.data || []);
        setLoadingFacturas(false);
      }
    } else {
      alert("Error al registrar pago: " + res.error);
    }
  };

  const deudaTotal = proveedores.reduce((acc, curr) => acc + Number(curr.monto_adeudado), 0);
  const deudaMesPasado = historico.length > 1 ? Number(historico[historico.length - 2].deuda_acumulada) : 0;

  return (
    <div className="space-y-6 max-w-7xl animate-in fade-in duration-300">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Truck className="text-orange-400" />
            Proveedores y Cuentas por Pagar
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Gestión de deudas, facturas pendientes y pagos a proveedores.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={sedeId}
            onChange={(e) => setSedeId(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Todas las Sucursales</option>
            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre_comercial || s.nombre}</option>)}
          </select>
          <button onClick={() => setShowHistoricoModal(true)} className="bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/30 px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-2">
            <BarChart3 size={18} /> Ver Histórico
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
            <DollarSign size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-400">Total Cuentas por Pagar</p>
            <div className="flex items-end gap-3">
              <h2 className="text-3xl font-black text-white tracking-tight">{formatCurrency(deudaTotal)}</h2>
              {!loading && historico.length > 1 && (
                <div className={`flex items-center gap-1 text-sm font-medium mb-1 ${deudaTotal <= deudaMesPasado ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {deudaTotal <= deudaMesPasado ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                  <span>
                    {deudaTotal <= deudaMesPasado ? '-' : '+'}{formatCurrency(Math.abs(deudaTotal - deudaMesPasado))} vs mes anterior
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex-1 w-full max-w-sm relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Buscar proveedor..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-colors shadow-inner"
          />
        </div>
      </div>

      {/* LISTADO DE PROVEEDORES */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-8 text-center text-neutral-500">Cargando proveedores...</div>
        ) : filteredProveedores.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <Check size={48} className="text-emerald-500/50 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">¡Todo al día!</h3>
            <p className="text-neutral-400">No tienes cuentas por pagar a proveedores.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800/50">
            {filteredProveedores.map(prov => (
              <div key={prov.id_proveedor} className="group">
                {/* Fila Principal */}
                <div 
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-neutral-800/30 transition-colors"
                  onClick={() => toggleExpand(prov.id_proveedor)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 group-hover:text-orange-400 group-hover:border-orange-500/30 transition-colors">
                      <Building2 size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg text-white truncate">{prov.nombre_proveedor}</h3>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm text-neutral-400">RIF/Cédula: {prov.rif || 'N/A'}</p>
                        {prov.sedes_involucradas && (
                          <p className="text-xs text-neutral-500 font-medium">Sedes: {prov.sedes_involucradas}</p>
                        )}
                        <p className="text-sm text-neutral-500">
                          {prov.facturas_pendientes} {prov.facturas_pendientes === 1 ? 'factura pendiente' : 'facturas pendientes'}
                        </p>
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

                {/* Acordeón: Detalle de Facturas */}
                {expandedId === prov.id_proveedor && (
                  <div className="bg-neutral-950/50 border-t border-neutral-800 p-5 px-6 sm:px-20">
                    <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <FileText size={16} /> Facturas Pendientes
                    </h4>
                    
                    {loadingFacturas ? (
                      <div className="text-neutral-500 text-sm py-4">Cargando facturas...</div>
                    ) : facturasProveedor.length === 0 ? (
                      <div className="text-neutral-500 text-sm py-4">No hay facturas detalladas (Revisa si están en el sistema).</div>
                    ) : (
                      <div className="space-y-3">
                        {facturasProveedor.map(factura => (
                          <div key={factura.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-neutral-700 transition-colors shadow-sm">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <span className="font-bold text-white">#{factura.numero_factura}</span>
                                <span className="text-xs bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20">Pendiente</span>
                                <span className="text-xs text-neutral-500">{new Date(factura.fecha_emision).toLocaleDateString()}</span>
                              </div>
                              <p className="text-sm text-neutral-400 line-clamp-1">{factura.concepto || 'Compra de mercancía / insumos'}</p>
                            </div>
                            
                            <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                              <div className="text-right">
                                <p className="text-xs text-neutral-500 mb-0.5">Saldo Pendiente</p>
                                <p className="font-bold text-white">{formatCurrency(factura.saldo_pendiente)}</p>
                              </div>
                              <button 
                                onClick={() => handleOpenPago(factura)}
                                className="bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                              >
                                <CreditCard size={16} /> Abonar / Pagar
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
          </div>
        )}
      </div>

      {/* MODAL DE PAGO */}
      {showPagoModal && selectedFactura && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 w-full max-w-md rounded-2xl border border-neutral-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-neutral-950 p-5 border-b border-neutral-800 flex justify-between items-center">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <CreditCard className="text-emerald-400" />
                Registrar Pago a Proveedor
              </h3>
              <button onClick={() => setShowPagoModal(false)} className="text-neutral-500 hover:text-white"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmitPago} className="p-6 space-y-5">
              <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700/50 mb-2">
                <p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold mb-1">Factura #{selectedFactura.numero_factura}</p>
                <div className="flex justify-between items-end">
                  <span className="text-sm text-neutral-300">Deuda actual:</span>
                  <span className="text-xl font-black text-rose-400">{formatCurrency(selectedFactura.saldo_pendiente)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Monto a Abonar</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
                  <input
                    type="number"
                    step="0.01"
                    required
                    max={selectedFactura.saldo_pendiente}
                    value={montoPago}
                    onChange={(e) => setMontoPago(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Método de Pago</label>
                <select
                  required
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {metodos_pago && metodos_pago.length > 0 ? (
                    metodos_pago.map((m: string) => <option key={m} value={m}>{m}</option>)
                  ) : (
                    <>
                      <option value="Transferencia">Transferencia Bancaria</option>
                      <option value="Pago Móvil">Pago Móvil</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Zelle">Zelle</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Banco / Origen (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Banesco, Mercantil, Caja..."
                  value={bancoOrigen}
                  onChange={(e) => setBancoOrigen(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Nº de Referencia (Opcional)</label>
                <input
                  type="text"
                  placeholder="002391238..."
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowPagoModal(false)}
                  className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Procesando...' : 'Confirmar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE HISTORICO (CHART) */}
      {showHistoricoModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 w-full max-w-4xl rounded-2xl border border-neutral-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-neutral-950 p-5 border-b border-neutral-800 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <BarChart3 className="text-indigo-400" />
                Histórico de Cuentas por Pagar (Últimos 12 meses)
              </h3>
              <button onClick={() => setShowHistoricoModal(false)} className="text-neutral-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-neutral-800"><X size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="h-[400px] w-full mb-8">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={historico} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="mes" stroke="#888" tick={{ fill: '#888' }} />
                    <YAxis yAxisId="left" stroke="#888" tickFormatter={(val) => `$${val}`} />
                    <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" tickFormatter={(val) => `$${val}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#171717', borderColor: '#333', borderRadius: '8px' }}
                      formatter={(value: any) => formatCurrency(value)}
                      labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    
                    <Bar yAxisId="left" dataKey="nuevas_deudas" fill="#ef4444" name="Nuevas Deudas" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar yAxisId="left" dataKey="pagos_realizados" fill="#10b981" name="Abonos/Pagos" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Line yAxisId="right" type="monotone" dataKey="deuda_acumulada" stroke="#f59e0b" name="Deuda Pendiente Final" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="border border-neutral-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Mes</th>
                      <th className="px-4 py-3 font-semibold text-right">Nuevas Deudas</th>
                      <th className="px-4 py-3 font-semibold text-right">Pagos Realizados</th>
                      <th className="px-4 py-3 font-semibold text-right">Deuda Pendiente (Fin de Mes)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50">
                    {historico.slice().reverse().map((h, i) => (
                      <tr key={i} className="hover:bg-neutral-800/20">
                        <td className="px-4 py-3 font-medium text-white">{h.mes}</td>
                        <td className="px-4 py-3 text-right text-rose-400">{formatCurrency(h.nuevas_deudas)}</td>
                        <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(h.pagos_realizados)}</td>
                        <td className="px-4 py-3 text-right font-bold text-orange-400">{formatCurrency(h.deuda_acumulada)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
