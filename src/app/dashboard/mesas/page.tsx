import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import MesasHub from '@/components/mesas/MesasHub';

export default async function MesasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('permisos, nombre_completo, rol')
    .eq('id', user.id)
    .single();

  const permisos: string[] = perfil?.permisos || [];
  const rol = perfil?.rol || user.app_metadata?.user_role || 'CAJERO';

  const tieneAcceso = permisos.includes('mesas') || rol === 'MASTER' || rol === 'SUPERADMIN';
  if (!tieneAcceso) redirect('/dashboard');

  const meseroNombre = perfil?.nombre_completo ||
    (user.user_metadata?.nombre_completo as string | undefined) ||
    user.email ||
    'Mesero';

  const empresaId = user.app_metadata?.empresa_id as string | undefined;
  let metodosPago: string[] = ['Efectivo USD', 'Efectivo Bs', 'Pago Móvil', 'Punto de Venta', 'Zelle'];
  if (empresaId) {
    const { data: emp } = await supabase
      .from('empresas')
      .select('metodos_pago')
      .eq('id', empresaId)
      .single();
    if (emp?.metodos_pago?.length) metodosPago = emp.metodos_pago;
  }

  return (
    <MesasHub
      meseroNombre={meseroNombre}
      meseroId={user.id}
      metodosPago={metodosPago}
    />
  );
}
