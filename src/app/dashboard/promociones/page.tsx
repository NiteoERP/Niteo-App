import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getPromociones } from '@/actions/promociones-actions';
import PromocionesClient from './PromocionesClient';
import { Sparkles } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Promociones y Combos | Niteo',
  description: 'Configuración de promociones automáticas 2x1 y combos para el punto de venta.',
};

export const dynamic = 'force-dynamic';

export default async function PromocionesPage() {
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
    return (
      <div className="p-8 text-rose-400">
        Error: No tienes una empresa configurada.
      </div>
    );
  }

  // Carga paralela de promociones, categorías y productos elegibles
  const [promociones, { data: categorias }, { data: productos }] = await Promise.all([
    getPromociones(empresaId),
    supabase
      .from('categorias')
      .select('id, nombre')
      .eq('empresa_id', empresaId)
      .eq('estado_activo', true)
      .order('nombre'),
    supabase
      .from('productos')
      .select('id, nombre, precio_venta, categoria_id')
      .eq('empresa_id', empresaId)
      .eq('estado_activo', true)
      .order('nombre'),
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Encabezado Niteo Premium */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/60 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Sparkles size={22} />
            </span>
            Promociones y Combos
          </h1>
          <p className="text-xs md:text-sm text-neutral-400 mt-1">
            Diseña dinámicas como 2x1 en cócteles, combos armados o promociones por horario para Niteo POS.
          </p>
        </div>
      </div>

      <PromocionesClient
        promocionesIniciales={promociones}
        categorias={categorias || []}
        productos={productos || []}
      />
    </div>
  );
}
