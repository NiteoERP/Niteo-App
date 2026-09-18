'use client';

import React, { useState, useTransition } from 'react';
import { Search, Printer, CheckCircle, Clock, AlertTriangle, X, Send } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { recibirDespachoEnServidor } from '@/actions/despachos-actions';

export default function HistorialClient({ despachos, userSedeId, userRole }: { despachos: any[], userSedeId: string, userRole: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDespacho, setSelectedDespacho] = useState<any>(null);
  const [isRecepcionarOpen, setIsRecepcionarOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [cantidadesRecibidas, setCantidadesRecibidas] = useState<Record<string, number>>({});

  const filtered = despachos.filter(d => 
    (d.origen?.nombre_sede || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.destino?.nombre_sede || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.id.slice(0,8).includes(searchTerm.toLowerCase()))
  );

  const openRecepcionar = (d: any) => {
    setSelectedDespacho(d);
    const initial: Record<string, number> = {};
    d.items.forEach((i: any) => initial[i.id] = Number(i.cantidad));
    setCantidadesRecibidas(initial);
    setIsRecepcionarOpen(true);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleImprimir = (d: any) => {
    // Generar un PDF estilo ticket/comprobante simple
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    let itemsHtml = '';
    d.items.forEach((i: any) => {
      itemsHtml += `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${i.nombre}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${i.cantidad} ${i.unidad_medida}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${i.cantidad_recibida !== null ? i.cantidad_recibida : '-'}</td>
        </tr>
      `;
    });

    const html = `
      <html>
        <head>
          <title>Comprobante de Despacho #${d.id.slice(0,8)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1 { font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .info { margin-bottom: 20px; }
            .info p { margin: 5px 0; font-size: 14px; }
            table { w-full; border-collapse: collapse; margin-top: 20px; width: 100%; }
            th { text-align: left; padding: 8px; border-bottom: 2px solid #333; font-size: 14px; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; }
            .firma { border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 5px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>NITEO - COMPROBANTE DE DESPACHO</h1>
          <div class="info">
            <p><strong>ID:</strong> ${d.id}</p>
            <p><strong>Fecha Emisión:</strong> ${new Date(d.created_at).toLocaleString()}</p>
            <p><strong>Estado:</strong> ${d.estado}</p>
            <p><strong>Sede Origen:</strong> ${d.origen?.nombre_sede}</p>
            <p><strong>Sede Destino:</strong> ${d.destino?.nombre_sede}</p>
            <p><strong>Despachado por:</strong> ${d.creador?.nombre_completo || 'Usuario'}</p>
            ${d.notas ? `<p><strong>Notas:</strong> ${d.notas}</p>` : ''}
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Cant. Enviada</th>
                <th style="text-align: center;">Cant. Recibida</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="footer">
            <div class="firma">Firma Entregado<br>(Sede Origen)</div>
            <div class="firma">Firma Recibido<br>(Sede Destino)</div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleConfirmarRecepcion = () => {
    if (!selectedDespacho) return;
    
    // Prepare items
    const payload = selectedDespacho.items.map((i: any) => ({
      item_id: i.id,
      cantidad_recibida: cantidadesRecibidas[i.id]
    }));

    startTransition(async () => {
      setErrorMsg('');
      const res = await recibirDespachoEnServidor(selectedDespacho.id, payload);
      if (res.success) {
        setSuccessMsg('Recepción confirmada con éxito. Inventarios actualizados.');
        setTimeout(() => {
          setIsRecepcionarOpen(false);
          window.location.reload();
        }, 2000);
      } else {
        setErrorMsg(res.error || 'Ocurrió un error al confirmar.');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
            <input 
              type="text"
              placeholder="Buscar por ID, Origen o Destino..."
              className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl pl-10 pr-4 py-2 outline-none focus:border-indigo-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-950/50 text-neutral-400">
              <tr>
                <th className="px-4 py-3 rounded-l-xl font-medium">ID Despacho</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Origen → Destino</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 rounded-r-xl font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {filtered.map(d => {
                const isDestino = userRole === 'ADMINISTRADOR' || userRole === 'GERENTE_GENERAL' || userSedeId === d.sede_destino_id;
                return (
                  <tr key={d.id} className="hover:bg-neutral-800/20 transition-colors">
                    <td className="px-4 py-3 text-neutral-300 font-mono">#{d.id.slice(0,8)}</td>
                    <td className="px-4 py-3 text-neutral-400">
                      {format(new Date(d.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white">{d.origen?.nombre_sede}</span>
                        <span className="text-neutral-500">→</span>
                        <span className="text-emerald-400">{d.destino?.nombre_sede}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-400">{d.items?.length || 0} items</td>
                    <td className="px-4 py-3">
                      {d.estado === 'COMPLETADO' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                          <CheckCircle size={14} /> Recibido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium">
                          <Clock size={14} /> En Tránsito
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleImprimir(d)} className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors" title="Imprimir PDF">
                          <Printer size={18} />
                        </button>
                        {d.estado === 'EN_TRANSITO' && isDestino && (
                          <button 
                            onClick={() => openRecepcionar(d)} 
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                          >
                            <CheckCircle size={14} /> Recepcionar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">No se encontraron despachos.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Recepción */}
      {isRecepcionarOpen && selectedDespacho && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <CheckCircle className="text-emerald-400" /> Recepcionar Despacho #{selectedDespacho.id.slice(0,8)}
                </h3>
                <p className="text-sm text-neutral-400 mt-1">Verifica las cantidades recibidas. Modifica si hubo algún faltante.</p>
              </div>
              <button onClick={() => setIsRecepcionarOpen(false)} className="text-neutral-500 hover:text-white transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {errorMsg && <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">{errorMsg}</div>}
              {successMsg && <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm">{successMsg}</div>}

              <div className="bg-neutral-950/30 border border-neutral-800/50 rounded-xl p-4">
                <table className="w-full text-left text-sm">
                  <thead className="text-neutral-400 border-b border-neutral-800/50">
                    <tr>
                      <th className="pb-2">Producto / Insumo</th>
                      <th className="pb-2 text-center">Cant. Enviada</th>
                      <th className="pb-2 text-center w-32">Cant. Recibida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/30 text-neutral-300">
                    {selectedDespacho.items.map((i: any) => {
                      const cantEnviada = Number(i.cantidad);
                      const cantRecibida = cantidadesRecibidas[i.id] ?? cantEnviada;
                      const hasDiff = cantRecibida !== cantEnviada;
                      
                      return (
                        <tr key={i.id}>
                          <td className="py-3">{i.nombre} <span className="text-neutral-500 text-xs ml-1">({i.unidad_medida})</span></td>
                          <td className="py-3 text-center">{cantEnviada}</td>
                          <td className="py-3">
                            <input 
                              type="number"
                              min="0"
                              max={cantEnviada}
                              step="any"
                              value={cantRecibida}
                              onChange={(e) => setCantidadesRecibidas({ ...cantidadesRecibidas, [i.id]: parseFloat(e.target.value) || 0 })}
                              className={`w-full bg-neutral-950 border text-center rounded-lg px-2 py-1.5 focus:outline-none ${hasDiff ? 'border-amber-500/50 text-amber-400' : 'border-neutral-700 text-white focus:border-indigo-500'}`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {Object.keys(cantidadesRecibidas).some(k => cantidadesRecibidas[k] !== Number(selectedDespacho.items.find((i:any) => i.id === k)?.cantidad)) && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-amber-400">
                  <AlertTriangle className="shrink-0" />
                  <div className="text-sm">
                    <p className="font-bold">Diferencia Detectada</p>
                    <p className="text-amber-400/80 mt-1">Los faltantes serán devueltos automáticamente al inventario de la sede de origen <b>({selectedDespacho.origen?.nombre_sede})</b> como un Ajuste.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-neutral-800 bg-neutral-950/50 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsRecepcionarOpen(false)} disabled={isPending} className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors text-sm">
                Cancelar
              </button>
              <button 
                onClick={handleConfirmarRecepcion} 
                disabled={isPending}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors text-sm flex items-center gap-2"
              >
                {isPending ? 'Procesando...' : <><Send size={16} /> Finalizar Recepción</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
