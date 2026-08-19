import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getVentasRecientes, getProductosCatalogo, VentaPOS, ProductoPOS } from '@/actions/pos-actions';
import LiveSalesFeed from '@/components/pos/LiveSalesFeed';
import CuentasAbiertasWidget from '@/components/pos/CuentasAbiertasWidget';
import CatalogView from '@/components/pos/CatalogView';
import { Store, PackageSearch, Users } from 'lucide-react';

export const metadata = {
  title: 'Espejo POS | Niteo',
  description: 'Monitor de ventas en tiempo real',
};

export default async function POSPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const params = await searchParams;
  const tab = params.tab || 'ventas';
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Get user profile to know their sede and empresa
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id, sede_id')
    .eq('id', user.id)
    .single();

  if (!perfil) {
    return <div>Error: Perfil no encontrado</div>;
  }

  // Fetch initial data based on tab
  let initialSales: VentaPOS[] = [];
  let catalog: ProductoPOS[] = [];

  if (tab === 'ventas') {
    initialSales = await getVentasRecientes(perfil.sede_id);
  } else if (tab === 'catalogo') {
    catalog = await getProductosCatalogo(perfil.empresa_id);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Store className="text-indigo-500" />
            Espejo POS
          </h1>
          <p className="text-neutral-400 mt-1">
            Monitoreo en tiempo real de tu caja local Aronium
          </p>
        </div>

        {/* Tabs Navigation */}
        <div className="flex bg-neutral-900 border border-neutral-800 rounded-lg p-1">
          <a
            href="?tab=ventas"
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === 'ventas'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Store size={16} />
            Ventas en Vivo
          </a>
          <a
            href="?tab=cuentas"
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === 'cuentas'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Users size={16} />
            Cuentas Abiertas
          </a>
          <a
            href="?tab=catalogo"
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === 'catalogo'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <PackageSearch size={16} />
            Catálogo
          </a>
        </div>
      </div>

      {/* Tab Content */}
      {tab === 'ventas' && (
        <LiveSalesFeed initialSales={initialSales} sedeId={perfil.sede_id} />
      )}
      {tab === 'cuentas' && (
        <CuentasAbiertasWidget sedeId={perfil.sede_id} />
      )}
      {tab === 'catalogo' && (
        <CatalogView catalog={catalog} />
      )}
    </div>
  );
}
