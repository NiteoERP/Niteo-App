import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getProductosCatalogoVirtual, ProductoPOS } from '@/actions/pos-actions';
import { getSedeVirtualId } from '@/actions/sedes-actions';
import TerminalVirtual from '@/components/pos/TerminalVirtual';
import { Store, ShoppingCart } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Punto de Venta | Niteo',
  description: 'Terminal de venta virtual de Niteo.',
};

export default async function TerminalPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!perfil) {
    return <div>Error: Perfil no encontrado</div>;
  }

  const [catalogoVirtual, sedeVirtualId] = await Promise.all([
    getProductosCatalogoVirtual(perfil.empresa_id),
    getSedeVirtualId(),
  ]);

  const { data: empresaData } = await supabase
    .from('empresas')
    .select('metodos_pago, nombre_comercial')
    .eq('id', perfil.empresa_id)
    .single();
  
  const metodosPago: string[] = empresaData?.metodos_pago ?? ['Efectivo USD', 'Transferencia', 'Zelle', 'Pago Móvil', 'Punto de Venta'];

  const { getTasaBcvAction } = await import('@/actions/config-actions');
  const rateData = await getTasaBcvAction();
  const tasaActiva = rateData.tasa || 1;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="text-indigo-500" size={24} />
            Punto de Venta
          </h1>
          <p className="text-neutral-400 text-xs md:text-sm mt-1">
            Terminal de venta nativa — registra ventas directamente desde Niteo
          </p>
        </div>
      </div>

      {sedeVirtualId ? (
        <TerminalVirtual
          catalogo={catalogoVirtual}
          sedeVirtualId={sedeVirtualId}
          metodosDisponibles={metodosPago}
          tasaActiva={tasaActiva}
          empresaNombre={empresaData?.nombre_comercial || 'Mi Empresa'}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <ShoppingCart size={28} className="text-indigo-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Sin Sede Virtual Configurada</h3>
            <p className="text-neutral-400 text-sm mt-1 max-w-md">
              Para usar el Terminal Virtual debes crear una sede de tipo{' '}
              <span className="text-indigo-400 font-semibold">VIRTUAL</span> en
              Configuración → Sedes.
            </p>
          </div>
          <a
            href="/dashboard/configuracion/sedes"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <Store size={16} />
            Ir a Configuración de Sedes
          </a>
        </div>
      )}
    </div>
  );
}
