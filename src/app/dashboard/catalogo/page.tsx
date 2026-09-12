import React from 'react';
import { createClient } from '@/utils/supabase/server';
import CatalogoClient from './CatalogoClient';
import { getSedesCaja } from '@/actions/sedes-actions';

export const metadata = {
  title: 'Catálogo de Ventas | Niteo',
};

export const dynamic = 'force-dynamic';

export default async function CatalogoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('id', user?.id).single();

  const sedes = await getSedesCaja();

  const { data: productos } = await supabase
    .from('productos')
    .select('*')
    .eq('empresa_id', perfil?.empresa_id)
    .order('nombre');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/50 pb-4">
        <div>
          <h2 className="text-xl font-medium text-white">Catálogo de Ventas</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Administra los productos que aparecerán en Niteo POS. 
            Define si son Elaborados o de Reventa (Compra/Venta directa).
          </p>
        </div>
      </div>
      <CatalogoClient productos={productos || []} sedes={sedes || []} />
    </div>
  );
}
