import React from 'react';
import Link from 'next/link';
import { getHistorialCierres } from '@/actions/cierres-actions';
import { getSedes } from '@/actions/sedes-actions';
import { Plus, Search, Calendar, MapPin, DollarSign, Wallet, BarChart2 } from 'lucide-react';

export const dynamic = 'force-dynamic';
import { CierreEnCursoBanner } from '@/components/cierres/CierreEnCursoBanner';

export default async function CajaPage(props: { searchParams: Promise<{ sede?: string }> }) {
  const searchParams = await props.searchParams;
  const sedes = await getSedes();
  // By default, if no sede is specified, getHistorialCierres will use profile.sede_id (or ALL if master and ALL passed)
  const sedeFiltro = searchParams.sede || 'ALL';
  const cierres = await getHistorialCierres(sedeFiltro);

  return (
    <div className="p-6 md:p-10 animate-in fade-in duration-500 max-w-6xl mx-auto space-y-6">
      {/* BANNER */}
      <CierreEnCursoBanner />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Cierres de Caja</h1>
          <p className="text-neutral-400 mt-1">Historial de cuadres diarios y cierres de turno.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link 
            href="/dashboard/caja/resumen" 
            className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            <BarChart2 size={18} />
            <span>Resumen</span>
          </Link>
          <Link 
            href="/dashboard/caja/nuevo" 
            className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            <span>Nuevo Cierre</span>
          </Link>
        </div>
      </div>

      {/* FILTER BAR */}
      {sedes.length > 1 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="flex items-center gap-3 text-neutral-400">
            <MapPin size={18} />
            <span className="text-sm font-medium">Filtrar por Sede:</span>
          </div>
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
            <Link 
              href="/dashboard/caja" 
              className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${sedeFiltro === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'}`}
            >
              Todas
            </Link>
            {sedes.map(s => (
              <Link 
                key={s.id}
                href={`/dashboard/caja?sede=${s.id}`} 
                className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${sedeFiltro === s.id ? 'bg-indigo-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'}`}
              >
                {s.nombre_sede}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* LISTA DE CIERRES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {cierres.length === 0 ? (
          <div className="col-span-full bg-neutral-900/50 border border-neutral-800 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center text-neutral-500 mb-4">
              <Calendar size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No hay cierres registrados</h3>
            <p className="text-neutral-400 max-w-sm mb-6">El historial de cierres de caja en esta sede está vacío.</p>
            <Link href="/dashboard/caja/nuevo" className="bg-neutral-800 hover:bg-neutral-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors">
              Crear el primer cierre
            </Link>
          </div>
        ) : (
          cierres.map(c => (
            <div key={c.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 hover:border-indigo-500/30 transition-colors group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                    <Wallet size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">Cierre {new Date(c.fecha_cierre + 'T12:00:00Z').toLocaleDateString('es-VE')} - {c.sedes?.nombre_sede || 'Sede'}</h4>
                    <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1">
                      <span className="flex items-center gap-1"><MapPin size={12} /> {c.sedes?.nombre_sede || 'Sede Local'}</span>
                      <span>•</span>
                      <span>Resp: {c.usuarios?.nombre || 'Usuario'}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${c.diferencia_total >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {c.diferencia_total >= 0 ? '+' : ''}{Number(c.diferencia_total).toFixed(2)}$ DIF
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-black/30 rounded-xl p-3 border border-neutral-800/50">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider mb-1">Venta Esperada</p>
                  <p className="text-lg font-black text-neutral-300">${Number(c.sistema_total_esperado || 0).toFixed(2)}</p>
                </div>
                <div className="bg-black/30 rounded-xl p-3 border border-neutral-800/50">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider mb-1">Físico Registrado</p>
                  <p className="text-lg font-black text-white">${Number((c.real_efectivo_usd || 0) + (c.real_bancos_usd || 0) + ((c.real_efectivo_bs || 0) / (c.tasa_cambio || 1)) + ((c.real_bancos_bs || 0) / (c.tasa_cambio || 1))).toFixed(2)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-500 pt-3 border-t border-neutral-800">
                <span>Tasa BCV: {Number(c.tasa_cambio).toFixed(2)} Bs</span>
                <span>Registrado: {new Date(c.fecha_registro).toLocaleString('es-VE')}</span>
              
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-neutral-800">
              <Link href={`/dashboard/caja/${c.id}`} className="px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors">Ver Detalles</Link>
              <Link href={`/dashboard/caja/${c.id}/editar`} className="px-3 py-1.5 text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors">Editar</Link>
            </div>
          </div>
        </div>
      ))
    )}
      </div>
    </div>
  );
}
