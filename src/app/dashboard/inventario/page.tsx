import React from 'react';
import { createClient } from '@/utils/supabase/server';
import InsumosManager from './InsumosManager';
import TransformacionesManager from './TransformacionesManager';
import { ArrowRightLeft } from 'lucide-react';
import ProductosEnriquecidos from './ProductosEnriquecidos';
import { Package, Beaker, FileBox } from 'lucide-react';
import SedeSelector from '@/components/inventario/SedeSelector';

export default async function InventarioPage({ searchParams }: { searchParams: Promise<{ tab?: string, sede?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const empresaId = user?.app_metadata?.empresa_id;

  if (!empresaId) return <div className="p-8 text-rose-400">Error: No tienes empresa configurada.</div>;

  const { data: profile } = await supabase.from('perfiles').select('sede_id, rol').eq('id', user?.id).single();
  const { data: sedesDb } = await supabase.from('sedes').select('id, nombre_sede').eq('empresa_id', empresaId);
  const sedes = sedesDb || [];
  
  let activeSedeId = profile?.sede_id;
  if (profile?.rol === 'MASTER' && params.sede) {
    activeSedeId = params.sede;
  } else if (!activeSedeId && sedes.length > 0) {
    activeSedeId = sedes[0].id;
  }

  const currentTab = params.tab || 'insumos';

  let insumos: any[] = [];
  let productos: any[] = [];
  let recetas: any[] = [];

  if (currentTab === 'insumos') {
    let query = supabase.from('inventario_insumos').select('*').eq('empresa_id', empresaId);
    if (activeSedeId) {
      query = query.eq('sede_id', activeSedeId);
    }
    const { data } = await query;
    insumos = data || [];
  } else if (currentTab === 'productos') {
    let insumosQuery = supabase.from('inventario_insumos').select('*').eq('empresa_id', empresaId);
    if (activeSedeId) insumosQuery = insumosQuery.eq('sede_id', activeSedeId);

    // Para el editor de recetas necesitamos: productos sincronizados, insumos, y las recetas existentes
      const [resProd, resIns, resRecetas] = await Promise.all([
        supabase.from('productos').select('id, nombre, codigo_barras, precio_venta, descripcion, es_compuesto, costo, estado_activo')
          .eq('empresa_id', empresaId)
          .order('nombre'),
        insumosQuery,
        supabase.from('recetas').select('*').eq('empresa_id', empresaId)
      ]);
    productos = resProd.data || [];
    insumos = resIns.data || [];
    recetas = resRecetas.data || [];
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
          {profile?.rol === 'MASTER' && activeSedeId && (
            <SedeSelector sedes={sedes} activeSedeId={activeSedeId} />
          )}
        </div>
      </div>

              {/* Tabs / Navegación */}
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-px">
          <a 
            href={`?tab=insumos${activeSedeId ? `&sede=${activeSedeId}` : ''}`} 
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${currentTab === 'insumos' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'}`}
          >
            <FileBox size={16} /> Almacén (Insumos)
          </a>
          <a 
            href={`?tab=productos${activeSedeId ? `&sede=${activeSedeId}` : ''}`} 
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${currentTab === 'productos' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'}`}
          >
            <Package size={16} /> Productos de Venta
          </a>
          <a 
            href={`?tab=transformaciones${activeSedeId ? `&sede=${activeSedeId}` : ''}`} 
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${currentTab === 'transformaciones' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'}`}
          >
            <ArrowRightLeft size={16} /> Transformaciones
          </a>
        </div>

                  {/* Contenido Dinámico */}
      <div className="pt-2">
        {currentTab === 'insumos' && (
          <InsumosManager initialInsumos={insumos} empresaId={empresaId} sedeId={activeSedeId || ''} />
        )}
        
        {currentTab === 'productos' && (
          <ProductosEnriquecidos 
            productos={productos} 
            insumos={insumos} 
            recetas={recetas} 
            empresaId={empresaId} 
          />
        )}

        {currentTab === 'transformaciones' && (
          <TransformacionesManager 
            insumos={insumos}
            activeSedeId={activeSedeId || ''} 
          />
        )}
      </div>
      
    </div>
  );
}
