import { createClient } from '@/utils/supabase/server';
import TerminalesPOSClient from './TerminalesPOSClient';

export default async function TerminalesPOS() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let empresaId = user.app_metadata?.empresa_id;

  if (!empresaId) {
    const { data: dbProfile } = await supabase
      .from('perfiles')
      .select('empresa_id')
      .eq('id', user.id)
      .single();
    empresaId = dbProfile?.empresa_id;
  }

  if (!empresaId) return null;

  const { data: sedes } = await supabase
    .from('sedes')
    .select('id, nombre_sede, estado_activo, codigo_terminal')
    .eq('empresa_id', empresaId)
    .eq('estado_activo', true)
    .order('nombre_sede');

  if (!sedes || sedes.length === 0) return null;

  return <TerminalesPOSClient sedes={sedes} />;
}
