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

  // Ahora obtenemos todas las sedes a las que el usuario tiene acceso
  const { getSedesCaja } = await import('@/actions/sedes-actions');
  const [catalogoVirtual, sedes] = await Promise.all([
    getProductosCatalogoVirtual(perfil.empresa_id),
    getSedesCaja(),
  ]);

  const sedesActivas = sedes.filter(s => s.estado_activo);

  const { data: empresaData } = await supabase
    .from('empresas')
    .select('metodos_pago, nombre_comercial')
    .eq('id', perfil.empresa_id)
    .single();
  
  const metodosPago: string[] = empresaData?.metodos_pago ?? ['Efectivo USD', 'Transferencia', 'Zelle', 'Pago Móvil', 'Punto de Venta'];

  const { getEstadoLicencia } = await import('@/actions/licencia-actions');
  const licencia = await getEstadoLicencia();

  const { getTasaBcvAction } = await import('@/actions/config-actions');
  // Solo obtener tasa si no está vencido (Degradación suave)
  const rateData = (!licencia?.bloqueoFuerte) ? await getTasaBcvAction() : { tasa: 1 };
  const tasaActiva = rateData.tasa || 1;

  const TerminalWrapper = (await import('@/components/pos/TerminalWrapper')).default;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="text-indigo-500" size={24} />
            Nueva Venta
          </h1>
          <p className="text-neutral-400 text-xs md:text-sm mt-1">
            Registra ventas de mostrador rápidamente
          </p>
        </div>
      </div>

      <TerminalWrapper
        catalogo={catalogoVirtual}
        sedes={sedesActivas}
        metodosDisponibles={metodosPago}
        tasaActiva={tasaActiva}
        empresaNombre={empresaData?.nombre_comercial || 'Mi Empresa'}
        licencia={licencia}
      />
    </div>
  );
}
