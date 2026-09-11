'use client';

import React, { useState } from 'react';
import { reportarPagoSuscripcion } from '@/actions/licencia-actions';
import { CheckCircle, Clock, UploadCloud, FileText, AlertCircle, RefreshCw } from 'lucide-react';

export default function BillingClientForm({ historialPagos, planActual }: { historialPagos: any[], planActual: string }) {
  const [tab, setTab] = useState<'reportar' | 'historial'>('reportar');
  const [loading, setLoading] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState('');

  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState('Zelle');
  const [referencia, setReferencia] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('monto', monto);
    formData.append('metodo_pago', metodo);
    formData.append('referencia', referencia);
    formData.append('plan_solicitado', planActual);
    if (file) {
      formData.append('comprobante', file);
    }

    try {
      const res = await reportarPagoSuscripcion(formData);
      if (res.success) {
        setExito(true);
        setMonto('');
        setReferencia('');
        setFile(null);
      } else {
        setError(res.error || 'Error desconocido');
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col">
      <div className="flex items-center border-b border-neutral-800">
        <button 
          onClick={() => setTab('reportar')}
          className={`flex-1 py-4 text-sm font-bold transition-colors ${tab === 'reportar' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          Reportar Pago
        </button>
        <button 
          onClick={() => setTab('historial')}
          className={`flex-1 py-4 text-sm font-bold transition-colors ${tab === 'historial' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          Historial de Pagos
        </button>
      </div>

      <div className="p-6">
        {tab === 'reportar' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {exito ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-xl text-center">
                <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Pago reportado con éxito</h3>
                <p className="text-sm text-emerald-400 mb-6">Nuestro equipo revisará el comprobante y activará tu licencia en breve.</p>
                <button type="button" onClick={() => setExito(false)} className="px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700">
                  Reportar otro pago
                </button>
              </div>
            ) : (
              <>
                {error && (
                  <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Monto Pagado ($)</label>
                    <input required type="number" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg h-10 px-3 text-white focus:border-indigo-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Método de Pago</label>
                    <select value={metodo} onChange={e => setMetodo(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg h-10 px-3 text-white focus:border-indigo-500 focus:outline-none">
                      <option>Zelle</option>
                      <option>Binance Pay</option>
                      <option>Pago Móvil</option>
                      <option>Efectivo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Referencia</label>
                  <input required type="text" value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Número de confirmación" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg h-10 px-3 text-white focus:border-indigo-500 focus:outline-none" />
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Comprobante (Captura de pantalla)</label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-700 rounded-xl hover:bg-neutral-800/50 hover:border-indigo-500 transition-all cursor-pointer">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-neutral-500">
                      <UploadCloud size={24} className="mb-2" />
                      <p className="text-sm">{file ? file.name : 'Haz clic para subir archivo'}</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
                  </label>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || !monto || !referencia}
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                  Enviar Reporte
                </button>
              </>
            )}
          </form>
        )}

        {tab === 'historial' && (
          <div className="space-y-3">
            {historialPagos.length === 0 ? (
              <div className="text-center py-10 text-neutral-500">
                <FileText size={32} className="mx-auto mb-3 opacity-50" />
                <p>No hay pagos reportados</p>
              </div>
            ) : (
              historialPagos.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-neutral-950 rounded-xl border border-neutral-800">
                  <div>
                    <p className="font-bold text-white">${p.monto} <span className="text-neutral-500 font-normal text-sm ml-2">via {p.metodo_pago}</span></p>
                    <p className="text-xs text-neutral-500 mt-1">Ref: {p.referencia} • {new Date(p.fecha_reporte).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className={`px-2 py-1 text-xs font-bold rounded-md ${
                      p.estado === 'APROBADO' ? 'bg-emerald-500/20 text-emerald-400' :
                      p.estado === 'RECHAZADO' ? 'bg-red-500/20 text-red-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {p.estado}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
