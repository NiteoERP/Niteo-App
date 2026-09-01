import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit, Wallet, Calendar, MapPin, CheckCircle, XCircle, ChevronDown } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { CierreBotonesControl } from './CierreBotonesControl';
import { redirect } from 'next/navigation';

export default async function CierreDetallePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  
  const { data: profile } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
  const isMaster = profile?.rol === 'MASTER';

  const { data: cierre, error } = await supabase
    .from('cierres_caja')
    .select('*, sedes(nombre_sede)')
    .eq('id', params.id)
    .single();

  const { data: transacciones } = await supabase
    .from('cierres_transacciones')
    .select('*')
    .eq('cierre_id', params.id);

  if (error || !cierre) {
    return (
      <div className="p-6">
        <h1 className="text-xl text-rose-400">Cierre no encontrado</h1>
        <Link href="/dashboard/caja" className="text-indigo-400 underline mt-4 inline-block">Volver</Link>
      </div>
    );
  }

  // Ensure JSON defaults
  const txs = transacciones || [];

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/caja" className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Detalle de Cierre</h1>
            <p className="text-neutral-400">{new Date(cierre.fecha_cierre + 'T12:00:00Z').toLocaleDateString('es-VE')} - {cierre.sedes?.nombre_sede}</p>
          </div>
        </div>
        <CierreBotonesControl cierreId={cierre.id} isMaster={isMaster} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl">
          <p className="text-neutral-400 text-xs uppercase tracking-wider font-bold mb-1">Esperado (Sistema)</p>
          <p className="text-2xl font-black text-neutral-200">${Number(cierre.sistema_total_esperado || 0).toFixed(2)}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl">
          <p className="text-neutral-400 text-xs uppercase tracking-wider font-bold mb-1">Físico (Declarado)</p>
          <p className="text-2xl font-black text-white">${Number((cierre.real_efectivo_usd || 0) + (cierre.real_bancos_usd || 0) + ((cierre.real_efectivo_bs || 0) / (cierre.tasa_cambio || 1)) + ((cierre.real_bancos_bs || 0) / (cierre.tasa_cambio || 1))).toFixed(2)}</p>
        </div>
        <div className={`border p-5 rounded-2xl ${cierre.diferencia_total >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
          <p className={`text-xs uppercase tracking-wider font-bold mb-1 ${cierre.diferencia_total >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>Diferencia</p>
          <p className={`text-2xl font-black ${cierre.diferencia_total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {cierre.diferencia_total > 0 ? '+' : ''}{Number(cierre.diferencia_total).toFixed(2)}$
          </p>
        </div>
      </div>

      {/* DESGLOSE AGRUPADO POR MTODO */}
      <div className="space-y-3">
        <h3 className="font-bold text-white mb-4">Desglose por Métodos de Pago</h3>
        {txs.length > 0 ? (
          Object.entries(
            txs.reduce((acc, t) => {
              if (!acc[t.metodo]) acc[t.metodo] = { moneda: t.moneda, total: 0, pagos: [] };
              acc[t.metodo].pagos.push(t);
              acc[t.metodo].total += Number(t.monto);
              return acc;
            }, {} as Record<string, { moneda: string, total: number, pagos: any[] }>)
          ).map(([metodo, data]: [string, any]) => (
            <details key={metodo} className="group bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
              <summary className="p-4 flex items-center justify-between cursor-pointer bg-neutral-900/50 hover:bg-neutral-800/50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white uppercase">{metodo}</span>
                  <span className="text-xs text-neutral-500 bg-neutral-800 px-2 py-1 rounded-md">{data.pagos.length} pagos</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-black text-emerald-400">{data.total.toFixed(2)} {data.moneda}</span>
                  <ChevronDown className="text-neutral-500 group-open:rotate-180 transition-transform" size={18} />
                </div>
              </summary>
              <div className="divide-y divide-neutral-800/50 border-t border-neutral-800">
                {data.pagos.map((t: any) => (
                  <div key={t.id} className="p-4 flex items-center justify-between bg-neutral-950/30 pl-8">
                    <div>
                      <p className="font-medium text-neutral-300 text-sm">{t.banco && t.banco !== 'N/A' ? t.banco : 'Sin banco/referencia'}</p>
                      {t.referencia && t.referencia !== 'N/A' && <p className="text-xs text-neutral-500 mt-0.5">Ref: {t.referencia}</p>}
                    </div>
                    <span className="font-bold text-emerald-400/80 text-sm">{Number(t.monto).toFixed(2)} {t.moneda}</span>
                  </div>
                ))}
              </div>
            </details>
          ))
        ) : (
          <div className="p-6 text-center text-neutral-500 bg-neutral-900 border border-neutral-800 rounded-2xl">
            No hay métodos registrados
          </div>
        )}
      </div>

      {cierre.observaciones && (
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl mt-6">
          <p className="text-neutral-400 text-xs uppercase tracking-wider font-bold mb-2">Observaciones</p>
          <p className="text-neutral-200">{cierre.observaciones}</p>
        </div>
      )}
    </div>
  );
}
