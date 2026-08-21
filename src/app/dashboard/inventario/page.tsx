import React from 'react';
import { createClient } from '@/utils/supabase/server';
import InsumosManager from './InsumosManager';
import ProductosEnriquecidos from './ProductosEnriquecidos';
import DespachosManager from './DespachosManager';
import { Package, Beaker, FileBox, Truck } from 'lucide-react';

export default async function InventarioPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const empresaId = user?.app_metadata?.empresa_id;

  if (!empresaId) return <div className="p-8 text-rose-400">Error: No tienes empresa configurada.</div>;

  const currentTab = params.tab || 'insumos';

  let insumos: any[] = [];
  let productos: any[] = [];
  let recetas: any[] = [];

  if (currentTab === 'insumos') {
    const { data } = await supabase.from('insumos').select('*').eq('empresa_id', empresaId).order('creado_en', { ascending: false });
    insumos = data || [];
  } else if (currentTab === 'productos') {
    // Para el editor de recetas necesitamos: productos sincronizados, insumos, y las recetas existentes
    const [resProd, resIns, resRecetas] = await Promise.all([
      supabase.from('productos').select('id_producto, nombre, codigo_barras, precio_venta, descripcion, es_compuesto'), // Se asume que sede_id / empresa_id ya lo filtra RLS si aplica
      supabase.from('insumos').select('id, nombre, unidad_medida, costo_unitario').eq('empresa_id', empresaId),
      supabase.from('recetas').select('*').eq('empresa_id', empresaId)
    ]);
    productos = resProd.data || [];
    insumos = resIns.data || [];
    recetas = resRecetas.data || [];
  }

  return (
    <div className="space-y-6 max-w-6xl animate-in fade-in duration-300">
      
      <div className="border-b border-neutral-800 pb-5">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Package className="text-indigo-400" /> 
          Inventario y Recetas
        </h1>
        <p className="text-neutral-400 mt-1">Controla tu materia prima y diseña el escandallo de tus productos.</p>
      </div>

      {/* Tabs / Navegación */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-px">
        <a 
          href="?tab=insumos" 
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${currentTab === 'insumos' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'}`}
        >
          <FileBox size={16} /> Almacén (Insumos)
        </a>
        <a 
          href="?tab=productos" 
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${currentTab === 'productos' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'}`}
        >
          <Beaker size={16} /> Catálogo y Recetas
        </a>
        <a 
          href="?tab=despachos" 
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${currentTab === 'despachos' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'}`}
        >
          <Truck size={16} /> Despachos (Traslados)
        </a>
      </div>

      {/* Contenido Dinámico */}
      <div className="pt-2">
        {currentTab === 'insumos' && (
          <InsumosManager initialInsumos={insumos} empresaId={empresaId} />
        )}
        
        {currentTab === 'productos' && (
          <ProductosEnriquecidos 
            productos={productos} 
            insumos={insumos} 
            recetas={recetas} 
            empresaId={empresaId} 
          />
        )}

        {currentTab === 'despachos' && (
          <DespachosManager empresaId={empresaId} />
        )}
      </div>
      
    </div>
  );
}
