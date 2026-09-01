import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit, Wallet, Calendar, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function CierreDetallePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: cierre, error } = await supabase
    .from('cierres_caja')
    .select('*, sedes(nombre_sede)')
    .eq('id', params.id)
    .single();

  if (error || !cierre) {
    return (
      <div className="p-6">
        <h1 className="text-xl text-rose-400">Cierre no encontrado</h1>
        <Link href="/dashboard/caja" className="text-indigo-400 underline mt-4 inline-block">Volver</Link>
      </div>
    );
  }

  // Ensure JSON defaults
  const mFisico = cierre.montos_fisicos || {};
  const mEsperado = cierre.montos_esperados || {};
  const eDiferencias = cierre.desglose_diferencias || {};

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
        <Link href={`/dashboard/caja/${cierre.id}/editar`} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl flex items-center gap-2">
          <Edit size={16} /> Editar
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl">
          <p className="text-neutral-400 text-xs uppercase tracking-wider font-bold mb-1">Esperado (Sistema)</p>
          <p className="text-2xl font-black text-neutral-200">${Number(cierre.total_esperado_usd).toFixed(2)}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl">
          <p className="text-neutral-400 text-xs uppercase tracking-wider font-bold mb-1">Físico (Declarado)</p>
          <p className="text-2xl font-black text-white">${Number(cierre.total_fisico_usd).toFixed(2)}</p>
        </div>
        <div className={`border p-5 rounded-2xl ${cierre.diferencia_total >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
          <p className={`text-xs uppercase tracking-wider font-bold mb-1 ${cierre.diferencia_total >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>Diferencia</p>
          <p className={`text-2xl font-black ${cierre.diferencia_total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {cierre.diferencia_total > 0 ? '+' : ''}{Number(cierre.diferencia_total).toFixed(2)}$
          </p>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-neutral-800 bg-neutral-900/50">
          <h3 className="font-bold text-white">Desglose por Métodos de Pago</h3>
        </div>
        <div className="divide-y divide-neutral-800/50">
          {Object.keys(mEsperado).length > 0 ? Object.keys(mEsperado).map(metodo => {
            const esperado = Number(mEsperado[metodo] || 0);
            const fisico = Number(mFisico[metodo] || 0);
            const dif = fisico - esperado;
            const isOk = dif >= -0.05 && dif <= 0.05; // Margen de 5 centavos
            
            return (
              <div key={metodo} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-neutral-200 uppercase">{metodo.replace('_', ' ')}</p>
                  <div className="flex gap-4 mt-1 text-xs">
                    <span className="text-neutral-500">Esperado: {esperado.toFixed(2)}</span>
                    <span className="text-indigo-400">Declarado: {fisico.toFixed(2)}</span>
                  </div>
                </div>
                <div className={`flex items-center gap-2 font-bold ${isOk ? 'text-emerald-400' : (dif > 0 ? 'text-indigo-400' : 'text-rose-400')}`}>
                  {isOk ? <CheckCircle size={18} /> : (dif > 0 ? '+' + dif.toFixed(2) : dif.toFixed(2))}
                </div>
              </div>
            );
          }) : (
             <div className="p-6 text-center text-neutral-500">No hay métodos registrados</div>
          )}
        </div>
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
