"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getSedes } from "@/actions/dashboard-actions";
import { getClientesConDeuda, getDetalleDeudaCliente, registrarAbono, getMetodosPago, registrarAbonoGlobal, getHistorialAbonosCliente, getTasaBCVActual } from "@/actions/creditos-actions";
import { format, startOfDay, endOfDay } from "date-fns";
import { useEmpresa } from "@/components/providers/EmpresaProvider";
import CreatableSelect from "react-select/creatable";
import { Store, Wallet, Search, FileText, ShoppingCart, Users, PlusCircle, X, Download, Hash, History, ArrowLeft } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Safe date formatting helper (prevents 1969 epoch bugs or invalid date crashes) ──
function safeFormatDate(dateVal: any, formatPattern: string = "dd/MM/yyyy HH:mm"): string {
  if (!dateVal) return "N/A";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime()) || d.getFullYear() <= 1970) return "N/A";
    return format(d, formatPattern);
  } catch (e) {
    return "N/A";
  }
}

export default function CreditosPage() {
  const { formatCurrency, empresa } = useEmpresa();
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const [sedes, setSedes] = useState<any[]>([]);
  const [metodosDisponibles, setMetodosDisponibles] = useState<string[]>(["Efectivo"]);
  const [sedeId, setSedeId] = useState("ALL");

  const [startDate, setStartDate] = useState<Date>(new Date('2000-01-01'));
  const [endDate, setEndDate] = useState<Date>(new Date('2100-01-01'));

  const [clientes, setClientes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Paginacion
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingClientes, setIsLoadingClientes] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<any[]>([]);
  const [isLoadingDetalle, setIsLoadingDetalle] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [searchProducto, setSearchProducto] = useState('');

  const [showPagoModal, setShowPagoModal] = useState(false);
  const [facturaPagar, setFacturaPagar] = useState<any>(null);
  const [montoAbonar, setMontoAbonar] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [fechaPago, setFechaPago] = useState("");
  const [referencia, setReferencia] = useState("");
  const [isPagarLoading, setIsPagarLoading] = useState(false);
  const [showPagoGlobalModal, setShowPagoGlobalModal] = useState(false);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [historialCliente, setHistorialCliente] = useState<any[]>([]);
  const [isLoadingHistorial, setIsLoadingHistorial] = useState(false);
  const [montoAbonarGlobal, setMontoAbonarGlobal] = useState("");

  // F9: Estados de tasa BCV, moneda de entrada e idempotency key
  const [tasaBCV, setTasaBCV] = useState<number>(1);
  const [monedaEntrada, setMonedaEntrada] = useState<'USD' | 'Bs'>('USD');
  const [idempotencyKey, setIdempotencyKey] = useState('');

  // F9: Equivalente en tiempo real (USD vs Bs)
  const montoEquivalente = useMemo(() => {
    const n = parseFloat(montoAbonar) || 0;
    if (monedaEntrada === 'Bs') {
      return { usd: tasaBCV > 0 ? parseFloat((n / tasaBCV).toFixed(2)) : 0, bs: n };
    }
    return { usd: n, bs: parseFloat((n * tasaBCV).toFixed(2)) };
  }, [montoAbonar, monedaEntrada, tasaBCV]);

  useEffect(() => {
    getSedes().then(s => setSedes(s));
    // F9: Consumir getMetodosPago con su nuevo tipo { success, data: string[] }
    getMetodosPago().then(res => {
      if (res.success && res.data && res.data.length > 0) {
        setMetodosDisponibles(res.data);
        setMetodoPago(res.data[0]);
      }
    });
    // F9: Cargar tasa BCV al inicio
    getTasaBCVActual().then(tasa => setTasaBCV(tasa));
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
      const res = await getClientesConDeuda(sedeId, format(startOfDay(startDate), "yyyy-MM-dd'T'HH:mm:ssXXX"), format(endOfDay(endDate), "yyyy-MM-dd'T'HH:mm:ssXXX"), 1, 20, debouncedSearch);
      if (res.success) {
        setClientes(res.data || []);
        setTotalCount(res.totalCount || 0);
        // Si el cliente seleccionado ya no esta, limpiar detalle
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
  }, [sedeId, format(startOfDay(startDate), "yyyy-MM-dd'T'HH:mm:ssXXX"), format(endOfDay(endDate), "yyyy-MM-dd'T'HH:mm:ssXXX"), debouncedSearch]);

  const handleLoadMore = async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const res = await getClientesConDeuda(sedeId, format(startOfDay(startDate), "yyyy-MM-dd'T'HH:mm:ssXXX"), format(endOfDay(endDate), "yyyy-MM-dd'T'HH:mm:ssXXX"), nextPage, 20, debouncedSearch);
    if (res.success) {
      setClientes(prev => [...prev, ...(res.data || [])]);
      setTotalCount(res.totalCount || 0);
      setPage(nextPage);
    }
    setIsLoadingMore(false);
  };

  const handleOpenHistorial = async () => {
    if (!clienteSeleccionado) return;
    setShowHistorialModal(true);
    setIsLoadingHistorial(true);
    const res = await getHistorialAbonosCliente(clienteSeleccionado.id_cliente);
    if (res.success) {
      setHistorialCliente(res.data || []);
    }
    setIsLoadingHistorial(false);
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

  const handlePagarGlobal = async () => {
    if (!clienteSeleccionado || !montoAbonarGlobal) return;
    setIsPagarLoading(true);
    try {
      const res = await registrarAbonoGlobal(
        clienteSeleccionado.id_cliente,
        sedeId,
        Number(montoAbonarGlobal),
        metodoPago,
        fechaPago ? new Date(fechaPago).toISOString() : undefined,
        referencia
      );
      if (res.success) {
        setShowPagoGlobalModal(false);
        const montoNum = Number(montoAbonarGlobal);
        setMontoAbonarGlobal("");
        setToast({
          type: 'success',
          message: `Abono de $${montoNum.toFixed(2)} USD procesado con éxito. Facturas afectadas: ${res.facturasPagadas || 0}`
        });

        // Optimistic / Parallel reload without blocking
        const [rDet, rCli] = await Promise.all([
          getDetalleDeudaCliente(selectedClienteId, sedeId),
          getClientesConDeuda(sedeId, startDate.toISOString(), endDate.toISOString(), 1, 20, debouncedSearch)
        ]);
        if (rDet.success) setDetalle(rDet.data || []);
        if (rCli.success) {
          setClientes(rCli.data || []);
          setTotalCount(rCli.totalCount || 0);
        }
      } else {
        setToast({ type: 'error', message: res.error || 'Error al procesar el abono' });
      }
    } catch (e: any) {
      setToast({ type: 'error', message: e.message || 'Error de conexión' });
    } finally {
      setIsPagarLoading(false);
    }
  };

  const handlePagar = async () => {
    if (!facturaPagar || !montoAbonar) return;
    setIsPagarLoading(true);
    try {
      const res = await registrarAbono(
        facturaPagar.id_factura,
        montoEquivalente.usd,
        metodoPago,
        monedaEntrada,
        parseFloat(montoAbonar) || 0,
        tasaBCV,
        idempotencyKey,
        fechaPago ? new Date(fechaPago).toISOString() : undefined,
        referencia
      );
      if (res.success) {
        setShowPagoModal(false);
        setToast({
          type: 'success',
          message: `Abono de $${montoEquivalente.usd.toFixed(2)} USD aplicado a la Factura ${facturaPagar.numero_documento || ''}`
        });

        // Parallel reload
        const [rDet, rCli] = await Promise.all([
          getDetalleDeudaCliente(selectedClienteId, sedeId),
          getClientesConDeuda(sedeId, startDate.toISOString(), endDate.toISOString(), 1, 20, debouncedSearch)
        ]);
        if (rDet.success) setDetalle(rDet.data || []);
        if (rCli.success) {
          setClientes(rCli.data || []);
          setTotalCount(rCli.totalCount || 0);
        }
      } else {
        setToast({ type: 'error', message: res.error || 'Error al procesar el abono' });
      }
    } catch (e: any) {
      setToast({ type: 'error', message: e.message || 'Error de conexión' });
    } finally {
      setIsPagarLoading(false);
    }
  };

  const clienteSeleccionado = clientes.find(c => c.id_cliente === selectedClienteId);

  const filteredDetalle = detalle
    .filter(fac => {
      if (!searchProducto.trim()) return true;
      return fac.productos_detalle?.some((p: any) =>
        p.producto?.toLowerCase().includes(searchProducto.toLowerCase().trim())
      );
    })
    .sort((a, b) => {
      const dateA = new Date(a.fecha_venta).getTime();
      const dateB = new Date(b.fecha_venta).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  const printEstadoCuentaHTML = () => {
    if (!clienteSeleccionado) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHTML = detalle.map(fac => {
      const prods = (fac.productos_detalle || []).map((p: any) => `${p.cantidad}x ${p.producto}`).join('<br>');
      const abonosReales = (fac.abonos_detalle || []).filter((a: any) => a.metodo !== 'Credito' && a.tipo_pago !== 'Credito');
      const totalAbonado = abonosReales.reduce((acc: number, a: any) => acc + (Number(a.monto) || 0), 0);
      return `
        <tr>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">
            ${fac.numero_documento} ${fac.numero_orden ? `<small style="color: #6366f1;">(#${fac.numero_orden})</small>` : ''}
          </td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0;">${safeFormatDate(fac.fecha_venta, "dd/MM/yyyy")}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0;">${fac.sede_nombre || '-'}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #475569;">${prods || 'Sin items detallados'}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(fac.total_factura || 0)}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #059669;">${formatCurrency(totalAbonado)}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #e11d48;">${formatCurrency(fac.saldo_pendiente || 0)}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Estado de Cuenta - ${clienteSeleccionado.nombre_cliente}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 30px; color: #0f172a; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
            th { background-color: #0f172a; color: white; text-align: left; padding: 10px 8px; }
            th.right, td.right { text-align: right; }
            .summary { display: flex; gap: 20px; margin: 16px 0; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 20px; border-radius: 8px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin: 0 0 4px 0;">${empresa?.nombre_comercial || 'NITEO ERP'} - ESTADO DE CUENTA DE CRÉDITOS</h2>
            <div style="font-size: 13px; color: #64748b;">Fecha de emisión: ${format(new Date(), "dd/MM/yyyy HH:mm")}</div>
          </div>
          <div style="margin-bottom: 16px;">
            <div style="font-size: 18px; font-weight: bold;">${clienteSeleccionado.nombre_cliente}</div>
            <div style="font-size: 13px; color: #475569;">${[clienteSeleccionado.rif_cedula ? `RIF/CI: ${clienteSeleccionado.rif_cedula}` : '', clienteSeleccionado.telefono ? `Tel: ${clienteSeleccionado.telefono}` : ''].filter(Boolean).join(' | ')}</div>
          </div>
          <div class="summary">
            <div class="card">
              <div style="font-size: 11px; color: #64748b; font-weight: bold;">TOTAL DEUDA PENDIENTE</div>
              <div style="font-size: 20px; font-weight: bold; color: #e11d48;">${formatCurrency(clienteSeleccionado.monto_adeudado || 0)}</div>
            </div>
            <div class="card">
              <div style="font-size: 11px; color: #64748b; font-weight: bold;">FACTURAS PENDIENTES</div>
              <div style="font-size: 20px; font-weight: bold;">${detalle.length}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Factura</th>
                <th>Fecha</th>
                <th>Sede</th>
                <th>Productos / Detalle</th>
                <th class="right">Total Factura</th>
                <th class="right">Abonado</th>
                <th class="right">Falta por Pagar</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const generatePDF = () => {
    if (!clienteSeleccionado) return;
    setIsExportingPDF(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Encabezado estilizado
      doc.setFillColor(15, 23, 42); // Slate 900
      doc.rect(0, 0, 210, 30, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text("ESTADO DE CUENTA / CRÉDITOS", 14, 14);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Empresa: ${empresa?.nombre_comercial || 'NITEO ERP'}   |   Emisión: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 22);

      // Info de Cliente
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Cliente: ${clienteSeleccionado.nombre_cliente}`, 14, 40);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const rif = clienteSeleccionado.rif_cedula ? `RIF/CI: ${clienteSeleccionado.rif_cedula}` : '';
      const telf = clienteSeleccionado.telefono ? `Tel: ${clienteSeleccionado.telefono}` : '';
      doc.text([rif, telf].filter(Boolean).join('   |   ') || 'Cliente registrado', 14, 46);

      // Tarjetas de Resumen
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 51, 86, 17, 2, 2, 'FD');
      doc.roundedRect(106, 51, 90, 17, 2, 2, 'FD');

      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("DEUDA TOTAL PENDIENTE", 18, 57);
      doc.text("CANTIDAD DE FACTURAS", 110, 57);

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(225, 29, 72);
      doc.text(formatCurrency(clienteSeleccionado.monto_adeudado || 0), 18, 64);

      doc.setTextColor(15, 23, 42);
      doc.text(`${detalle.length} facturas`, 110, 64);

      // Tabla Detallada
      const tableData = detalle.map(fac => {
        const prods = (fac.productos_detalle || []).map((p: any) => `${p.cantidad}x ${p.producto}`).join('\n');
        const abonosReales = (fac.abonos_detalle || []).filter((a: any) => a.metodo !== 'Credito' && a.tipo_pago !== 'Credito');
        const totalAbonado = abonosReales.reduce((acc: number, a: any) => acc + (Number(a.monto) || 0), 0);
        return [
          fac.numero_documento + (fac.numero_orden ? `\n(#${fac.numero_orden})` : ''),
          safeFormatDate(fac.fecha_venta, "dd/MM/yyyy"),
          fac.sede_nombre || '-',
          prods || 'Sin detalle',
          formatCurrency(fac.total_factura || 0),
          formatCurrency(totalAbonado),
          formatCurrency(fac.saldo_pendiente || 0)
        ];
      });

      const autoTableFn = typeof autoTable === 'function' ? autoTable : (doc as any).autoTable;
      if (typeof autoTableFn === 'function') {
        autoTableFn(doc, {
          startY: 73,
          head: [["Factura", "Fecha", "Sede", "Productos / Detalle", "Total", "Abonado", "Pendiente"]],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: 'bold'
          },
          bodyStyles: {
            fontSize: 7.5,
            textColor: [30, 41, 59],
            cellPadding: 2.5
          },
          columnStyles: {
            0: { cellWidth: 26 },
            1: { cellWidth: 20 },
            2: { cellWidth: 20 },
            3: { cellWidth: 55 },
            4: { cellWidth: 22, halign: 'right' },
            5: { cellWidth: 20, halign: 'right' },
            6: { cellWidth: 23, halign: 'right', fontStyle: 'bold', textColor: [225, 29, 72] }
          },
          styles: { overflow: 'linebreak' }
        });
      }

      const fileName = `Estado_Cuenta_${(clienteSeleccionado.nombre_cliente || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      doc.save(fileName);
      setToast({ type: 'success', message: 'PDF exportado correctamente.' });
    } catch (err: any) {
      console.warn("Fallo exportación jsPDF, activando vista de impresión:", err);
      printEstadoCuentaHTML();
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="-m-4 md:-m-6 flex flex-col lg:flex-row h-[calc(100dvh-64px-5rem)] lg:h-[calc(100dvh-64px)] overflow-hidden bg-neutral-950">

      {/* SIDEBAR CLIENTES (Visible siempre en desktop, o en mobile si no hay cliente seleccionado) */}
      <div className={`w-full lg:w-[400px] flex-col bg-neutral-950 border-r border-neutral-800 shrink-0 h-full ${
        selectedClienteId ? 'hidden lg:flex' : 'flex'
      }`}>
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
                className={"w-full text-left p-4 rounded-xl border transition-all active:scale-[0.99] " + (
                  selectedClienteId === cli.id_cliente
                    ? "bg-emerald-900/20 border-emerald-500/50 shadow-lg"
                    : "bg-neutral-900/50 border-neutral-800 hover:bg-neutral-900"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className={"font-black uppercase truncate pr-2 " + (selectedClienteId === cli.id_cliente ? "text-emerald-400" : "text-white")}>{cli.nombre_cliente}</h3>
                    {cli.sedes_involucradas && <p className="text-xs text-neutral-500 font-medium">{cli.sedes_involucradas}</p>}
                  </div>
                  <span className={"font-bold " + (selectedClienteId === cli.id_cliente ? "text-rose-400" : "text-rose-500")}>{formatCurrency(cli.monto_adeudado)}</span>
                </div>
                <p className="text-xs text-neutral-500">
                  Ultima compra: {cli.ultima_compra ? format(new Date(cli.ultima_compra), "dd/MM/yyyy") : "-"}
                </p>
              </button>
            ))
          )}

          {!isLoadingClientes && isLoadingMore && (
            <div className="w-full p-4 rounded-xl border border-neutral-800 bg-neutral-900/30 animate-pulse h-24"></div>
          )}
        </div>
      </div>

      {/* DETALLE (DERECHA: Visible siempre en desktop, o en mobile si hay cliente seleccionado) */}
      <div className={`flex-1 flex-col bg-neutral-950 overflow-hidden h-full ${
        selectedClienteId ? 'flex' : 'hidden lg:flex'
      }`}>
        {!selectedClienteId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-50">
            <Wallet size={48} className="text-neutral-600 mb-4" />
            <h2 className="text-xl font-bold text-neutral-400">Selecciona un cliente</h2>
            <p className="text-sm text-neutral-500 mt-2">Haz clic en un cliente de la lista para ver sus facturas y registrar pagos.</p>
          </div>
        ) : (
          <>
            {/* Barra superior de regreso para versión Móvil */}
            <div className="lg:hidden p-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between shrink-0">
              <button
                onClick={() => setSelectedClienteId(null)}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 py-1.5 px-3 rounded-lg bg-emerald-950/60 border border-emerald-800/50 active:scale-95 transition-all"
              >
                <ArrowLeft size={15} /> Volver a Clientes
              </button>
              <span className="text-xs text-neutral-300 font-bold truncate max-w-[160px]">
                {clienteSeleccionado?.nombre_cliente}
              </span>
            </div>

            <div className="p-4 md:p-6 border-b border-neutral-800 bg-neutral-950/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white">{clienteSeleccionado?.nombre_cliente}</h2>
                <p className="text-rose-400 font-bold mt-1 text-sm md:text-base">Deuda Total: {formatCurrency(clienteSeleccionado?.monto_adeudado || 0)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setMontoAbonarGlobal(clienteSeleccionado?.monto_adeudado?.toString() || "0");
                    setFechaPago(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
                    setReferencia("");
                    setIdempotencyKey(crypto.randomUUID());
                    setShowPagoGlobalModal(true);
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg font-bold transition-colors text-xs md:text-sm"
                >
                  <Wallet size={15} /> Saldar Deuda
                </button>
                <button
                  onClick={handleOpenHistorial}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-2 rounded-lg font-bold transition-colors text-xs md:text-sm border border-neutral-700"
                >
                  <History size={15} /> Historial
                </button>
                <button
                  onClick={generatePDF}
                  disabled={isExportingPDF}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg font-medium transition-colors text-xs md:text-sm"
                >
                  <Download size={15} /> {isExportingPDF ? '...' : 'PDF'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 custom-scrollbar">
              {isLoadingDetalle ? (
                <div className="space-y-6">
                   {[1,2].map(i => <div key={i} className="h-40 bg-neutral-900/50 border border-neutral-800 rounded-xl animate-pulse"></div>)}
                </div>
              ) : detalle.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <Wallet size={48} className="text-neutral-700 mb-4" />
                  <h2 className="text-xl font-bold text-neutral-400">No hay deudas</h2>
                  <p className="text-sm text-neutral-500 mt-2">Este cliente no tiene facturas con saldo pendiente.</p>
                </div>
              ) : (
                detalle.map((fac, i) => (
                  <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="p-4 border-b border-neutral-800 bg-neutral-900/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <FileText size={16} className="text-indigo-400 shrink-0" />
                          <h3 className="font-bold text-white text-base">Factura {fac.numero_documento}</h3>
                          {fac.numero_orden && (<span className="flex items-center gap-1 bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 rounded border border-indigo-500/30"><Hash size={12} /> {fac.numero_orden}</span>)}
                          <span className="bg-neutral-800 text-neutral-400 text-xs px-2 py-0.5 rounded">{fac.sede_nombre}</span>
                        </div>
                        <p className="text-xs text-neutral-500">{safeFormatDate(fac.fecha_venta, "dd/MM/yyyy HH:mm")}</p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-800">
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase">Total</p>
                          <p className="font-medium text-white text-sm sm:text-base">{formatCurrency(fac.total_factura || 0)}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] sm:text-xs font-bold text-rose-500 uppercase">Resta</p>
                          <p className="font-black text-rose-400 text-base sm:text-lg">{formatCurrency(fac.saldo_pendiente || 0)}</p>
                        </div>
                        <button
                          onClick={() => {
                            setFacturaPagar(fac);
                            setMontoAbonar(fac.saldo_pendiente);
                            setFechaPago(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
                            setReferencia("");
                            // F9: Idempotency key + reset moneda al abrir modal individual
                            setIdempotencyKey(crypto.randomUUID());
                            setMonedaEntrada('USD');
                            setShowPagoModal(true);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-3 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm shadow-lg flex items-center gap-1.5 transition-all ml-auto sm:ml-0"
                        >
                          <PlusCircle size={15} /> Abonar
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-neutral-950">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs font-bold text-neutral-500 uppercase mb-3 flex items-center gap-2"><ShoppingCart size={14} /> Que Llevo</p>
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
                            {(() => {
                              const realAbonos = (fac.abonos_detalle || []).filter((a: any) => a.metodo !== 'Credito' && a.tipo_pago !== 'Credito');
                              if (realAbonos.length === 0) {
                                return <p className="text-sm text-neutral-500 italic p-2">Sin abonos registrados.</p>;
                              }
                              return realAbonos.map((a: any, j: number) => (
                                <div key={j} className="flex justify-between items-center p-2 rounded bg-neutral-900/50 border border-emerald-900/30">
                                  <div>
                                    <span className="text-sm font-medium text-emerald-400 block">{formatCurrency(a.monto)}</span>
                                    <span className="text-xs text-neutral-500">
                                      {a.metodo}
                                    </span>
                                  </div>
                                  <span className="text-xs font-medium text-neutral-400">{safeFormatDate(a.fecha, "dd/MM/yy HH:mm")}</span>
                                </div>
                              ));
                            })()}
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

      {/* MODAL HISTORIAL GLOBAL */}
      {showHistorialModal && clienteSeleccionado && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[85vh] flex flex-col">
            <button onClick={() => setShowHistorialModal(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors">
              <X size={20} />
            </button>
            <div className="mb-6">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <History className="text-emerald-400" /> Historial de Abonos
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Cliente: <span className="text-white font-bold">{clienteSeleccionado.nombre_cliente}</span>
              </p>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {isLoadingHistorial ? (
                <div className="text-center p-12 text-neutral-400 flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Cargando abonos...</span>
                </div>
              ) : historialCliente.length === 0 ? (
                <div className="text-center p-12 text-neutral-500 bg-neutral-950/50 rounded-xl border border-neutral-800/50">
                  <Wallet className="mx-auto mb-2 opacity-30" size={32} />
                  <p>No se encontraron abonos para este cliente.</p>
                </div>
              ) : (
                historialCliente.map((abono: any) => (
                  <div key={abono.id} className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl shadow-md">
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-2.5 mb-1">
                          <span className="text-xl font-black text-emerald-400">{formatCurrency(abono.monto_total)}</span>
                          <span className="text-xs font-semibold bg-neutral-800 text-neutral-200 px-2.5 py-0.5 rounded-full border border-neutral-700">
                            {abono.tipo_pago}
                          </span>
                          <span className="text-xs font-semibold bg-emerald-950 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-800/50">
                            {abono.cantidad_facturas} {abono.cantidad_facturas === 1 ? 'factura afectada' : 'facturas afectadas'}
                          </span>
                        </div>
                        {abono.referencia && (
                          <p className="text-xs text-neutral-400 font-mono mt-0.5">
                            Ref: {abono.referencia}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-white">{safeFormatDate(abono.fecha, "dd MMM yyyy")}</div>
                        <div className="text-xs text-neutral-500">{safeFormatDate(abono.fecha, "hh:mm a")}</div>
                      </div>
                    </div>

                    {/* Desglose de facturas afectadas */}
                    {abono.facturas && abono.facturas.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-neutral-900">
                        <p className="text-[11px] font-bold text-neutral-400 mb-2 uppercase tracking-wider">
                          Detalle de Facturas Aplicadas:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {abono.facturas.map((f: any, idx: number) => (
                            <div key={idx} className="bg-neutral-900/60 border border-neutral-800/80 px-3 py-1.5 rounded-lg flex justify-between items-center text-xs">
                              <span className="text-neutral-300 font-medium truncate pr-2">
                                Doc: #{f.numero_documento}
                              </span>
                              <span className="text-emerald-400 font-bold">
                                +{formatCurrency(f.monto)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PAGO GLOBAL */}
      {showPagoGlobalModal && clienteSeleccionado && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 md:p-6 w-full max-w-md shadow-2xl relative max-h-[90dvh] overflow-y-auto custom-scrollbar">
            <button onClick={() => setShowPagoGlobalModal(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white p-1 rounded-lg hover:bg-neutral-800">
              <X size={20} />
            </button>
            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2"><Wallet className="text-emerald-400" /> Abonar a Deuda</h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase block mb-1">Monto a Abonar ($)</label>
                <input
                  type="number"
                  value={montoAbonarGlobal}
                  onChange={(e) => setMontoAbonarGlobal(e.target.value)}
                  max={clienteSeleccionado.monto_adeudado}
                  className="w-full bg-neutral-950 border border-emerald-500/30 focus:border-emerald-500 text-emerald-400 font-black text-xl py-3 px-4 rounded-xl outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase block mb-1">Metodo de Pago</label>
                <CreatableSelect
                  options={metodosDisponibles.map((m) => ({ value: m, label: m }))}
                  value={{ value: metodoPago, label: metodoPago }}
                  onChange={(selected) => setMetodoPago(selected ? selected.value : '')}
                  placeholder="Escribe o selecciona..."
                  styles={{
                    control: (base) => ({ ...base, backgroundColor: '#0a0a0a', borderColor: '#262626', minHeight: '50px', borderRadius: '0.75rem', color: '#fff' }),
                    menu: (base) => ({ ...base, backgroundColor: '#171717', border: '1px solid #262626', zIndex: 9999 }),
                    option: (base, state) => ({ ...base, backgroundColor: state.isFocused ? '#262626' : '#171717', color: '#fff' }),
                    singleValue: (base) => ({ ...base, color: '#fff' }),
                    input: (base) => ({ ...base, color: '#fff' })
                  }}
                />
              </div>

              {/* F9: Boton deshabilitado durante carga para prevenir doble-submit */}
              <button
                onClick={handlePagarGlobal}
                disabled={isPagarLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-lg mt-4 transition-colors"
              >
                {isPagarLoading ? "Procesando..." : "Confirmar Abono Global"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PAGO INDIVIDUAL */}
      {showPagoModal && facturaPagar && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 md:p-6 w-full max-w-md shadow-2xl relative max-h-[90dvh] overflow-y-auto custom-scrollbar">
            <button onClick={() => setShowPagoModal(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white p-1 rounded-lg hover:bg-neutral-800">
              <X size={20} />
            </button>
            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2"><Wallet className="text-emerald-400" /> Registrar Abono</h2>

            <div className="space-y-4">
              {/* F9: Selector de moneda USD / Bs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setMonedaEntrada('USD')}
                  className={"flex-1 py-2 rounded-lg text-sm font-bold transition-colors " + (
                    monedaEntrada === 'USD'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                  )}
                >
                  USD
                </button>
                <button
                  onClick={() => setMonedaEntrada('Bs')}
                  className={"flex-1 py-2 rounded-lg text-sm font-bold transition-colors " + (
                    monedaEntrada === 'Bs'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                  )}
                >
                  Bs
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase block mb-1">
                  Monto a Abonar ({monedaEntrada})
                </label>
                <input
                  type="number"
                  value={montoAbonar}
                  onChange={(e) => setMontoAbonar(e.target.value)}
                  max={facturaPagar.saldo_pendiente}
                  className="w-full bg-neutral-950 border border-emerald-500/30 focus:border-emerald-500 text-emerald-400 font-black text-xl py-3 px-4 rounded-xl outline-none transition-colors"
                />
                <p className="text-xs text-neutral-500 mt-1">Saldo pendiente maximo: ${facturaPagar.saldo_pendiente}</p>

                {/* F9: Equivalente en tiempo real */}
                {tasaBCV > 1 && parseFloat(montoAbonar) > 0 && (
                  <div className="mt-2 p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                    <p className="text-xs text-neutral-500 mb-1">Tasa BCV: {tasaBCV.toFixed(2)} Bs/$</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">USD:</span>
                      <span className="text-white font-bold">${montoEquivalente.usd.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Bs:</span>
                      <span className="text-white font-bold">{montoEquivalente.bs.toFixed(2)} Bs</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase block mb-1">Metodo de Pago</label>
                <CreatableSelect
                  options={metodosDisponibles.map((m) => ({ value: m, label: m }))}
                  value={{ value: metodoPago, label: metodoPago }}
                  onChange={(selected) => setMetodoPago(selected ? selected.value : '')}
                  placeholder="Escribe o selecciona..."
                  styles={{
                    control: (base) => ({ ...base, backgroundColor: '#0a0a0a', borderColor: '#262626', minHeight: '50px', borderRadius: '0.75rem', color: '#fff' }),
                    menu: (base) => ({ ...base, backgroundColor: '#171717', border: '1px solid #262626', zIndex: 9999 }),
                    option: (base, state) => ({ ...base, backgroundColor: state.isFocused ? '#262626' : '#171717', color: '#fff' }),
                    singleValue: (base) => ({ ...base, color: '#fff' }),
                    input: (base) => ({ ...base, color: '#fff' })
                  }}
                />
              </div>

              {/* F9: Boton deshabilitado durante carga para prevenir doble-submit */}
              <button
                onClick={handlePagar}
                disabled={isPagarLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-lg mt-4 transition-colors"
              >
                {isPagarLoading ? "Procesando..." : "Confirmar Pago"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] px-5 py-3.5 rounded-xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200 ${
          toast.type === 'success' 
            ? 'bg-neutral-900 border-emerald-500/50 text-emerald-200' 
            : 'bg-neutral-900 border-rose-500/50 text-rose-200'
        }`}>
          <div className={`w-2.5 h-2.5 rounded-full ${toast.type === 'success' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400 animate-pulse'}`} />
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800">
            <X size={16} />
          </button>
        </div>
      )}

    </div>
  );
}
