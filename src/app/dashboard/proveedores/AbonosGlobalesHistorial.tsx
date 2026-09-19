"use client";

import React, { useState, useEffect } from "react";
import { History, FileText, X, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { getHistorialAbonosGlobales } from "./actions";
import { useEmpresa } from "@/components/providers/EmpresaProvider";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatFecha } from "@/utils/date-utils";

export default function AbonosGlobalesHistorial({
  proveedorId,
  proveedorNombre,
  sedeId,
  onClose
}: {
  proveedorId: string;
  proveedorNombre: string;
  sedeId: string;
  onClose: () => void;
}) {
  const { formatCurrency, empresa } = useEmpresa();
  const [loading, setLoading] = useState(true);
  const [abonos, setAbonos] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getHistorialAbonosGlobales(proveedorId, sedeId);
      if (res.success && res.data) {
        setAbonos(res.data);
      }
      setLoading(false);
    }
    load();
  }, [proveedorId, sedeId]);

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Historial de Abonos - ${proveedorNombre}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Empresa: ${empresa?.nombre_comercial || 'Niteo'}`, 14, 22);
    doc.text(`Fecha de generacin: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 27);

    const tableBody: any[] = [];
    
    abonos.forEach((abono) => {
      tableBody.push([
        formatFecha(abono.fecha_pago, { includeTime: true }),
        abono.metodo_pago,
        abono.referencia || '-',
        abono.banco_origen || '-',
        `$${Number(abono.monto_total).toFixed(2)}`,
        abono.cantidad_facturas.toString()
      ]);
      
      // Filas anidadas de las facturas afectadas
      if (abono.facturas_afectadas && abono.facturas_afectadas.length > 0) {
        abono.facturas_afectadas.forEach((fac: any) => {
           tableBody.push([
             { content: `   \u21B3 Factura: ${fac.numero_factura}`, colSpan: 4, styles: { fontStyle: 'italic', textColor: [100, 100, 100] } },
             { content: `$${Number(fac.monto_aplicado).toFixed(2)}`, colSpan: 2, styles: { fontStyle: 'italic', textColor: [100, 100, 100] } }
           ]);
        });
      }
    });

    autoTable(doc, {
      startY: 35,
      head: [['Fecha', 'Mtodo', 'Referencia', 'Banco', 'Monto Total', 'Facturas']],
      body: tableBody,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`Abonos_${proveedorNombre.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <History className="text-indigo-500" />
              Historial de Abonos Globales
            </h3>
            <p className="text-sm text-neutral-400 mt-1">Proveedor: <span className="font-semibold text-white">{proveedorNombre}</span></p>
          </div>
          <button onClick={onClose} className="p-2 bg-neutral-800/50 hover:bg-neutral-800 rounded-full text-neutral-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-neutral-800 bg-neutral-950 flex justify-between items-center">
          <p className="text-sm text-neutral-400">Total de abonos registrados: {abonos.length}</p>
          <button onClick={exportPDF} disabled={abonos.length === 0} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors">
            <FileText size={16} /> Exportar PDF
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-10 text-neutral-400">Cargando abonos...</div>
          ) : abonos.length === 0 ? (
            <div className="text-center py-10 text-neutral-500 border-2 border-dashed border-neutral-800 rounded-xl">
              No hay abonos registrados para este proveedor.
            </div>
          ) : (
            abonos.map((abono, idx) => {
              const isExpanded = expanded[idx];
              return (
                <div key={idx} className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
                  <div 
                    onClick={() => toggleExpand(idx.toString())}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-900/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <History size={20} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">Abono {abono.metodo_pago}</div>
                        <div className="text-xs text-neutral-400 mt-0.5">
                          {formatFecha(abono.fecha_pago, { includeTime: true })} ? Ref: {abono.referencia || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-sm font-bold text-emerald-400">
                          {formatCurrency(abono.monto_total)}
                        </div>
                        <div className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider mt-0.5">
                          {abono.cantidad_facturas} FACTURA(S)
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={20} className="text-neutral-500" /> : <ChevronDown size={20} className="text-neutral-500" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-neutral-900/50 p-4 border-t border-neutral-800">
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Distribucin del abono</h4>
                      <div className="space-y-2">
                        {abono.facturas_afectadas.map((fac: any, fidx: number) => (
                          <div key={fidx} className="flex items-center justify-between bg-neutral-950 p-2.5 rounded-lg border border-neutral-800/50">
                            <span className="text-sm text-neutral-300 font-medium">Factura N {fac.numero_factura}</span>
                            <span className="text-sm text-emerald-400/90 font-bold">{formatCurrency(fac.monto_aplicado)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
