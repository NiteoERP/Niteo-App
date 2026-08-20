import React from 'react';
import { createClient } from '@/utils/supabase/server';
import InsumosManager from './InsumosManager';
import { Package, Beaker, FileBox } from 'lucide-react';

export default async function InventarioPage({ searchParams }: { searchParams: { tab?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const empresaId = user?.app_metadata?.empresa_id;

  if (!empresaId) return <div className="p-8 text-rose-400">Error: No tienes empresa configurada.</div>;

  const currentTab = searchParams.tab || 'insumos';

  let insumos = [];
  if (currentTab === 'insumos') {
    const { data } = await supabase
      .from('insumos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('creado_en', { ascending: false });
    insumos = data || [];
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
      </div>

      {/* Contenido Dinámico */}
      <div className="pt-2">
        {currentTab === 'insumos' && (
          <InsumosManager initialInsumos={insumos} empresaId={empresaId} />
        )}
        
        {currentTab === 'productos' && (
          <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl text-center">
            <Beaker size={48} className="mx-auto text-neutral-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Editor de Recetas</h3>
            <p className="text-neutral-400 max-w-md mx-auto">
              Aquí aparecerán los productos sincronizados desde Aronium. Podrás hacer clic en cualquiera de ellos para asignarle fotos, descripciones y vincular los insumos que lo componen.
            </p>
            <p className="text-xs text-indigo-400 mt-4 font-medium animate-pulse">
              (Próximo paso a desarrollar en esta Fase)
            </p>
          </div>
        )}
      </div>
      
    </div>
  );
}
