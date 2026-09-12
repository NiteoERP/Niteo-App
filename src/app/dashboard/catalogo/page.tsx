import React from 'react';
import { createClient } from '@/utils/supabase/server';
import CatalogoClient from './CatalogoClient';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Catálogo de Ventas | Niteo',
};

export const dynamic = 'force-dynamic';

export default async function CatalogoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  const empresaId = user.app_metadata?.empresa_id || perfil?.empresa_id;

  if (!empresaId) {
    return <div className="p-8 text-rose-400">Error: No tienes empresa configurada.</div>;
  }

  // Obtener sedes directamente para la empresa
  const { data: sedes } = await supabase
    .from('sedes')
    .select('id, nombre_sede')
    .eq('empresa_id', empresaId)
    .order('nombre_sede');

  const { data: productos } = await supabase
    .from('productos')
    .select('*')
    .eq('empresa_id', empresaId)
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
