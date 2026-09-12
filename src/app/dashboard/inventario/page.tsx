import React from 'react';
import { createClient } from '@/utils/supabase/server';
import InsumosManager from './InsumosManager';
import TransformacionesManager from './TransformacionesManager';
import { ArrowRightLeft } from 'lucide-react';
import ProductosEnriquecidos from './ProductosEnriquecidos';
import { Package, FileBox, Store, AlertTriangle } from 'lucide-react';
import SedeSelector from '@/components/inventario/SedeSelector';
import { getMovimientosInventario } from './actions';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function InventarioPage({ searchParams }: { searchParams: Promise<{ tab?: string, sede?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const empresaId = user?.app_metadata?.empresa_id;

  if (!empresaId) return <div className="p-8 text-rose-400">Error: No tienes empresa configurada.</div>;

  const { data: profile } = await supabase.from('perfiles').select('sede_id, rol, permisos').eq('id', user?.id).single();
  
  // Consultar sedes de la empresa directamente con la sesión autenticada
  const { data: sedesData } = await supabase
    .from('sedes')
    .select('id, nombre_sede')
    .eq('empresa_id', empresaId)
    .order('nombre_sede');
  const sedes = sedesData || [];

  // Ver costos y movimientos: solo MASTER o quien tenga el permiso 'finanzas'
  const canSeeCosts = profile?.rol === 'MASTER' || (profile?.permisos || []).includes('finanzas');

  let activeSedeId = profile?.sede_id;
  if ((profile?.rol === 'MASTER' || !profile?.sede_id) && params.sede) {
    activeSedeId = params.sede;
  } else if (!activeSedeId && sedes.length > 0) {
    activeSedeId = sedes[0].id;
  }

  const currentTab = params.tab || 'insumos';

  let insumos: any[] = [];
  let productos: any[] = [];
  let recetas: any[] = [];
  let movimientos: any[] = [];

  if (currentTab === 'insumos' || currentTab === 'transformaciones') {
    let queryInsumos = supabase
      .from('inventario_insumos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nombre');

    if (activeSedeId) {
      queryInsumos = queryInsumos.eq('sede_id', activeSedeId);
    }

    const { data: insumosData } = await queryInsumos;
    insumos = insumosData || [];

    // Movimientos solo para usuarios con acceso financiero
    if (currentTab === 'insumos' && canSeeCosts) {
      movimientos = await getMovimientosInventario(empresaId, activeSedeId || undefined);
    }
  } else if (currentTab === 'productos') {
    let queryInsumos = supabase
      .from('inventario_insumos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nombre');

    if (activeSedeId) {
      queryInsumos = queryInsumos.eq('sede_id', activeSedeId);
    }

    const [resProds, resInsumos, resRecetas] = await Promise.all([
      supabase
        .from('productos')
        .select('id, nombre, codigo_barras, precio_venta, descripcion, es_compuesto, costo, estado_activo')
        .eq('empresa_id', empresaId)
        .order('nombre'),
      queryInsumos,
      supabase.from('recetas').select('*').eq('empresa_id', empresaId),
    ]);
    productos = resProds.data || [];
    insumos = resInsumos.data || [];
    recetas = resRecetas.data || [];
  }

  if (sedes.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-neutral-900 border border-neutral-800 rounded-2xl text-center space-y-4 shadow-xl">
        <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
          <Store size={28} />
        </div>
        <h2 className="text-xl font-bold text-white">No tienes sedes registradas</h2>
        <p className="text-neutral-400 text-sm">
          Para gestionar el inventario de insumos y materia prima, tu empresa necesita tener al menos una sede creada.
        </p>
        <div className="pt-2">
          <Link
            href="/dashboard/configuracion"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
          >
            Configurar Sedes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl animate-in fade-in duration-300">

      <div className="border-b border-neutral-800 pb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <Package className="text-indigo-400" size={24} />
              Inventario y Recetas
            </h1>
            <p className="text-neutral-400 text-xs md:text-sm mt-1">Controla tu materia prima y diseña el escandallo de tus productos.</p>
          </div>
          {sedes.length > 0 && activeSedeId && (
            (profile?.rol === 'MASTER' || !profile?.sede_id) ? (
              <SedeSelector sedes={sedes} activeSedeId={activeSedeId} />
            ) : (
              <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 w-fit text-sm text-neutral-300">
                <Store size={16} className="text-indigo-400" />
                <span>Sede: <strong className="text-white">{sedes.find(s => s.id === activeSedeId)?.nombre_sede || 'Asignada'}</strong></span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-px">
        <a href={`?tab=insumos${activeSedeId ? `&sede=${activeSedeId}` : ''}`}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${currentTab === 'insumos' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'}`}>
          <FileBox size={16} /> Almacén (Insumos)
        </a>
        <a href={`?tab=productos${activeSedeId ? `&sede=${activeSedeId}` : ''}`}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${currentTab === 'productos' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'}`}>
          <Package size={16} /> Productos de Venta
        </a>
        <a href={`?tab=transformaciones${activeSedeId ? `&sede=${activeSedeId}` : ''}`}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${currentTab === 'transformaciones' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'}`}>
          <ArrowRightLeft size={16} /> Transformaciones
        </a>
      </div>

      {/* Contenido */}
      <div className="pt-2">
        {currentTab === 'insumos' && (
          <InsumosManager
            initialInsumos={insumos}
            empresaId={empresaId}
            sedeId={activeSedeId || ''}
            initialMovimientos={movimientos}
            canSeeCosts={canSeeCosts}
          />
        )}
        {currentTab === 'productos' && (
          <ProductosEnriquecidos productos={productos} insumos={insumos} recetas={recetas} empresaId={empresaId} />
        )}
        {currentTab === 'transformaciones' && (
          <TransformacionesManager insumos={insumos} activeSedeId={activeSedeId || ''} />
        )}
      </div>

    </div>
  );
}
